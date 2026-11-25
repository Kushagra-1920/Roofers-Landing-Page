/* Summit Ridge Roofing: inspection calendar. All availability rules live in the CONFIG at the top of main.js. */
(() => {
  'use strict';
  const SR = window.SR;
  const { cfg, $, $$, clamp, track } = SR;
  const B = cfg.booking;

  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const WS = WD.map((d) => d.slice(0, 3));
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MS = MN.map((m) => m.slice(0, 3));
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const plus = (y, m, d, n) => { const t = new Date(Date.UTC(y, m - 1, d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() }; };

  /* Arrival windows for one day, as of right now in Central Time. */
  function windowsFor(day, n) {
    const open = B.open[day.dow] || [];
    const taken = B.booked[day.key] || [];
    const today = day.key === keyOf(n.year, n.month, n.day);
    const mins = n.hour * 60 + n.minute;
    return B.windows.map((w, i) => ({
      ...w, i,
      avail: !B.blocked.includes(day.key) && open.includes(i) && !taken.includes(i) && !(today && w.start * 60 - mins < B.leadMinutes),
    }));
  }

  /* The next bookable days: Sundays, blocked dates and days with nothing left are skipped. */
  function days(count = B.businessDays) {
    const n = SR.now();
    const out = [];
    for (let k = 0; out.length < count && k < 60; k++) {
      const t = plus(n.year, n.month, n.day, k);
      const day = { ...t, key: keyOf(t.y, t.m, t.d), offset: k };
      day.wins = windowsFor(day, n);
      if (day.wins.some((w) => w.avail)) out.push(day);
    }
    return out;
  }

  const dayLabel = (d) => `${WD[d.dow]}, ${MS[d.m - 1]} ${d.d}`;
  const summary = (s) => `${dayLabel(s.day)} · ${s.win.label} window`;
  const chipLabel = (s) => `${s.day.offset === 0 ? 'Today' : s.day.offset === 1 ? 'Tomorrow' : WS[s.day.dow]} ${s.win.label}`;

  function soonest(count = 3) {
    const out = [];
    for (const day of days(10)) {
      for (const win of day.wins) {
        if (win.avail) out.push({ day, win });
        if (out.length === count) return out;
      }
    }
    return out;
  }

  /* ----- .ics file, built in the browser ----- */
  const esc = (s) => s.replace(/[\\;,]/g, '\\$&').replace(/\n/g, '\\n');
  const stamp = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  function buildIcs(slot) {
    const { day, win } = slot;
    const start = SR.zonedToUtc(day.y, day.m, day.d, win.start);
    const end = SR.zonedToUtc(day.y, day.m, day.d, win.end);
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Summit Ridge Roofing//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@summitridgeroofing.example`,
      `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${esc('Free roof inspection, Summit Ridge Roofing')}`,
      `DESCRIPTION:${esc(`Arrival window ${win.label} ${win.unit}. A project manager will call to confirm. Questions? Call ${cfg.phone.display}.`)}`,
      'LOCATION:Your home',
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Roof inspection window starts in one hour', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
  }
  function download(slot) {
    const url = URL.createObjectURL(new Blob([buildIcs(slot)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summit-ridge-roof-inspection.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const api = { days, soonest, dayLabel, summary, chipLabel, download, selected: null };
  SR.booking = api;

  /* ----- Calendar interface ----- */
  const root = $('[data-booking]');
  if (!root) return;
  const daysEl = $('[data-days]', root);
  const winsEl = $('[data-wins]', root);
  const sumEl = $('[data-summary]', root);
  const step2 = $('[data-step2]', root);
  const cardSub = $('.f__sub', step2);
  const defaultSub = cardSub.textContent;
  const state = { day: null, win: null };
  let list = [];
  let signature = '';

  const rove = (group) => {
    const chips = $$('button:not(:disabled)', group);
    chips.forEach((c) => { c.tabIndex = -1; });
    const cur = chips.find((c) => c.getAttribute('aria-pressed') === 'true') || chips[0];
    if (cur) cur.tabIndex = 0;
  };
  [daysEl, winsEl].forEach((group) => group.addEventListener('keydown', (e) => {
    const chips = $$('button:not(:disabled)', group);
    const i = chips.indexOf(document.activeElement);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: chips.length - 1 }[e.key];
    if (i < 0 || to === undefined) return;
    e.preventDefault();
    chips.forEach((c) => { c.tabIndex = -1; });
    const next = chips[clamp(to, 0, chips.length - 1)];
    next.tabIndex = 0;
    next.focus();
  }));

  const chip = (cls, html, label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = html;
    b.setAttribute('aria-pressed', 'false');
    if (label) b.setAttribute('aria-label', label);
    return b;
  };

  function paint(userPicked) {
    $$('button', daysEl).forEach((b, i) => b.setAttribute('aria-pressed', String(list[i] === state.day)));
    const wins = state.day ? state.day.wins : B.windows.map((w, i) => ({ ...w, i, avail: false }));
    winsEl.replaceChildren(...wins.map((w) => {
      const b = chip('wchip', `<b>${w.label}</b><span>${w.unit}</span>`);
      b.disabled = !w.avail;
      b.setAttribute('aria-pressed', String(!!state.win && state.win.i === w.i));
      b.addEventListener('click', () => { state.win = w; paint(true); });
      return b;
    }));
    rove(daysEl);
    rove(winsEl);
    const sel = state.day && state.win ? { day: state.day, win: state.day.wins[state.win.i] } : null;
    api.selected = sel;
    sumEl.textContent = sel ? summary(sel) : state.day ? `${dayLabel(state.day)}. Now choose an arrival window.` : 'Choose a day and an arrival window.';
    cardSub.textContent = sel ? summary(sel) : defaultSub;
    step2.classList.toggle('is-open', !!sel);
    step2.inert = !sel;
    if (sel && userPicked) track('slot_selected', { day: sel.day.key, window: sel.win.label, source: 'calendar' });
  }

  function build() {
    list = days();
    signature = list.map((d) => d.key + d.wins.map((w) => +w.avail).join('')).join('|');
    state.day = list.find((d) => state.day && d.key === state.day.key) || null;
    if (state.win && (!state.day || !state.day.wins[state.win.i].avail)) state.win = null;
    daysEl.replaceChildren(...list.map((d) => {
      const b = chip('dchip', `<span>${WS[d.dow]}</span><b>${d.d}</b><span>${MS[d.m - 1]}</span>`);
      b.dataset.label = `${WD[d.dow]}, ${MN[d.m - 1]} ${d.d}`;
      b.addEventListener('click', () => {
        state.day = d;
        if (state.win && !d.wins[state.win.i].avail) state.win = null;
        paint();
      });
      return b;
    }));
    paint();
  }
  build();

  /* Windows pass and days roll over while the page stays open. */
  setInterval(() => {
    const fresh = days();
    if (fresh.map((d) => d.key + d.wins.map((w) => +w.avail).join('')).join('|') === signature) return;
    const hadSelection = !!api.selected;
    build();
    if (hadSelection && !api.selected) sumEl.textContent = 'That window has passed. Please choose another.';
  }, 60000);
})();
