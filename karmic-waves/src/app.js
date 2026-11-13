/* Karmic Waves — application logic (no framework, no build-time dependencies). */
(function () {
  'use strict';

  var KW = window.KW;
  var cfg = KW.config;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isAndroid = /Android/i.test(navigator.userAgent);

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */
  var util = {
    pad2: function (n) { return (n < 10 ? '0' : '') + n; },
    isLeap: function (y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; },
    daysInMonth: function (m, y) { return [31, util.isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; },
    /* Returns { ok, reason } for a real calendar date not in the future and inside the configured year range. */
    validateDob: function (d, m, y) {
      if (!d || !m || !y) return { ok: false, reason: 'Please choose day, month and year.' };
      if (y < cfg.years.min || y > cfg.years.max) return { ok: false, reason: 'Please choose a year between ' + cfg.years.min + ' and ' + cfg.years.max + '.' };
      if (m < 1 || m > 12) return { ok: false, reason: 'Please choose a valid month.' };
      var dim = util.daysInMonth(m, y);
      if (d < 1 || d > dim) {
        return { ok: false, reason: cfg.months[m].name + ' ' + y + ' has only ' + dim + ' days. Please adjust the day.' };
      }
      var dt = new Date(y, m - 1, d);
      if (dt.getTime() > Date.now()) return { ok: false, reason: 'A birth date cannot be in the future.' };
      return { ok: true };
    },
    /* Indian mobile: 10 digits, first digit 6–9. Returns E.164 or null. */
    normalizePhoneIN: function (raw) {
      var digits = String(raw || '').replace(/\D/g, '');
      if (digits.length === 12 && digits.slice(0, 2) === '91') digits = digits.slice(2);
      if (digits.length === 11 && digits[0] === '0') digits = digits.slice(1);
      return /^[6-9]\d{9}$/.test(digits) ? '+91' + digits : null;
    },
    vibrate: function (pattern) {
      if (isAndroid && 'vibrate' in navigator) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
    },
    uuid: function () {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      var a = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 256 | 0; });
      a[6] = (a[6] & 0x0f) | 0x40; a[8] = (a[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(a, function (b) { return (b + 256).toString(16).slice(1); }).join('');
      return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    },
    attribution: function () {
      var p = new URLSearchParams(location.search);
      var pick = function (k) { return (p.get(k) || '').slice(0, 200); };
      return {
        utm_source: pick('utm_source'), utm_medium: pick('utm_medium'), utm_campaign: pick('utm_campaign'),
        utm_content: pick('utm_content'), utm_term: pick('utm_term'), fbclid: pick('fbclid'),
        referrer: (document.referrer || '').slice(0, 300), landing_path: location.pathname + location.search.slice(0, 500)
      };
    },
    businessNumberOk: function () { return /^91[6-9]\d{9}$/.test(String(cfg.businessWhatsApp || '')); }
  };
  KW.util = util; // exposed for tests

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */
  var toastEl = $('#toast'), toastTimer = null;
  function toast(msg, ms) {
    clearTimeout(toastTimer);
    toastEl.textContent = msg; toastEl.hidden = false;
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 3200);
  }

  /* ------------------------------------------------------------------ */
  /* Trust strip + reviews (config-driven; hidden without verified data) */
  /* ------------------------------------------------------------------ */
  (function renderTrust() {
    var items = (cfg.trust || []).filter(function (t) { return t.verified === true && t.value; });
    var ul = $('#trust-strip');
    if (!items.length) return;
    items.forEach(function (t) {
      var li = document.createElement('li');
      var s = document.createElement('strong'); s.textContent = t.value;
      li.appendChild(s); li.appendChild(document.createTextNode(t.label));
      ul.appendChild(li);
    });
    ul.hidden = false;
  })();

  (function renderReviews() {
    var approved = (cfg.reviews || []).filter(function (r) { return r.approved === true && r.text; });
    if (!approved.length) return;
    var list = $('#reviews-list');
    approved.forEach(function (r) {
      var card = document.createElement('article'); card.className = 'review';
      var head = document.createElement('div'); head.className = 'review__head';
      var name = document.createElement('span'); name.className = 'review__name'; name.textContent = r.name || 'Listener';
      var where = document.createElement('span'); where.textContent = [r.city, r.month ? r.month + ' kit' : ''].filter(Boolean).join(' · ');
      head.appendChild(name); head.appendChild(where);
      var text = document.createElement('p'); text.className = 'review__text'; text.textContent = r.text;
      card.appendChild(head); card.appendChild(text);
      if (r.time) { var t = document.createElement('span'); t.className = 'review__time'; t.textContent = r.time; card.appendChild(t); }
      list.appendChild(card);
    });
    $('#reviews').hidden = false;
  })();

  $('#year').textContent = String(new Date().getFullYear());
  if (cfg.previewMode) { $('#preview-ribbon').hidden = false; }

  /* ------------------------------------------------------------------ */
  /* DOB console                                                         */
  /* ------------------------------------------------------------------ */
  var daySel = $('#dob-day'), monthSel = $('#dob-month'), yearSel = $('#dob-year');
  var dobError = $('#dob-error'), readout = $('#readout'), synthBtn = $('#synth-btn'), mandala = $('#mandala');
  var mandalaAngle = 0;
  var state = { phase: 'idle', dob: null, month: null };

  function fill(sel, placeholder, values, labelFn) {
    var frag = document.createDocumentFragment();
    var ph = document.createElement('option'); ph.value = ''; ph.textContent = placeholder; ph.disabled = true; ph.selected = true;
    frag.appendChild(ph);
    values.forEach(function (v) { var o = document.createElement('option'); o.value = String(v); o.textContent = labelFn ? labelFn(v) : String(v); frag.appendChild(o); });
    sel.appendChild(frag);
  }
  var range = function (a, b, step) { var out = []; for (var i = a; step > 0 ? i <= b : i >= b; i += step) out.push(i); return out; };
  fill(daySel, 'DD', range(1, 31, 1), util.pad2);
  fill(monthSel, 'Month', range(1, 12, 1), function (m) { return cfg.months[m].name; });
  fill(yearSel, 'YYYY', range(cfg.years.max, cfg.years.min, -1));

  function currentDob() {
    return { d: parseInt(daySel.value, 10) || 0, m: parseInt(monthSel.value, 10) || 0, y: parseInt(yearSel.value, 10) || 0 };
  }

  function spinMandala() {
    if (reduceMotion) return;
    mandalaAngle += 60;
    mandala.style.transform = 'rotate(' + mandalaAngle + 'deg)';
  }

  function onDobChange() {
    var v = currentDob();
    spinMandala();
    util.vibrate(15);
    var complete = v.d && v.m && v.y;
    var res = complete ? util.validateDob(v.d, v.m, v.y) : { ok: false };
    if (complete && !res.ok) {
      dobError.textContent = res.reason; dobError.hidden = false;
    } else {
      dobError.hidden = true; dobError.textContent = '';
    }
    if (res.ok) {
      var mo = cfg.months[v.m];
      readout.innerHTML = '';
      var line = document.createElement('span');
      line.appendChild(document.createTextNode('Natal Resonance Detected: '));
      var e = document.createElement('strong'); e.textContent = mo.element; line.appendChild(e);
      line.appendChild(document.createTextNode(' • Base Acoustic Tuning: '));
      var h = document.createElement('strong'); h.textContent = mo.hz + ' Hz'; line.appendChild(h);
      readout.appendChild(line);
      synthBtn.disabled = false;
      state.phase = 'ready';
      state.dob = { y: v.y, m: v.m, d: v.d, iso: v.y + '-' + util.pad2(v.m) + '-' + util.pad2(v.d) };
      state.month = v.m;
    } else {
      readout.innerHTML = '<span class="readout__idle">Choose day, month and year to detect your resonance.</span>';
      synthBtn.disabled = true;
      state.phase = 'idle'; state.dob = null; state.month = null;
    }
  }
  [daySel, monthSel, yearSel].forEach(function (s) { s.addEventListener('change', onDobChange); });

  $('#dob-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = currentDob();
    var res = util.validateDob(v.d, v.m, v.y);
    if (!res.ok) { dobError.textContent = res.reason; dobError.hidden = false; daySel.focus(); return; }
    if (state.phase !== 'ready') return;
    [daySel, monthSel, yearSel].forEach(function (s) { s.disabled = true; });
    synthBtn.disabled = true;
    startProcessing();
  });

  /* ------------------------------------------------------------------ */
  /* Ambient audio (Web Audio) — starts only from the CTA click          */
  /* ------------------------------------------------------------------ */
  var ambient = {
    ctx: null, master: null, muted: false,
    start: function (durationSec) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        var ctx = new AC();
        this.ctx = ctx;
        var now = ctx.currentTime;
        var master = ctx.createGain(); master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(this.muted ? 0.0001 : 0.22, now + 1.0);
        master.gain.setValueAtTime(this.muted ? 0.0001 : 0.22, now + durationSec - 1.2);
        master.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.7;
        var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 432;
        var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 216;
        var g2 = ctx.createGain(); g2.gain.value = 0.6;
        o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(master); master.connect(ctx.destination);
        o1.start(now); o2.start(now); o1.stop(now + durationSec); o2.stop(now + durationSec);
        /* soft chime near the end */
        var chimeAt = now + durationSec - 0.3;
        var c = ctx.createOscillator(); c.type = 'sine'; c.frequency.value = 864;
        var cg = ctx.createGain(); cg.gain.setValueAtTime(0.0001, chimeAt);
        cg.gain.exponentialRampToValueAtTime(0.18, chimeAt + 0.03); cg.gain.exponentialRampToValueAtTime(0.0001, chimeAt + 1.4);
        c.connect(cg); cg.connect(master); c.start(chimeAt); c.stop(chimeAt + 1.5);
        this.master = master;
        if (ctx.state === 'suspended') { ctx.resume().catch(function () { /* ignore */ }); }
        return true;
      } catch (e) { this.ctx = null; return false; }
    },
    setMuted: function (m) {
      this.muted = m;
      if (this.ctx && this.master) {
        var t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(m ? 0.0001 : 0.22, t, 0.05);
      }
    },
    stop: function () {
      var ctx = this.ctx; this.ctx = null; this.master = null;
      if (ctx && ctx.state !== 'closed') { try { ctx.close().catch(function () { /* ignore */ }); } catch (e) { /* ignore */ } }
    }
  };
  $('#mute-btn').addEventListener('click', function () {
    var next = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(next));
    this.setAttribute('aria-label', next ? 'Unmute ambient preview' : 'Mute ambient preview');
    ambient.setMuted(next);
  });

  /* ------------------------------------------------------------------ */
  /* Processing sequence (6.5 s)                                         */
  /* ------------------------------------------------------------------ */
  var PROCESS_MS = 6500;
  var NODE_TIMES = [0, 1500, 3200, 5000]; // ms at which each node becomes active
  var processing = $('#processing'), nodesEl = $('#nodes'), nodeEls = $$('.node'), hzEl = $('#hz-value'), canvas = $('#wave');
  var timers = [], rafHandle = 0, waveActive = false, procStart = 0;

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  /* Hz counter: purely time-based visual effect, not a measurement of anything. */
  function hzAt(t) {
    var stops = [[0, 136.1], [0.5, 432.0], [1, 528.0]];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        var a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]);
        k = k < 0 ? 0 : k > 1 ? 1 : k; k = k * k * (3 - 2 * k);
        return a[1] + (b[1] - a[1]) * k;
      }
    }
    return 528.0;
  }

  function startWave(startTs) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      var w = canvas.clientWidth || 400, h = canvas.clientHeight || 90;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      return { w: w, h: h };
    }
    waveActive = true;
    var lastHz = -1;
    function frame(now) {
      if (!waveActive) return;
      var el = now - startTs, t = Math.min(el / PROCESS_MS, 1);
      var s = size(), w = s.w, h = s.h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var amp = h * 0.32 * (0.35 + 0.65 * Math.sin(Math.min(t, 1) * Math.PI));
      var freq = 2 + t * 4, phase = el / 300;
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      [[1, 'rgba(0,242,254,0.95)'], [0.55, 'rgba(212,175,55,0.55)']].forEach(function (layer, li) {
        ctx.beginPath();
        for (var x = 0; x <= w; x += 2) {
          var y = h / 2 + Math.sin((x / w) * Math.PI * 2 * freq + phase * (li ? 0.7 : 1)) * amp * layer[0] * Math.sin((x / w) * Math.PI);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = layer[1]; ctx.shadowColor = layer[1]; ctx.shadowBlur = li ? 0 : 10; ctx.stroke();
      });
      var hz = hzAt(t);
      if (Math.abs(hz - lastHz) >= 0.05) { hzEl.textContent = hz.toFixed(1); lastHz = hz; }
      if (t < 1) rafHandle = requestAnimationFrame(frame); else waveActive = false;
    }
    rafHandle = requestAnimationFrame(frame);
  }
  function stopWave() { waveActive = false; if (rafHandle) cancelAnimationFrame(rafHandle); rafHandle = 0; }

  function setNode(i, cls) {
    nodeEls.forEach(function (el, idx) {
      if (idx < i) { el.classList.remove('is-active'); el.classList.add('is-done'); }
      else if (idx === i) { el.classList.add(cls); }
    });
  }

  function startProcessing() {
    state.phase = 'processing';
    processing.hidden = false;
    nodeEls.forEach(function (el) { el.classList.remove('is-active', 'is-done'); });
    nodesEl.classList.remove('is-running'); void nodesEl.offsetWidth; nodesEl.classList.add('is-running');
    processing.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    ambient.start(PROCESS_MS / 1000);

    var startTs = performance.now();
    procStart = startTs;
    if (!reduceMotion) startWave(startTs); else { hzEl.textContent = '528.0'; }

    NODE_TIMES.forEach(function (ms, i) {
      later(function () { setNode(i, 'is-active'); if (i > 0) util.vibrate(22); }, ms);
    });
    later(function () {
      nodeEls.forEach(function (el) { el.classList.remove('is-active'); el.classList.add('is-done'); });
      util.vibrate([40, 60, 40]);
      stopWave();
      ambient.stop();
      showResult();
    }, PROCESS_MS);
  }

  document.addEventListener('visibilitychange', function () {
    /* When the tab is hidden mid-processing, the rAF pauses by itself; timers continue so the sequence still completes. */
    if (document.visibilityState === 'visible' && state.phase === 'processing' && !waveActive && !reduceMotion &&
        performance.now() - procStart < PROCESS_MS) {
      startWave(procStart);
    }
  });

  /* ------------------------------------------------------------------ */
  /* Result card                                                         */
  /* ------------------------------------------------------------------ */
  var resultEl = $('#result'), phoneInput = $('#phone'), phoneError = $('#phone-error'), sendBtn = $('#send-btn'), leadStatus = $('#lead-status');

  function fmtBytes(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }

  function showResult() {
    state.phase = 'result';
    var mo = cfg.months[state.month];
    $('#kit-month').textContent = mo.name;
    $('#result-meta').textContent = mo.element + ' resonance • ' + mo.hz + ' Hz base tuning • 3 tracks';
    var list = $('#result-tracks'); list.innerHTML = '';
    mo.tracks.forEach(function (t) {
      var li = document.createElement('li'); li.className = 'result__track';
      var box = document.createElement('div');
      var title = document.createElement('div'); title.className = 'result__track-title'; title.textContent = t.title;
      box.appendChild(title);
      if (t.verified === true && (t.format || t.sizeBytes)) {
        var meta = document.createElement('div'); meta.className = 'result__track-meta';
        meta.textContent = [t.format, t.sizeBytes ? fmtBytes(t.sizeBytes) : ''].filter(Boolean).join(' • ');
        box.appendChild(meta);
      }
      li.appendChild(box); list.appendChild(li);
    });
    resultEl.hidden = false;
    later(function () {
      resultEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      resultEl.focus({ preventScroll: true });
    }, 50);
  }

  function validatePhoneUI() {
    var e164 = util.normalizePhoneIN(phoneInput.value);
    if (!phoneInput.value.trim()) { phoneError.textContent = 'Please enter your 10-digit WhatsApp number.'; phoneError.hidden = false; return null; }
    if (!e164) { phoneError.textContent = 'Enter a valid Indian mobile number: 10 digits, starting with 6, 7, 8 or 9.'; phoneError.hidden = false; return null; }
    phoneError.hidden = true; phoneError.textContent = '';
    return e164;
  }
  phoneInput.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 10);
    if (!phoneError.hidden) validatePhoneUI();
  });

  /* ------------------------------------------------------------------ */
  /* Meta Pixel — base code only when an ID exists; Lead fired once      */
  /* ------------------------------------------------------------------ */
  var pixel = {
    loaded: false, leadFired: false,
    init: function () {
      if (!cfg.metaPixelId || this.loaded) return;
      /* Standard Meta Pixel base code */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', cfg.metaPixelId);
      window.fbq('track', 'PageView');
      this.loaded = true;
    },
    lead: function (eventId) {
      if (!this.loaded || this.leadFired || !window.fbq) return false;
      this.leadFired = true;
      /* Only non-personal data: no DOB, no phone. */
      window.fbq('track', 'Lead', { content_name: 'birth_month_free_kit', content_category: 'free_tool' }, { eventID: eventId });
      return true;
    }
  };
  pixel.init();
  KW.pixel = pixel;

  /* ------------------------------------------------------------------ */
  /* Lead submit → backend → Pixel → WhatsApp                            */
  /* ------------------------------------------------------------------ */
  function waUrl(dobIso) {
    var d = dobIso.split('-');
    var text = 'Namaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: ' + d[2] + '/' + d[1] + '/' + d[0];
    return 'https://wa.me/' + cfg.businessWhatsApp + '?text=' + encodeURIComponent(text);
  }
  KW.waUrl = waUrl;

  function setStatus(msg, isError) { leadStatus.textContent = msg; leadStatus.classList.toggle('is-error', !!isError); }

  function postLead(payload) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeout = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    return fetch(cfg.leadEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined, credentials: 'same-origin'
    }).then(function (r) {
      clearTimeout(timeout);
      return r.json().catch(function () { return {}; }).then(function (j) { j.__status = r.status; return j; });
    }, function (err) { clearTimeout(timeout); throw err; });
  }

  var submitting = false;
  $('#lead-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (submitting) return;
    var e164 = validatePhoneUI();
    if (!e164) { phoneInput.focus(); return; }
    if (!state.dob) { toast('Please select your date of birth first.'); return; }
    if (cfg.previewMode) {
      /* Client preview build: no backend, no Pixel, no WhatsApp hand-off. Shows exactly what production would do. */
      var d = state.dob.iso.split('-');
      setStatus('PREVIEW — in the live version this stores the lead, then opens WhatsApp to the business number with: \u201CNamaste Karmic Waves, please send my 3 Free Birth-Month Audio Tracks for DOB: ' + d[2] + '/' + d[1] + '/' + d[0] + '\u201D');
      toast('Preview build: nothing was sent or stored.');
      return;
    }
    if (!util.businessNumberOk()) {
      setStatus('WhatsApp number for the business is not configured yet. Please try again later.', true);
      return;
    }
    submitting = true; sendBtn.classList.add('is-busy'); sendBtn.setAttribute('aria-disabled', 'true');
    setStatus('Saving your request…');

    var payload = {
      dob: state.dob.iso, birthMonth: state.month, phone: e164, consent: true,
      consentAt: new Date().toISOString(), consentTextVersion: cfg.legal.consentTextVersion,
      clientEventId: util.uuid(), attribution: util.attribution()
    };

    postLead(payload).then(function (res) {
      if (res && res.ok) {
        var eventId = res.eventId || payload.clientEventId;
        var fired = pixel.lead(eventId);
        setStatus(res.stored === 'pending'
          ? 'Request noted. Opening WhatsApp…'
          : 'Saved. Opening WhatsApp…');
        openWhatsApp();
        if (!fired && cfg.metaPixelId) { /* nothing: Pixel not loaded (blocked) — never retry blindly */ }
      } else if (res && res.__status === 429) {
        setStatus('Too many requests from this network. Please try again in a few minutes.', true);
        finish();
      } else if (res && res.error) {
        setStatus(res.error, true); finish();
      } else {
        throw new Error('bad_response');
      }
    }).catch(function () {
      if (cfg.allowWhatsAppWithoutBackend) {
        /* Static-host mode: we can still open WhatsApp, but nothing is stored and no Pixel Lead fires. */
        setStatus('Opening WhatsApp… (your request will be noted inside the chat)');
        openWhatsApp();
      } else {
        setStatus('We could not save your request right now. Please check your connection and try again.', true);
        finish();
      }
    });

    function openWhatsApp() {
      var url = waUrl(state.dob.iso);
      state.phase = 'sent';
      sendBtn.classList.remove('is-busy'); sendBtn.removeAttribute('aria-disabled');
      $('#send-label').textContent = 'Open WhatsApp again';
      submitting = false;
      /* Same tab is most reliable on mobile; desktop gets a new tab. */
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) { location.href = url; } else { var w = window.open(url, '_blank', 'noopener'); if (!w) location.href = url; }
    }
    function finish() { submitting = false; sendBtn.classList.remove('is-busy'); sendBtn.removeAttribute('aria-disabled'); }
  });

  /* ------------------------------------------------------------------ */
  /* Modals (Privacy / Terms / Contact)                                  */
  /* ------------------------------------------------------------------ */
  var modal = $('#modal'), modalDialog = $('.modal__dialog', modal), modalTitle = $('#modal-title'), modalBody = $('#modal-body');
  var lastFocus = null;
  var titles = { privacy: 'Privacy Notice', terms: 'Terms of Use', contact: 'Contact' };
  function fillTemplate(html) {
    var map = {
      entityName: cfg.legal.entityName, contactEmail: cfg.legal.contactEmail, address: cfg.legal.address,
      retentionDays: cfg.legal.retentionDays, grievanceOfficer: cfg.legal.grievanceOfficer,
      businessNumber: util.businessNumberOk() ? '+' + cfg.businessWhatsApp : '[CLIENT TO CONFIRM] business WhatsApp number',
      storageProvider: '[CLIENT TO CONFIRM] lead storage provider'
    };
    return html.replace(/\{\{(\w+)\}\}/g, function (_, k) { return k in map ? map[k] : ''; });
  }
  function openModal(kind) {
    var tpl = $('#tpl-' + kind); if (!tpl) return;
    lastFocus = document.activeElement;
    modalTitle.textContent = titles[kind] || '';
    modalBody.innerHTML = fillTemplate(tpl.innerHTML); // templates are static author-controlled markup
    modal.hidden = false; document.body.classList.add('modal-open');
    modalDialog.focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true; document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('[data-modal]').forEach(function (b) { b.addEventListener('click', function () { openModal(b.getAttribute('data-modal')); }); });
  modal.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      var f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', modalDialog).filter(function (el) { return !el.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* Cleanup on unload: no dangling timers / audio. */
  window.addEventListener('pagehide', function () { clearTimers(); stopWave(); ambient.stop(); });

  KW.state = state; // read-only for tests
})();
