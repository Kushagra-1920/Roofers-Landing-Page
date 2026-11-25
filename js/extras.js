/* Summit Ridge Roofing: project manager photo, live office status, video player and the text-us helper. */
(() => {
  'use strict';
  const SR = window.SR;
  const { cfg, $, $$, calm, track } = SR;

  /* ----- Project manager photo: the monogram stays unless a photo is configured and loads ----- */
  const slot = $('[data-pm-photo]');
  if (slot && cfg.pm.photo) {
    const img = new Image();
    img.onload = () => {
      img.alt = 'Luis Ortega, project manager';
      img.width = 400;
      img.height = 500;
      slot.replaceChildren(img);
    };
    img.src = cfg.pm.photo;
  }

  /* ----- Office open or closed, in Central Time ----- */
  const status = $('[data-open-status]');
  if (status) {
    const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const clock = (h) => `${h % 12 || 12}:00 ${h < 12 ? 'am' : 'pm'}`;
    const read = () => {
      const n = SR.now();
      const t = n.hour + n.minute / 60;
      const today = cfg.hours[n.dow];
      if (today && t >= today[0] && t < today[1]) return { open: true, text: `Open now · closes at ${clock(today[1])}` };
      if (today && t < today[0]) return { open: false, text: `Closed · Opens today at ${clock(today[0])}` };
      for (let i = 1; i <= 7; i += 1) {
        const dow = (n.dow + i) % 7;
        if (cfg.hours[dow]) return { open: false, text: `Closed · Opens ${DAY[dow]} at ${clock(cfg.hours[dow][0])}` };
      }
      return { open: false, text: 'Closed' };
    };
    const paint = () => {
      const s = read();
      const out = $('[data-open-text]', status);
      if (out.textContent !== s.text) out.textContent = s.text;
      status.classList.toggle('is-open', s.open);
    };
    paint();
    setInterval(paint, 60000);
  }

  /* ----- Pricing bars: drawn from data-min and data-max (dollars) on a $0 to $50,000 scale ----- */
  const SCALE = 50000;
  $$('.price-row').forEach((row) => {
    row.style.setProperty('--from', `${(row.dataset.min / SCALE) * 100}%`);
    row.style.setProperty('--to', `${(row.dataset.max / SCALE) * 100}%`);
  });

  /* ----- Directions ----- */
  $$('a[data-directions]').forEach((a) => { a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cfg.address)}`; });

  /* ----- Text us: on a phone the link opens the messaging app. With a mouse it copies the number. ----- */
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { /* blocked */ }
    ta.remove();
    return ok;
  };
  const flash = (el, text) => {
    if (el.dataset.was === undefined) el.dataset.was = el.textContent;
    el.textContent = text;
    clearTimeout(el.flashTimer);
    el.flashTimer = setTimeout(() => { el.textContent = el.dataset.was; delete el.dataset.was; }, 2000);
  };
  const mouse = matchMedia('(hover: hover) and (pointer: fine)');
  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    const link = e.target.closest('a[data-sms]');
    if (copyBtn) {
      const ok = await copyText(cfg.sms.display);
      flash(copyBtn, ok ? 'Copied' : 'Press Ctrl+C');
      const live = $('[data-copy-status]', copyBtn.parentElement);
      if (live) live.textContent = ok ? 'Number copied.' : '';
    } else if (link && mouse.matches) {
      e.preventDefault();
      const ok = await copyText(cfg.sms.display);
      flash(link, ok ? 'Number copied' : cfg.sms.display);
    }
  });

  /* ----- Video: hides itself when the file is missing, never autoplays with sound ----- */
  const block = $('[data-video-block]');
  if (block) {
    const video = $('video', block);
    const play = $('[data-play]', block);
    const mute = $('[data-mute]', block);
    const hide = () => { block.hidden = true; };
    // Opened straight from disk (file://) the browser blocks this check, so the player is simply left in place.
    if (location.protocol !== 'file:') fetch(cfg.video.src, { method: 'HEAD' }).then((r) => { if (!r.ok) hide(); }).catch(hide);

    // The poster is a large image far below the first screen, so it is only requested when the player is nearly in view.
    new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { video.poster = video.dataset.poster; obs.disconnect(); } }, { rootMargin: '700px 0px' }).observe(video);

    const sync = () => {
      mute.hidden = video.paused || !video.muted;
      play.hidden = !video.paused;
    };
    const start = () => {
      const captions = video.textTracks[0];
      if (captions && captions.mode === 'disabled') captions.mode = 'showing'; // captions on while it plays muted; loaded now, not at page open
      video.controls = true;
      video.play().catch(() => { video.controls = false; });
    };
    play.addEventListener('click', start);
    video.addEventListener('click', () => { if (video.paused && !video.controls) start(); });
    mute.addEventListener('click', () => { video.muted = false; sync(); });
    ['play', 'pause', 'ended', 'volumechange'].forEach((t) => video.addEventListener(t, sync));
    new IntersectionObserver(([en]) => { if (!en.isIntersecting && !video.paused) video.pause(); }, { threshold: 0.25 }).observe(video);
    sync();
  }
})();
