/* ============================================
   NextGen Travel — Night / Day Theme Toggle
   Purple brand design (simple UI toggle on a
   purple gradient). Applies data-theme="dark" |
   "light" on <html>, persists the choice in
   localStorage, and injects a sliding switch
   into the navbar of every page that has one.
   ============================================ */

(function () {
  var KEY = 'nextgen_theme';

  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function current() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      var isDark = theme === 'dark';
      var label = isDark ? 'Switch to day mode' : 'Switch to night mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-checked', String(!isDark));
      btn.title = label;
      var thumb = btn.querySelector('.theme-toggle-thumb');
      if (thumb) thumb.innerHTML = isDark ? SUN : MOON;
    }
  }

  // Set theme before first paint to avoid a flash of the wrong mode
  var saved = 'dark';
  try { saved = localStorage.getItem(KEY) || 'dark'; } catch (e) {}
  apply(saved);

  function buildButton() {
    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.className = 'theme-toggle-btn';
    btn.setAttribute('role', 'switch');

    var track = document.createElement('span');
    track.className = 'theme-toggle-track';
    track.innerHTML = SUN + MOON;

    var thumb = document.createElement('span');
    thumb.className = 'theme-toggle-thumb';
    thumb.innerHTML = current() === 'dark' ? SUN : MOON;

    btn.appendChild(track);
    btn.appendChild(thumb);

    btn.addEventListener('click', function () {
      apply(current() === 'dark' ? 'light' : 'dark');
    });
    return btn;
  }

  function inject() {
    if (document.getElementById('theme-toggle')) return;
    var target = document.querySelector('.navbar .navbar-collapse .ms-auto') ||
                 document.querySelector('.navbar .navbar-collapse') ||
                 document.querySelector('.navbar');
    if (!target) {
      var btn = buildButton();
      btn.classList.add('theme-toggle-float');
      document.body.appendChild(btn);
      return;
    }
    target.insertBefore(buildButton(), target.firstElementChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
