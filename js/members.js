/**
 * Brighton CTO – Members directory
 *
 * Reads from /data/members.json. Members can add themselves by submitting
 * a pull request to the GitHub repository — see CONTRIBUTING.md.
 */

let allMembers = [];

function initMembersPage() {
  fetch('data/members.json?v=' + Date.now())
    .then(res => {
      if (!res.ok) throw new Error('members.json not found');
      return res.json();
    })
    .then(data => {
      allMembers = Array.isArray(data) ? data : [];
      filterMembers();
    })
    .catch(() => {
      document.getElementById('members-grid').innerHTML = `
        <div class="state-box" style="grid-column:1/-1">
          <div class="icon">😕</div>
          <h3>Couldn't load members</h3>
          <p>There was a problem loading the member directory. Please try again shortly.</p>
        </div>`;
      document.getElementById('member-count').textContent = '';
    });
}

function filterMembers() {
  const query  = (document.getElementById('member-search')?.value || '').toLowerCase().trim();
  const sortBy = document.getElementById('member-sort')?.value || 'name';

  let results = allMembers.filter(m => {
    if (!query) return true;
    return (
      (m.name    || '').toLowerCase().includes(query) ||
      (m.company || '').toLowerCase().includes(query) ||
      (m.role    || '').toLowerCase().includes(query) ||
      (m.bio     || '').toLowerCase().includes(query) ||
      (m.tags    || []).some(t => t.toLowerCase().includes(query))
    );
  });

  // Sort
  results = [...results].sort((a, b) => {
    if (sortBy === 'name')    return (a.name    || '').localeCompare(b.name    || '');
    if (sortBy === 'company') return (a.company || '').localeCompare(b.company || '');
    if (sortBy === 'joined')  return (b.joined  || '').localeCompare(a.joined  || '');
    return 0;
  });

  const countEl = document.getElementById('member-count');
  if (countEl) {
    countEl.textContent = results.length === allMembers.length
      ? `${allMembers.length} member${allMembers.length !== 1 ? 's' : ''}`
      : `Showing ${results.length} of ${allMembers.length} members`;
  }

  const grid = document.getElementById('members-grid');
  if (!grid) return;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="state-box" style="grid-column:1/-1">
        <div class="icon">🔍</div>
        <h3>No members found</h3>
        <p>Try a different search term.</p>
      </div>`;
    return;
  }

  grid.innerHTML = results.map(renderMemberCard).join('');
}

function renderMemberCard(member) {
  const initials = getInitials(member.name);
  const avatarHtml = member.avatar
    ? `<img src="${escapeAttr(member.avatar)}" alt="${escapeAttr(member.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />`
    : initials;

  const tags = (member.tags || []).slice(0, 4).map(t =>
    `<span class="tag">${escapeHtml(t)}</span>`
  ).join('');

  const links = [];
  if (member.linkedin) links.push(`
    <a href="${escapeAttr(member.linkedin)}" target="_blank" rel="noopener" title="LinkedIn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
      LinkedIn
    </a>`);
  if (member.github) links.push(`
    <a href="${escapeAttr(member.github)}" target="_blank" rel="noopener" title="GitHub">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
      GitHub
    </a>`);
  if (member.website) links.push(`
    <a href="${escapeAttr(member.website)}" target="_blank" rel="noopener" title="Website">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Website
    </a>`);

  return `
    <article class="member-card">
      <div class="member-card__header">
        <div class="member-avatar">${avatarHtml}</div>
        <div>
          <div class="member-card__name">${escapeHtml(member.name || '')}</div>
          <div class="member-card__title">${escapeHtml(member.role || '')}</div>
        </div>
      </div>
      ${member.company ? `<div class="member-card__company">${escapeHtml(member.company)}</div>` : ''}
      ${member.bio ? `<div class="member-card__bio">${escapeHtml(member.bio)}</div>` : ''}
      ${tags ? `<div class="member-card__tags">${tags}</div>` : ''}
      ${links.length ? `<div class="member-card__footer">${links.join('')}</div>` : ''}
    </article>`;
}

/* ---- Helpers ---- */

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase() || '?';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
