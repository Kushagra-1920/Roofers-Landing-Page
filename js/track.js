/* Summit Ridge Roofing: tracking layer. No third-party scripts, nothing is sent anywhere by itself.
   Every event is pushed to window.dataLayer. Add ?debug=1 to the URL to also see events in the console. */
(() => {
  'use strict';

  const debug = /[?&]debug=1(&|$)/.test(location.search);
  window.dataLayer = window.dataLayer || [];

  /* Campaign parameters are kept for the session and added to lead payloads. */
  const KEY = 'sr_attribution';
  const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const found = {};
  const query = new URLSearchParams(location.search);
  PARAMS.forEach((k) => { if (query.get(k)) found[k] = query.get(k).slice(0, 200); });
  if (Object.keys(found).length) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ ...read(), ...found })); } catch { /* storage blocked */ }
  }

  function track(name, data = {}) {
    window.dataLayer.push({ event: name, ...data });
    if (debug) console.log('[track]', name, data);
  }
  track.attribution = read;
  window.track = track;

  /* Where on the page was the click? */
  const where = (el) => el.closest('[data-loc]')?.dataset.loc
    || (el.closest('.call-bar') && 'call-bar')
    || (el.closest('header') && 'header')
    || (el.closest('footer') && 'footer')
    || el.closest('section[id]')?.id
    || 'page';

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a, button');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('call_click', { location: where(a) });
    else if (href.startsWith('sms:') || a.hasAttribute('data-copy')) track('text_click', { location: where(a) });
    else if (a.hasAttribute('data-directions')) track('directions_click', { location: where(a) });
    else if (href === '#report' || href === '#book') track('cta_click', { location: where(a), target: href.slice(1) });
  });

  /* Scroll depth: 25, 50, 75 and 100 percent, once each. */
  const marks = [25, 50, 75, 100];
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const pct = ((scrollY + innerHeight) / document.documentElement.scrollHeight) * 100;
      while (marks.length && pct >= marks[0] - (marks[0] === 100 ? 0.5 : 0)) track('scroll_depth', { percent: marks.shift() });
    });
  }, { passive: true });

  /* FAQ questions opened. Video starts and 75 percent. */
  document.addEventListener('toggle', (e) => {
    if (e.target.matches('.faq-list details') && e.target.open) track('faq_open', { question: e.target.querySelector('summary').textContent.trim() });
  }, true);
  const seen = new WeakSet();
  document.addEventListener('play', (e) => { if (e.target.matches('video')) track('video_play', { src: e.target.currentSrc }); }, true);
  document.addEventListener('timeupdate', (e) => {
    const v = e.target;
    if (!v.matches || !v.matches('video') || seen.has(v) || !v.duration || v.currentTime / v.duration < 0.75) return;
    seen.add(v);
    track('video_75pct', { src: v.currentSrc });
  }, true);
})();
