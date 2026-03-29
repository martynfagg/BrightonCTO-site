/**
 * fetch-events.js
 *
 * Scrapes upcoming and past events from the Meetup.com website and writes
 * them to data/events.json.
 *
 * Run via GitHub Actions (see .github/workflows/fetch-events.yml).
 *
 * Meetup embeds event data as an Apollo GraphQL cache object in each page's
 * HTML — this script extracts and parses that embedded JSON rather than
 * calling the (now-authenticated-only) REST/GraphQL API.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const GROUP = process.env.MEETUP_GROUP || 'brighton-cto';
const OUT   = path.join(__dirname, '..', 'data', 'events.json');

// ------------------------------------------------------------------ //
//  HTTP helper — returns raw HTML string
// ------------------------------------------------------------------ //

function httpsGetHtml(url, redirectDepth = 0) {
  if (redirectDepth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = https.get({
      hostname: opts.hostname,
      path:     opts.pathname + opts.search,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://${opts.hostname}${res.headers.location}`;
        res.resume();
        return httpsGetHtml(next, redirectDepth + 1).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}\nBody: ${body.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
}

// ------------------------------------------------------------------ //
//  Extract Apollo state from page HTML
// ------------------------------------------------------------------ //

function extractApolloState(html) {
  // Strategy 1: window.__APOLLO_STATE__ = {...};
  let match = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (match) {
    try { return JSON.parse(match[1]); } catch (_) {}
  }

  // Strategy 2: __NEXT_DATA__ script tag (Next.js pages)
  // Apollo state is stored under props.pageProps.__APOLLO_STATE__
  match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    try {
      const nextData = JSON.parse(match[1]);
      return nextData?.props?.pageProps?.['__APOLLO_STATE__']
        || nextData?.props?.['__APOLLO_STATE__']
        || null;
    } catch (_) {}
  }

  return null;
}

// ------------------------------------------------------------------ //
//  Dereference Apollo cache refs
// ------------------------------------------------------------------ //

function deref(value, cache) {
  if (!value || typeof value !== 'object') return value;
  if (value.__ref) return cache[value.__ref] || null;
  return value;
}

// ------------------------------------------------------------------ //
//  Normalise a raw Apollo Event object into our schema
// ------------------------------------------------------------------ //

function normaliseEvent(raw, cache, status) {
  const venue = deref(raw.venue, cache) || {};
  const going = deref(raw.going, cache) || {};

  // title field name varies between Apollo cache shapes
  const name = raw.name || raw.title || '';

  // Build a clean description: strip HTML tags and trim whitespace
  const rawDesc = raw.description || raw.shortDescription || '';
  const description = rawDesc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    id:          raw.id || '',
    name,
    date:        raw.dateTime || raw.local_date || '',
    duration:    raw.duration || null,
    status,
    description,
    link:        raw.eventUrl || `https://www.meetup.com/${GROUP}/events/${raw.id}/`,
    rsvp_count:  going.totalCount ?? null,
    venue: venue.name
      ? {
          name:    venue.name,
          address: venue.address || [venue.address_1, venue.city].filter(Boolean).join(', '),
        }
      : null,
    location: venue.name || '',
  };
}

// ------------------------------------------------------------------ //
//  Pull events out of an Apollo cache object
// ------------------------------------------------------------------ //

function extractEvents(state) {
  if (!state) return { upcoming: [], past: [] };

  const upcoming = [];
  const past     = [];

  for (const [key, value] of Object.entries(state)) {
    if (!key.startsWith('Event:') || !value || typeof value !== 'object') continue;

    // Skip __typename-only stubs
    if (!value.id && !value.eventUrl) continue;

    const rawStatus = (value.status || '').toUpperCase();
    if (rawStatus === 'PAST') {
      past.push(normaliseEvent(value, state, 'past'));
    } else {
      // ACTIVE, UPCOMING, or unset → treat as upcoming
      upcoming.push(normaliseEvent(value, state, 'upcoming'));
    }
  }

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  past.sort((a, b)     => new Date(b.date) - new Date(a.date));

  return { upcoming, past };
}

// ------------------------------------------------------------------ //
//  Main
// ------------------------------------------------------------------ //

(async () => {
  console.log(`Scraping Meetup.com for group: ${GROUP}`);

  // Fetch upcoming and past pages in parallel
  const [upcomingHtml, pastHtml] = await Promise.all([
    httpsGetHtml(`https://www.meetup.com/${GROUP}/events/`),
    httpsGetHtml(`https://www.meetup.com/${GROUP}/events/?type=past`),
  ]);

  const upcomingState = extractApolloState(upcomingHtml);
  const pastState     = extractApolloState(pastHtml);

  if (!upcomingState) console.warn('⚠️  Could not extract Apollo state from upcoming page');
  if (!pastState)     console.warn('⚠️  Could not extract Apollo state from past page');

  const { upcoming }       = extractEvents(upcomingState);
  const { past: pastList } = extractEvents(pastState);

  const output = {
    _comment: 'This file is automatically updated by the GitHub Actions workflow (.github/workflows/fetch-events.yml). Do not edit manually.',
    _updated: new Date().toISOString(),
    upcoming,
    past: pastList,
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));

  console.log(`✅ events.json updated — ${upcoming.length} upcoming, ${pastList.length} past`);
})().catch(err => {
  console.error('❌ fetch-events failed:', err.message);
  // Don't overwrite with empty data on failure — leave existing file intact
  process.exit(1);
});
