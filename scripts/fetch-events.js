/**
 * fetch-events.js
 *
 * Fetches upcoming and past events from the Meetup.com API and writes
 * them to data/events.json.
 *
 * Run via GitHub Actions (see .github/workflows/fetch-events.yml).
 *
 * Meetup API docs: https://www.meetup.com/api/guide/
 *
 * Authentication:
 *   - If you have a Meetup API key, set it as the MEETUP_API_KEY secret
 *     in your GitHub repository settings.
 *   - For public groups the REST v3 API often works without authentication
 *     when called server-side (from GitHub Actions), but Meetup may require
 *     OAuth for some endpoints. The script handles both cases gracefully.
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

const GROUP   = process.env.MEETUP_GROUP || 'Brighton-CTO-Meetup';
const API_KEY = process.env.MEETUP_API_KEY || '';
const OUT     = path.join(__dirname, '..', 'data', 'events.json');

// ------------------------------------------------------------------ //
//  Helpers
// ------------------------------------------------------------------ //

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const reqHeaders = {
      'User-Agent': 'BrightonCTO-StaticSite/1.0 (https://brightoncto.com)',
      ...headers,
    };
    if (API_KEY) reqHeaders['Authorization'] = `Bearer ${API_KEY}`;

    const req = https.get({ hostname: opts.hostname, path: opts.pathname + opts.search, headers: reqHeaders }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(`JSON parse error: ${e.message}\nBody: ${body.slice(0, 200)}`)); }
        } else {
          reject(new Error(`HTTP ${res.statusCode} for ${url}\nBody: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function normaliseEvent(ev, status) {
  // Handle both REST v3 shape and GraphQL shape
  const venue = ev.venue || {};
  return {
    id:          ev.id || ev.eventUrl || '',
    name:        ev.name || '',
    date:        ev.time
                   ? new Date(ev.time).toISOString()          // REST v3: Unix ms
                   : (ev.dateTime || ev.local_date || ''),    // GraphQL / fallback
    duration:    ev.duration || null,
    status:      status,
    description: ev.description || ev.shortDescription || '',
    link:        ev.link || ev.eventUrl || `https://www.meetup.com/${GROUP}/events/${ev.id}/`,
    rsvp_count:  ev.yes_rsvp_count ?? ev.going?.totalCount ?? null,
    venue: venue.name
      ? {
          name:    venue.name,
          address: [venue.address_1, venue.city].filter(Boolean).join(', '),
          lat:     venue.lat,
          lon:     venue.lon,
        }
      : null,
    location: ev.venue?.name || '',
  };
}

// ------------------------------------------------------------------ //
//  Fetch via Meetup REST API v3 (no auth needed for public groups)
// ------------------------------------------------------------------ //

async function fetchViaRestAPI() {
  const base = `https://api.meetup.com/${GROUP}/events`;

  const [upcomingRaw, pastRaw] = await Promise.all([
    httpsGet(`${base}?photo-host=public&page=20&status=upcoming`),
    httpsGet(`${base}?photo-host=public&page=20&status=past&desc=true`),
  ]);

  const upcoming = (Array.isArray(upcomingRaw) ? upcomingRaw : []).map(e => normaliseEvent(e, 'upcoming'));
  const past     = (Array.isArray(pastRaw)     ? pastRaw     : []).map(e => normaliseEvent(e, 'past'));

  return { upcoming, past };
}

// ------------------------------------------------------------------ //
//  Fetch via Meetup GraphQL API (requires OAuth token in API_KEY)
// ------------------------------------------------------------------ //

async function fetchViaGraphQL() {
  const query = `
    query($urlname: String!) {
      groupByUrlname(urlname: $urlname) {
        upcomingEvents(input: { first: 20 }) {
          edges { node {
            id title dateTime shortDescription eventUrl
            going { totalCount }
            venue { name address }
          }}
        }
        pastEvents(input: { first: 20, reverse: true }) {
          edges { node {
            id title dateTime shortDescription eventUrl
            going { totalCount }
            venue { name address }
          }}
        }
      }
    }`;

  const body = JSON.stringify({ query, variables: { urlname: GROUP } });

  const data = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.meetup.com',
      path:     '/gql',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent':     'BrightonCTO-StaticSite/1.0',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`GraphQL parse error: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const group = data?.data?.groupByUrlname;
  if (!group) throw new Error('GraphQL: no group data returned');

  const upcoming = (group.upcomingEvents?.edges || [])
    .map(e => normaliseEvent({ ...e.node, name: e.node.title }, 'upcoming'));
  const past = (group.pastEvents?.edges || [])
    .map(e => normaliseEvent({ ...e.node, name: e.node.title }, 'past'));

  return { upcoming, past };
}

// ------------------------------------------------------------------ //
//  Main
// ------------------------------------------------------------------ //

(async () => {
  let result;

  // Try GraphQL first if we have an API key; otherwise use REST
  if (API_KEY) {
    console.log('Using Meetup GraphQL API (authenticated)…');
    try {
      result = await fetchViaGraphQL();
    } catch (err) {
      console.warn('GraphQL failed, falling back to REST API:', err.message);
      result = await fetchViaRestAPI();
    }
  } else {
    console.log('No MEETUP_API_KEY set – using public REST API…');
    result = await fetchViaRestAPI();
  }

  const output = {
    _updated: new Date().toISOString(),
    upcoming: result.upcoming,
    past:     result.past,
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2));

  console.log(`✅ events.json updated — ${result.upcoming.length} upcoming, ${result.past.length} past`);
})().catch(err => {
  console.error('❌ fetch-events failed:', err.message);
  // Don't overwrite with empty data on failure — leave existing file intact
  process.exit(1);
});
