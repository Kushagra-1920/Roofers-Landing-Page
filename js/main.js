/* Summit Ridge Roofing: core UI. Vanilla JS, no dependencies.
   Load order: track.js, main.js, booking.js, form.js, extras.js */
(() => {
  'use strict';

  /* ================= CONFIG: everything a client may need to change ================= */
  const cfg = {
    // EDIT: the ONE place for the phone number. Every tel link and visible number on the page reads from here.
    // For call tracking, put the tracking number here (see README, "How tracking works").
    phone: { display: '(214) 555-0142', e164: '+12145550142' },
    // EDIT: number for text messages (often the same as the phone number) and the pre-filled message.
    sms: { display: '(214) 555-0142', e164: '+12145550142', body: 'Hi, I’d like a roof inspection. My ZIP is ' },
    timezone: 'America/Chicago',
    // EDIT: office address (used by "Get directions").
    address: '4120 Preston Ridge Dr, Suite 200, Dallas, TX 75254',
    // EDIT: office hours. Day 0 is Sunday. [open hour, close hour] on a 24-hour clock, or null when closed.
    hours: { 0: null, 1: [7, 19], 2: [7, 19], 3: [7, 19], 4: [7, 19], 5: [7, 19], 6: [7, 19] },
    // EDIT: inspection availability. All booking rules live here, and the calendar shows nothing else.
    // Connect a real scheduling system by filling `booked` (dates "YYYY-MM-DD" mapped to taken window numbers).
    booking: {
      businessDays: 10,                 // how many bookable days to show
      leadMinutes: 60,                  // a window closes this long before it starts
      windows: [                        // arrival windows (start and end on a 24-hour clock)
        { label: '8–10', start: 8, end: 10, unit: 'am' },
        { label: '10–12', start: 10, end: 12, unit: 'am' },
        { label: '12–2', start: 12, end: 14, unit: 'pm' },
        { label: '2–4', start: 14, end: 16, unit: 'pm' },
      ],
      open: { 0: [], 1: [0, 1, 2, 3], 2: [0, 1, 2, 3], 3: [0, 1, 2, 3], 4: [0, 1, 2, 3], 5: [0, 1, 2, 3], 6: [0, 1] }, // Sunday closed, Saturday mornings only
      blocked: ['2026-12-24', '2026-12-25', '2027-01-01'],   // holidays and days off
      booked: {},                                            // e.g. { '2026-12-04': [1] }
    },
    // EDIT: crew or owner video (30 to 45 seconds). If this file is missing the whole block hides itself.
    video: { src: 'videos/intro.mp4' },
    // EDIT: project manager photo, 4:5. Leave empty to show the monogram. Example: 'images/team/luis.jpg'
    pm: { photo: '' },
  };

  /* ================= Helpers shared by the other scripts ================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const track = (name, data) => { if (window.track) window.track(name, data); };

  const tzFmt = new Intl.DateTimeFormat('en-US', { timeZone: cfg.timezone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const now = (at = Date.now()) => {
    const p = {};
    tzFmt.formatToParts(at).forEach((x) => { if (x.type !== 'literal') p[x.type] = +x.value; });
    p.dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
    return p;
  };
  const localAsUtc = (n) => Date.UTC(n.year, n.month - 1, n.day, n.hour, n.minute);
  const zonedToUtc = (y, m, d, h) => {
    const guess = Date.UTC(y, m - 1, d, h);
    let t = guess - (localAsUtc(now(guess)) - guess);
    t = guess - (localAsUtc(now(t)) - t); // second pass settles daylight saving edges
    return t;
  };

  /* Items below the first screen get a starting state, then settle when scrolled to (motion allowed only). */
  let armWatch = null;
  const arm = (el, cls, i = 0) => {
    if (calm.matches || el.getBoundingClientRect().top < innerHeight) return;
    armWatch = armWatch || new IntersectionObserver((entries, obs) => {
      entries.filter((en) => en.isIntersecting).forEach((en) => { en.target.classList.add('is-in'); obs.unobserve(en.target); });
    }, { rootMargin: '0px 0px -10%' });
    el.style.setProperty('--i', i);
    el.classList.add(cls);
    armWatch.observe(el);
  };

  window.SR = { cfg, $, $$, calm, clamp, track, now, zonedToUtc, arm };

  /* ================= Phone numbers: one source of truth ================= */
  $$('[data-phone]').forEach((el) => { el.textContent = cfg.phone.display; });
  $$('a[href^="tel:"]').forEach((a) => { a.href = `tel:${cfg.phone.e164}`; });
  $$('[data-sms-number]').forEach((el) => { el.textContent = cfg.sms.display; });
  $$('a[data-sms]').forEach((a) => { a.href = `sms:${cfg.sms.e164}?&body=${encodeURIComponent(cfg.sms.body)}`; });

  /* ================= Ribbon: dismissed for the session ================= */
  const ribbon = $('#np-ribbon');
  if (ribbon) {
    const KEY = 'np-ribbon-hidden';
    try { if (sessionStorage.getItem(KEY)) ribbon.hidden = true; } catch { /* storage blocked */ }
    $('.np-close', ribbon).addEventListener('click', () => {
      ribbon.hidden = true;
      try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked */ }
    });
  }

  /* ================= Header: transparent over the hero, solid once scrolling starts ================= */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-stuck', scrollY > 48);
  addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(onScroll);

  /* ================= Mobile menu ================= */
  const menu = $('#mobile-menu');
  const toggle = $('.menu-toggle');
  const outside = [header, $('main'), $('.site-footer'), $('.call-bar'), ribbon].filter(Boolean);
  const setMenu = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('menu-open', open);
    outside.forEach((el) => { el.inert = open; });
    (open ? $('.menu-close', menu) : toggle).focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setMenu(true));
  menu.addEventListener('click', (e) => { if (e.target.closest('a, .menu-close')) setMenu(false); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return setMenu(false);
    if (e.key !== 'Tab') return;
    const items = $$('a, button', menu);
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); items[0].focus(); }
  });
  matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches && !menu.hidden) setMenu(false); });

  /* ================= Active section in the main nav ================= */
  const navLinks = $$('.main-nav a');
  const navWatch = new IntersectionObserver((entries) => {
    entries.filter((en) => en.isIntersecting).forEach((en) => {
      navLinks.forEach((a) => {
        if (a.hash === `#${en.target.id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55%' });
  $$('main > section').forEach((s) => navWatch.observe(s));

  /* ================= Call bar and header button: one action, shown when the form is not ================= */
  const callBar = $('.call-bar');
  const headerCta = $('.header-cta');
  const inView = new Set();
  let typing = false;
  const syncActions = () => {
    callBar.classList.toggle('is-hidden', inView.size > 0 || typing);
    headerCta.classList.toggle('is-on', inView.size === 0);
  };
  const formWatch = new IntersectionObserver((entries) => {
    entries.forEach((en) => inView[en.isIntersecting ? 'add' : 'delete'](en.target));
    syncActions();
  }, { rootMargin: '0px 0px -10%' });
  $$('.fcard').forEach((el) => formWatch.observe(el));
  document.addEventListener('focusin', (e) => { typing = e.target.matches('.fcard input'); syncActions(); });

  /* ================= Scroll reveals, image wipes and other first-view settles ================= */
  $$('[data-reveal]').forEach((el) => arm(el, 'reveal'));
  $$('[data-reveal-group]').forEach((g) => [...g.children].forEach((el, i) => arm(el, 'reveal', i)));
  $$('[data-wipe]').forEach((el) => arm(el, 'wipe'));
  $$('[data-arm]').forEach((el) => arm(el, 'arm'));

  /* ================= Count-up numbers ================= */
  const stats = $$('[data-count]');
  if (!calm.matches && stats.length) {
    const show = (el, n) => { el.textContent = Math.round(n).toLocaleString('en-US') + el.dataset.suffix; };
    stats.forEach((el) => show(el, 0));
    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const k = clamp((t - start) / 900, 0, 1);
        stats.forEach((el) => show(el, el.dataset.count * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 }).observe($('#trust'));
  }

  /* ================= Before and after sliders ================= */
  $$('[data-ba]').forEach((box) => {
    const handle = $('[role="slider"]', box);
    const set = (value) => {
      const v = Math.round(clamp(value, 0, 100));
      box.style.setProperty('--pos', `${v}%`);
      handle.setAttribute('aria-valuenow', v);
      handle.setAttribute('aria-valuetext', `${v}% before, ${100 - v}% after`);
    };
    const fromPointer = (e) => { const r = box.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    const still = () => box.classList.remove('nudge');
    if (!calm.matches) {
      new IntersectionObserver(([en], obs) => {
        if (!en.isIntersecting) return;
        obs.disconnect();
        setTimeout(() => { if (handle.getAttribute('aria-valuenow') === '50') box.classList.add('nudge'); }, 700);
      }, { threshold: 0.6 }).observe(box);
      box.addEventListener('animationend', still);
    }
    box.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      still();
      box.setPointerCapture(e.pointerId);
      handle.focus({ preventScroll: true });
      fromPointer(e);
      e.preventDefault();
    });
    box.addEventListener('pointermove', (e) => { if (box.hasPointerCapture(e.pointerId)) fromPointer(e); });
    handle.addEventListener('keydown', (e) => {
      const cur = Number(handle.getAttribute('aria-valuenow'));
      const next = { ArrowLeft: cur - 5, ArrowDown: cur - 5, ArrowRight: cur + 5, ArrowUp: cur + 5, PageDown: cur - 20, PageUp: cur + 20, Home: 0, End: 100 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      still();
      set(next);
    });
  });

  /* ================= FAQ: one open at a time, with a height transition ================= */
  const faqs = $$('.faq-list details');
  const slide = (d, open) => {
    const panel = $('.faq-panel', d);
    const from = d.open ? panel.offsetHeight : 0;
    d.anim?.cancel();
    d.want = open;
    if (open) d.open = true;
    if (calm.matches) { d.open = open; return; }
    d.anim = panel.animate({ height: [`${from}px`, `${open ? panel.scrollHeight : 0}px`] }, { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)' });
    d.anim.onfinish = () => { d.open = open; };
  };
  faqs.forEach((d) => {
    d.removeAttribute('name'); // native exclusivity is the no-script fallback
    $('summary', d).addEventListener('click', (e) => {
      e.preventDefault();
      const open = !(d.want ?? d.open);
      if (open) faqs.forEach((other) => { if (other !== d && other.open) slide(other, false); });
      slide(d, open);
    });
  });
})();
