/**
 * generate-ics.js
 *
 * Reads data/events.json and writes data/events.ics — a standards-compliant
 * iCalendar feed that users can subscribe to from Google Calendar, Apple
 * Calendar, Outlook, etc.
 *
 * Run after fetch-events.js in the GitHub Actions workflow.
 */

const fs   = require('fs');
const path = require('path');

const IN  = path.join(__dirname, '..', 'data', 'events.json');
const OUT = path.join(__dirname, '..', 'data', 'events.ics');

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours if Meetup didn't supply one

function escapeText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// RFC 5545 requires lines folded at 75 octets. Fold on bytes, not chars.
function foldLine(line) {
  const buf = Buffer.from(line, 'utf8');
  if (buf.length <= 75) return line;
  const out = [];
  let i = 0;
  // First line: 75 bytes. Subsequent lines: start with a space, 74 bytes of content.
  out.push(buf.slice(i, i + 75).toString('utf8'));
  i += 75;
  while (i < buf.length) {
    out.push(' ' + buf.slice(i, i + 74).toString('utf8'));
    i += 74;
  }
  return out.join('\r\n');
}

function formatUtc(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function buildEvent(ev, dtstamp) {
  const start = new Date(ev.date);
  if (isNaN(start.getTime())) return null;

  const durationMs = typeof ev.duration === 'number' && ev.duration > 0
    ? ev.duration
    : DEFAULT_DURATION_MS;
  const end = new Date(start.getTime() + durationMs);

  const location = ev.venue
    ? [ev.venue.name, ev.venue.address].filter(Boolean).join(', ')
    : ev.location || '';

  const lines = [
    'BEGIN:VEVENT',
    `UID:${ev.id || start.getTime()}@brightoncto.com`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(ev.name)}`,
    `DESCRIPTION:${escapeText(ev.description)}`,
    `LOCATION:${escapeText(location)}`,
    `URL:${escapeText(ev.link)}`,
    'END:VEVENT',
  ];
  return lines.map(foldLine).join('\r\n');
}

(function main() {
  const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
  const all = [...(data.upcoming || []), ...(data.past || [])];

  const dtstamp = formatUtc(new Date());

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BrightonCTO//Events Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BrightonCTO Events',
    'X-WR-CALDESC:Meetups and events for the BrightonCTO community',
  ];

  const body = all
    .map(ev => buildEvent(ev, dtstamp))
    .filter(Boolean);

  const footer = ['END:VCALENDAR'];

  const ics = [...header, ...body, ...footer].join('\r\n') + '\r\n';
  fs.writeFileSync(OUT, ics);

  console.log(`✅ events.ics written — ${body.length} events`);
})();
