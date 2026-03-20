/**
 * Mobile navigation toggle
 */
function toggleMobileNav() {
  const nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
}

// Close mobile nav when a link is clicked
document.addEventListener('DOMContentLoaded', () => {
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => mobileNav.classList.remove('open'));
    });
  }
});
