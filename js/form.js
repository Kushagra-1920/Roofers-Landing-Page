/* Summit Ridge Roofing: the three-field inspection form. One component, used in the hero, the calendar and the final call to action. */
(() => {
  'use strict';
  const SR = window.SR;
  const { cfg, $, $$, calm, track } = SR;

  /* A small North Texas ZIP lookup: "City:zip,zip-zip|City:..." (ranges are expanded). EDIT: add or remove areas. */
  const AREA = 'Dallas:75201-75212,75214-75220,75223-75233,75235-75238,75240-75241,75243-75244,75246-75249,75251-75254,75287|Fort Worth:76102-76112,76114-76120,76123,76126-76127,76129,76131-76137,76140,76148,76164,76177,76179,76244|Plano:75023-75025,75074-75075,75086,75093-75094|Frisco:75033-75036|McKinney:75069-75072|Allen:75002,75013|Arlington:76001-76002,76006,76010-76018|Irving:75038-75039,75060-75063|Garland:75040-75047|Richardson:75080-75083,75085|Southlake:76092|Grapevine:76051|Carrollton:75006-75007,75010|Lewisville:75029,75057,75067,75077|Denton:76201,76205,76207-76210|Mansfield:76063|Rockwall:75032,75087|Flower Mound:75022,75028|Coppell:75019|Addison:75001|Colleyville:76034|Keller:76248|The Colony:75056|Little Elm:75068|Prosper:75078|Celina:75009|Wylie:75098|Rowlett:75088-75089|Mesquite:75149-75150,75181|Grand Prairie:75050-75054|Euless:76039-76040|Bedford:76021-76022|Hurst:76053-76054|North Richland Hills:76180,76182|Cedar Hill:75104|DeSoto:75115|Duncanville:75116|Lancaster:75134|Sachse:75048|Farmers Branch:75234';
  const ZIPS = new Map();
  AREA.split('|').forEach((part) => {
    const [city, spans] = part.split(':');
    spans.split(',').forEach((s) => { const [a, b = a] = s.split('-').map(Number); for (let z = a; z <= b; z += 1) ZIPS.set(String(z), city); });
  });

  const digits = (s) => s.replace(/\D/g, '');
  const phoneDigits = (s) => digits(s).replace(/^1/, '').slice(0, 10);
  const fmtPhone = (d) => (d.length < 4 ? (d && `(${d}`) : d.length < 7 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`);
  const firstName = (n) => { const f = n.trim().split(/\s+/)[0] || ''; return f.charAt(0).toUpperCase() + f.slice(1); };

  /* Warm, plain errors. They appear after a field is left, never while typing. */
  const RULES = {
    name: (v) => (v.trim().length >= 2 ? '' : v.trim() ? 'Add your full name so we know who to ask for.' : 'Add your name so we know who to ask for.'),
    phone: (v) => { const n = phoneDigits(v).length; return n === 10 ? '' : n === 0 ? 'Add a phone number so we can call you back.' : n === 7 ? 'Add the area code so we can reach you.' : 'That number looks a little short. Please check it.'; },
    zip: (v) => (/^\d{5}$/.test(v) ? '' : v ? 'ZIP codes have 5 digits.' : 'Add the ZIP code of your home.'),
  };
  const ORDER = ['name', 'phone', 'zip'];

  // EDIT: connect a real endpoint here, for example: return fetch('/api/lead', { method: 'POST', body: JSON.stringify(data) }).
  // The data holds the name, phone and ZIP. Only non-personal fields are pushed to the tracking layer.
  SR.sendLead = (data) => new Promise((resolve) => { setTimeout(resolve, 900, data); });

  const STEPS = {
    lead: ['Call within 1 business hour', 'Free inspection', 'Written quote in 24 hours'],
    booked: ['Confirmation call', 'Free inspection at your home', 'Written quote in 24 hours'],
  };

  function initForm(card) {
    const form = $('form', card);
    const done = $('[data-done]', card);
    const btn = $('.fbtn', card);
    const label = $('.fbtn__label', card);
    const status = $('[data-status]', card);
    const honey = $('[name="company_website"]', card);
    const source = card.dataset.source;
    const booking = card.dataset.mode === 'booking';
    const idle = label.textContent;
    const F = {};
    ORDER.forEach((n) => { const ff = $(`[data-field="${n}"]`, form); F[n] = { ff, input: $('input', ff), msg: $('.ff__msg', ff), help: $('.ff__msg', ff).dataset.help || '', dirty: false, greeted: false, sent: false }; });
    let started = false;
    let pulsed = false;
    let loading = false;
    let pressing = false; // a mouse or finger is on the button

    const val = (n) => F[n].input.value;
    const err = (n) => RULES[n](val(n));
    const lookup = () => ZIPS.get(val('zip'));

    const setMsg = (n, kind, text) => {
      const f = F[n];
      f.ff.dataset.kind = kind;
      f.ff.classList.toggle('is-error', kind === 'error');
      f.msg.textContent = text;
      if (kind === 'error') f.input.setAttribute('aria-invalid', 'true'); else f.input.removeAttribute('aria-invalid');
    };
    /* The calm message for a field: help text, a greeting, or the ZIP result. */
    const rest = (n) => {
      if (n === 'name' && F.name.greeted && !err('name')) return setMsg('name', 'ok', `Nice to meet you, ${firstName(val('name'))}.`);
      if (n === 'zip' && !err('zip')) {
        const city = lookup();
        return city ? setMsg('zip', 'ok', `${city}, TX. We serve your area.`) : setMsg('zip', 'note', 'We mostly serve North Texas. Leave your number and we’ll confirm.');
      }
      return setMsg(n, 'help', F[n].help);
    };

    const update = () => {
      const count = ORDER.filter((n) => !err(n)).length;
      card.style.setProperty('--p', (count / 3).toFixed(3));
      if (loading) return;
      btn.dataset.state = !started ? 'idle' : count === 3 ? 'ready' : 'active';
      const who = !err('name') ? firstName(val('name')) : '';
      label.textContent = who && who.length <= 12 ? `${idle}, ${who}` : idle;
      if (count === 3 && !pulsed && !calm.matches) {
        pulsed = true;
        btn.classList.add('is-pulse');
        btn.addEventListener('animationend', () => btn.classList.remove('is-pulse'), { once: true });
      }
    };
    const sync = (n) => {
      const f = F[n];
      const ok = !err(n);
      f.ff.classList.toggle('is-valid', ok);
      const kind = f.ff.dataset.kind;
      if (ok && (kind === 'error' || n === 'zip')) rest(n);
      else if (!ok && (kind === 'ok' || kind === 'note')) rest(n); // a stale greeting or ZIP result goes away
      update();
    };
    const complete = (n) => {
      if (F[n].sent || err(n)) return;
      F[n].sent = true;
      track('field_complete', { form: source, field: n });
    };
    const start = () => {
      if (started) return;
      started = true;
      track('form_start', { form: source });
      update();
    };

    /* Leaving a field: show a gentle error or the calm message. Errors wait while the button is being pressed. */
    const leave = (n, toButton) => {
      const f = F[n];
      if (!f.dirty && !val(n)) return;
      const e = err(n);
      if (e) { if (!toButton) setMsg(n, 'error', e); return; }
      if (n === 'name') f.greeted = true;
      rest(n);
      complete(n);
      update();
    };

    const formatPhone = () => {
      const i = F.phone.input;
      const before = phoneDigits(i.value.slice(0, i.selectionStart ?? i.value.length)).length;
      i.value = fmtPhone(phoneDigits(i.value));
      if (document.activeElement !== i) return;
      let c = i.value.length;
      if (before < phoneDigits(i.value).length) { c = 0; for (let seen = 0; seen < before; c += 1) if (/\d/.test(i.value[c])) seen += 1; }
      i.setSelectionRange(c, c);
    };
    const onValue = (n) => {
      if (n === 'phone') formatPhone();
      if (n === 'zip') F.zip.input.value = digits(val('zip')).slice(0, 5);
      F[n].dirty = true;
      start();
      sync(n);
    };

    ORDER.forEach((n, idx) => {
      const { input } = F[n];
      input.addEventListener('input', () => onValue(n));
      input.addEventListener('change', () => onValue(n));
      input.addEventListener('focus', start);
      input.addEventListener('blur', (e) => leave(n, e.relatedTarget === btn && pressing));
      if (n !== 'zip') {
        input.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || e.isComposing) return;
          e.preventDefault();
          leave(n, false);
          if (!err(n)) F[ORDER[idx + 1]].input.focus();
        });
      }
    });

    btn.addEventListener('pointerdown', () => { pressing = true; });
    ['pointerup', 'pointercancel', 'click'].forEach((t) => btn.addEventListener(t, () => { pressing = false; }));

    /* Autofill can fill fields without a keystroke. */
    const catchAutofill = () => ORDER.forEach((n) => {
      if (!val(n)) return;
      if (n === 'phone') formatPhone();
      F[n].dirty = true;
      started = true;
      sync(n);
    });
    [0, 300, 1200].forEach((t) => setTimeout(catchAutofill, t));
    update();

    new IntersectionObserver(([en], obs) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      track('form_view', { form: source });
    }, { threshold: 0.5 }).observe(card);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loading) return;
      started = true;
      let firstBad = null;
      ORDER.forEach((n) => {
        F[n].dirty = true;
        const bad = err(n);
        if (bad) { setMsg(n, 'error', bad); firstBad ||= n; } else { if (n === 'name') F.name.greeted = true; rest(n); complete(n); }
      });
      update();
      if (firstBad) {
        status.textContent = 'A detail is missing. Please check the highlighted field.';
        F[firstBad].input.focus();
        return;
      }
      loading = true;
      btn.dataset.state = 'loading';
      btn.setAttribute('aria-busy', 'true');
      label.textContent = 'Reserving your report…';
      status.textContent = 'Reserving your report.';

      const slot = booking ? SR.booking.selected : null;
      const data = { source, name: val('name').trim(), phone: val('phone'), zip: val('zip'), city: lookup() || null, slot: slot && { day: slot.day.key, window: slot.win.label }, attribution: window.track?.attribution?.() || {} };
      if (!honey.value) {
        const shared = { form: source, zip: data.zip, zip_recognized: !!data.city, ...data.attribution };
        track('form_submit', shared);
        if (booking) track('booking_submit', { ...shared, day: data.slot?.day, window: data.slot?.window });
        await SR.sendLead(data);
      } else {
        await new Promise((r) => { setTimeout(r, 900); });
      }
      card.__data = data;
      loading = false;
      btn.removeAttribute('aria-busy');
      showDone(card, { mode: booking ? 'booked' : 'lead', first: firstName(data.name), phone: data.phone, slot });
    });
  }

  /* ----- Success state: replaces the form inside the same card ----- */
  function showDone(card, d) {
    const form = $('form', card);
    const done = $('[data-done]', card);
    const title = $('[data-done-title]', done);
    const text = $('[data-done-text]', done);
    const steps = $$('[data-done-steps] li', done);
    const slotsBox = $('[data-done-slots]', done);
    const calBtn = $('[data-done-cal]', done);

    if (!form.hidden) card.style.minHeight = `${card.offsetHeight}px`; // the card never changes height while it swaps
    form.hidden = true;
    done.hidden = false;

    const booked = d.mode === 'booked';
    title.textContent = booked ? `You’re booked, ${d.first}.` : `You’re all set, ${d.first}.`;
    text.textContent = booked
      ? `${SR.booking.dayLabel(d.slot.day)}, ${d.slot.win.label}. A project manager will call to confirm.`
      : `A project manager will call (xxx) xxx-${digits(d.phone).slice(-4)} within 1 business hour.`;
    STEPS[d.mode].forEach((t, i) => { steps[i].textContent = t; });
    calBtn.hidden = !booked;
    calBtn.onclick = () => SR.booking.download(d.slot);

    const options = !booked && SR.booking ? SR.booking.soonest(3) : [];
    slotsBox.hidden = options.length === 0;
    const chips = $('[data-done-chips]', done);
    chips.replaceChildren(...options.map((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tchip';
      b.textContent = SR.booking.chipLabel(s);
      b.setAttribute('aria-label', `Book ${SR.booking.dayLabel(s.day)}, ${s.win.label} window`);
      b.addEventListener('click', async () => {
        $$('.tchip', done).forEach((c) => { c.disabled = true; });
        b.textContent = 'Booking\u2026';
        const data = card.__data;
        const shared = { form: card.dataset.source, zip: data.zip, ...data.attribution, day: s.day.key, window: s.win.label };
        track('slot_selected', { day: s.day.key, window: s.win.label, source: 'success' });
        track('booking_submit', shared);
        await SR.sendLead({ ...data, slot: { day: s.day.key, window: s.win.label } });
        showDone(card, { mode: 'booked', first: d.first, phone: d.phone, slot: s });
      });
      return b;
    }));

    title.focus({ preventScroll: true });
    const top = card.getBoundingClientRect().top;
    if (top < 72 || top > innerHeight * 0.6) card.scrollIntoView({ block: 'center', behavior: calm.matches ? 'auto' : 'smooth' });
  }

  $$('.fcard').forEach(initForm);
})();
