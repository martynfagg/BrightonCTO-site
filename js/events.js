/**
 * Brighton CTO – Events loader
 *
 * Events are fetched from /data/events.json, which is automatically updated
 * by the GitHub Actions workflow (.github/workflows/fetch-events.yml).
 *
 * The workflow runs daily and fetches from the Meetup.com API, writing
 * both upcoming and past events to data/events.json.
 *
 * If the file is empty or stale, a friendly fallback is shown with a
 * direct link to the Meetup.com group page.
 */

/**
 * Load events into a container element.
 *
 * @param {string} containerId  - The ID of the DOM element to render into.
 * @param {object} opts
 * @param {number} [opts.limit]          - Max number of events to show (default: all)
 * @param {'upcoming'|'past'} [opts.status] - Filter by status (default: 'upcoming')
 * @param {boolean} [opts.compact]       - Not used currently, reserved for future use
 */
function loadEventsIntoContainer(containerId, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { limit, status = 'upcoming' } = opts;

  fetch('data/events.json?v=' + Date.now())
    .then(res => {
      if (!res.ok) throw new Error('events.json not found');
      return res.json();
    })
    .then(data => {
      // data may be an array or { upcoming: [], past: [] }
      let events = [];
      if (Array.isArray(data)) {
        events = data;
      } else if (data && typeof data === 'object') {
        events = status === 'past'
          ? (data.past || [])
          : (data.upcoming || []);
      }

      if (limit) events = events.slice(0, limit);

      if (events.length === 0) {
        container.innerHTML = renderEmpty(status);
        return;
      }

      container.innerHTML = `<div class="events-grid">${events.map(renderEventCard).join('')}</div>`;
    })
    .catch(() => {
      container.innerHTML = renderEmpty(status);
    });
}

/**
 * Render a single event card.
 * @param {object} event
 */
function renderEventCard(event) {
  const date = event.date ? new Date(event.date) : null;
  const month = date ? date.toLocaleString('en-GB', { month: 'short' }).toUpperCase() : '—';
  const day   = date ? date.getDate() : '—';
  const weekday = date ? date.toLocaleString('en-GB', { weekday: 'long' }) : '';
  const time  = date ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  const location = event.venue
    ? (event.venue.name || event.venue)
    : (event.location || '');

  const desc = event.description
    ? stripHtml(event.description).slice(0, 200)
    : '';

  const rsvpCount = event.rsvp_count != null ? `${event.rsvp_count} going` : '';

  return `
    <article class="event-card">
      <div class="event-card__date-bar">
        <div class="event-card__date-box">
          <span class="month">${month}</span>
          <span class="day">${day}</span>
        </div>
        <div class="event-card__date-info">
          <div style="font-weight:600;font-size:.95rem;">${weekday}</div>
          <div class="time">${time ? 'From ' + time : ''}</div>
        </div>
      </div>
      <div class="event-card__body">
        <h3>${escapeHtml(event.name || 'Brighton CTO Meetup')}</h3>
        ${location ? `
          <div class="event-card__location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(location)}
          </div>` : ''}
        ${desc ? `<p class="event-card__desc">${escapeHtml(desc)}${event.description && event.description.length > 200 ? '…' : ''}</p>` : ''}
      </div>
      <div class="event-card__footer">
        ${rsvpCount ? `<span class="event-card__rsvp">👥 ${rsvpCount}</span>` : '<span></span>'}
        ${event.link ? `
          <a href="${escapeHtml(event.link)}" target="_blank" rel="noopener" class="btn btn--primary btn--sm">
            ${event.status === 'past' ? 'View event' : 'RSVP'}
          </a>` : ''}
      </div>
    </article>
  `;
}

/**
 * Render an empty / fallback state.
 */
function renderEmpty(status) {
  if (status === 'past') {
    return `
      <div class="state-box">
        <div class="icon">📂</div>
        <h3>No past events found</h3>
        <p>Past events will appear here once the events data has been populated.</p>
        <a href="https://www.meetup.com/Brighton-CTO-Meetup/events/past/" target="_blank" rel="noopener" class="btn btn--outline mt-2">
          View on Meetup.com
        </a>
      </div>`;
  }
  return `
    <div class="state-box">
      <div class="icon">📅</div>
      <h3>No upcoming events right now</h3>
      <p>We're planning our next meetup. Join the group on Meetup.com to be notified as soon as we announce it.</p>
      <a href="https://www.meetup.com/Brighton-CTO-Meetup/" target="_blank" rel="noopener" class="btn btn--primary mt-2">
        Join us on Meetup.com
      </a>
    </div>`;
}

/* ---- Helpers ---- */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}
