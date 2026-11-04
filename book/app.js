(() => {
  const localApi = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? new URLSearchParams(location.search).get('api') : null;
  const api = localApi || window.DAYTA_BOOKING_API;
  const el = Object.fromEntries([
    'loading', 'booking-ui', 'confirmation', 'confirmation-time', 'confirmation-email',
    'duration', 'meeting-heading', 'type-picker', 'timezone', 'dates', 'weekdays',
    'month-heading', 'previous-month', 'next-month', 'times', 'times-heading',
    'availability-status', 'booking-form', 'selection-summary', 'form-status',
    'submit', 'time-picker', 'change-time', 'time-step', 'details-step', 'year'
  ].map(id => [id, document.getElementById(id)]));
  let zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  let types = {}, selectedType = '', slots = [], selectedDate = '', selectedSlot = '';
  let bookingKey = '', month = '', firstMonth = '', lastMonth = '', enabled = false;
  let requestGeneration = 0, submitting = false;
  let recaptchaSiteKey = '', recaptchaWidget = null, recaptchaLoader = null;
  const dayDate = day => new Date(`${day}T12:00:00Z`);
  const dayLabel = day => new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC'
  }).format(dayDate(day));
  const timeLabel = iso => new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', timeZone: zone
  }).format(new Date(iso));
  const timeZoneLabel = iso => new Intl.DateTimeFormat(undefined, {
    timeZone: zone, timeZoneName: 'long'
  }).formatToParts(new Date(iso)).find(part => part.type === 'timeZoneName').value;

  function localDay(iso) {
    const parts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone
    }).formatToParts(new Date(iso));
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(25_000), ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Booking is unavailable right now. Please try again or email Landon.'), { status: response.status });
    return data;
  }

  function showError(message) {
    el.loading.hidden = false;
    el.loading.replaceChildren(document.createTextNode(message));
    const paragraph = document.createElement('p');
    const link = document.createElement('a');
    link.href = 'mailto:landon@daytanalytics.com';
    link.textContent = 'Email Landon to schedule';
    paragraph.append(link);
    el.loading.append(paragraph);
    el['booking-ui'].hidden = true;
  }

  function loadRecaptcha() {
    if (!recaptchaSiteKey) return Promise.resolve();
    if (!recaptchaLoader) recaptchaLoader = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Verification could not load. Refresh this page or email Landon to schedule.')), 10_000);
      window.daytaRecaptchaReady = () => { clearTimeout(timeout); resolve(); };
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?onload=daytaRecaptchaReady&render=explicit';
      script.async = true;
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Verification could not load. Refresh this page or email Landon to schedule.')); };
      document.head.append(script);
    });
    return recaptchaLoader.then(() => {
      if (recaptchaWidget === null) recaptchaWidget = window.grecaptcha.render('recaptcha', {
        sitekey: recaptchaSiteKey,
        size: el['booking-form'].clientWidth < 304 ? 'compact' : 'normal',
        callback: () => { el['form-status'].textContent = ''; },
        'expired-callback': () => { el['form-status'].textContent = 'Verification expired. Please complete it again.'; },
        'error-callback': () => { el['form-status'].textContent = 'Verification could not connect. Please try again or email Landon.'; }
      });
      else window.grecaptcha.reset(recaptchaWidget);
    }).catch(error => { recaptchaLoader = null; throw error; });
  }

  function renderTypes() {
    el['type-picker'].replaceChildren();
    el['type-picker'].hidden = Object.keys(types).length < 2;
    for (const [slug, type] of Object.entries(types)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(slug === selectedType));
      const title = document.createElement('strong');
      title.textContent = type.title;
      const duration = document.createElement('span');
      duration.textContent = `${type.minutes} min`;
      button.append(title, duration);
      button.addEventListener('click', () => selectType(slug));
      el['type-picker'].append(button);
    }
  }

  function renderWeekdays() {
    for (let day = 1; day <= 7; day++) {
      const span = document.createElement('span');
      span.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'narrow', timeZone: 'UTC' })
        .format(new Date(`2026-11-${String(day).padStart(2, '0')}T12:00:00Z`));
      el.weekdays.append(span);
    }
  }

  function setCalendarBounds() {
    const today = new Date();
    firstMonth = localDay(today.toISOString()).slice(0, 7);
    // Bound navigation to the dates for which availability was actually loaded.
    lastMonth = slots.length ? localDay(slots.at(-1)).slice(0, 7) : firstMonth;
    if (!month || month < firstMonth || month > lastMonth) month = slots.length ? localDay(slots[0]).slice(0, 7) : firstMonth;
  }

  function renderCalendar() {
    const groups = new Set(slots.map(localDay));
    const first = new Date(`${month}-01T12:00:00Z`);
    const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    el['month-heading'].textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    el['previous-month'].disabled = month <= firstMonth;
    el['next-month'].disabled = month >= lastMonth;
    el.dates.replaceChildren();
    for (let index = 0; index < first.getUTCDay(); index++) {
      const blank = document.createElement('span');
      blank.className = 'calendar-blank';
      blank.setAttribute('aria-hidden', 'true');
      el.dates.append(blank);
    }
    const today = localDay(new Date().toISOString());
    for (let number = 1; number <= days; number++) {
      const day = `${month}-${String(number).padStart(2, '0')}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(number);
      button.dataset.day = day;
      button.dataset.today = String(day === today);
      button.disabled = !enabled || !groups.has(day);
      button.setAttribute('aria-label', `${dayLabel(day)}${button.disabled ? ', unavailable' : ''}`);
      button.setAttribute('aria-pressed', String(day === selectedDate));
      button.addEventListener('click', () => { selectedDate = day; selectedSlot = ''; renderCalendar(); });
      el.dates.append(button);
    }
    renderTimes();
  }

  function renderTimes() {
    el.times.replaceChildren();
    el['times-heading'].textContent = selectedDate
      ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(dayDate(selectedDate))
      : 'Available times';
    const daySlots = slots.filter(slot => localDay(slot) === selectedDate);
    if (!daySlots.length) {
      const message = document.createElement('p');
      message.className = 'times-empty';
      message.textContent = 'Choose an available date to see times.';
      el.times.append(message);
      return;
    }
    for (const slot of daySlots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = timeLabel(slot);
      button.dataset.start = slot;
      button.setAttribute('aria-label', `${timeLabel(slot)}, ${timeZoneLabel(slot)}`);
      button.setAttribute('aria-pressed', String(slot === selectedSlot));
      button.disabled = !enabled;
      button.addEventListener('click', () => selectSlot(slot));
      el.times.append(button);
    }
  }

  function summary(target, slot) {
    const date = document.createElement('strong');
    date.textContent = dayLabel(localDay(slot));
    const time = document.createElement('div');
    const end = new Date(Date.parse(slot) + types[selectedType].minutes * 60_000).toISOString();
    time.textContent = `${timeLabel(slot)} – ${timeLabel(end)}`;
    const details = document.createElement('span');
    details.textContent = `${timeZoneLabel(slot)} · ${types[selectedType].minutes} minutes · Google Meet`;
    target.replaceChildren(date, time, details);
  }

  function showTimePicker(focus = false) {
    el['booking-form'].hidden = true;
    el['time-picker'].hidden = false;
    el['time-step'].setAttribute('aria-current', 'step');
    el['details-step'].removeAttribute('aria-current');
    if (focus) el.dates.querySelector('button[aria-pressed=true]:enabled')?.focus();
  }

  function selectSlot(slot) {
    if (!enabled || submitting) return;
    if (selectedSlot !== slot) bookingKey = crypto.randomUUID();
    selectedSlot = slot;
    renderTimes();
    summary(el['selection-summary'], slot);
    el['time-picker'].hidden = true;
    el['booking-form'].hidden = false;
    el['time-step'].removeAttribute('aria-current');
    el['details-step'].setAttribute('aria-current', 'step');
    el['form-status'].textContent = '';
    el['booking-form'].querySelector('[name=name]').focus({ preventScroll: true });
    el['booking-form'].scrollIntoView({ block: 'nearest' });
    loadRecaptcha().catch(error => { el['form-status'].textContent = error.message; });
  }

  async function selectType(slug, refreshAfterConflict = false) {
    if (!types[slug] || (submitting && !refreshAfterConflict)) return;
    selectedType = slug;
    const generation = ++requestGeneration;
    selectedSlot = ''; selectedDate = ''; bookingKey = ''; slots = []; month = '';
    el.duration.textContent = `${types[slug].minutes} minutes`;
    el['meeting-heading'].textContent = types[slug].title;
    renderTypes();
    showTimePicker();
    el['availability-status'].textContent = 'Checking the calendar…';
    el['availability-status'].dataset.loading = 'true';
    el['previous-month'].disabled = true;
    el['next-month'].disabled = true;
    el['time-picker'].setAttribute('aria-busy', 'true');
    el.dates.replaceChildren(); el.times.replaceChildren();
    try {
      let after = null;
      const loaded = [];
      // The server exposes a 60-day horizon in at most three 21-day pages.
      for (let page = 0; page < 3; page++) {
        const result = await request(`/api/slots?type=${encodeURIComponent(slug)}${after ? `&after=${after}` : ''}`);
        if (generation !== requestGeneration) return;
        loaded.push(...(result.slots || []));
        after = result.nextDate;
        if (!after) break;
      }
      slots = [...new Set(loaded)].sort();
      selectedDate = slots.length ? localDay(slots[0]) : '';
      setCalendarBounds();
      el['availability-status'].textContent = !enabled
        ? 'Online booking is being prepared. Email Landon to schedule.'
        : slots.length ? '' : 'No open times in the next 60 days. Email Landon to arrange a time.';
      renderCalendar();
    } catch (error) {
      el['availability-status'].textContent = `${error.message} Email Landon to schedule.`;
      setCalendarBounds();
      renderCalendar();
    } finally {
      if (generation === requestGeneration) {
        delete el['availability-status'].dataset.loading;
        el['time-picker'].removeAttribute('aria-busy');
      }
    }
  }

  function changeMonth(offset) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    month = date.toISOString().slice(0, 7);
    const firstOpen = slots.find(slot => localDay(slot).startsWith(month));
    selectedDate = firstOpen ? localDay(firstOpen) : '';
    selectedSlot = '';
    renderCalendar();
  }

  el['previous-month'].addEventListener('click', () => changeMonth(-1));
  el['next-month'].addEventListener('click', () => changeMonth(1));
  el['change-time'].addEventListener('click', () => { if (!submitting) showTimePicker(true); });
  el.timezone.addEventListener('change', () => {
    zone = el.timezone.value;
    selectedDate = slots.length ? localDay(slots[0]) : '';
    selectedSlot = ''; month = '';
    setCalendarBounds(); renderCalendar();
  });

  el['booking-form'].addEventListener('submit', async event => {
    event.preventDefault();
    if (!selectedSlot || !enabled || submitting) return;
    const form = new FormData(el['booking-form']);
    const verificationToken = recaptchaSiteKey && recaptchaWidget !== null
      ? window.grecaptcha.getResponse(recaptchaWidget) : '';
    if (recaptchaSiteKey && !verificationToken) {
      el['form-status'].textContent = 'Please complete the verification below, then confirm your meeting.';
      return;
    }
    submitting = true;
    el.submit.disabled = true;
    el['change-time'].disabled = true;
    el['form-status'].textContent = 'Confirming your meeting…';
    try {
      const result = await request('/api/book', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: selectedType, start: selectedSlot, bookingKey,
          name: String(form.get('name') || '').trim(), email: String(form.get('email') || '').trim(),
          notes: String(form.get('notes') || '').trim(), website: String(form.get('website') || ''), verificationToken })
      });
      if (result.booked !== true) throw new Error('The meeting could not be confirmed. Please retry or email Landon.');
      el['booking-ui'].hidden = true;
      el.confirmation.hidden = false;
      summary(el['confirmation-time'], result.start || selectedSlot);
      el['confirmation-email'].textContent = `Your calendar invitation is being sent to ${String(form.get('email') || '').trim()}.`;
      el.confirmation.focus();
    } catch (error) {
      if (recaptchaWidget !== null) window.grecaptcha.reset(recaptchaWidget);
      if (error.status === 409 && /no longer available/i.test(error.message)) {
        await selectType(selectedType, true);
        el['availability-status'].textContent = 'That time was just booked. Please choose another. Your details have been saved.';
      } else {
        el['form-status'].textContent = /timeout|abort/i.test(error.name || '')
          ? 'The confirmation is taking longer than expected. Retry here to safely check your booking, or email Landon.' : error.message;
      }
    } finally {
      submitting = false;
      el.submit.disabled = false;
      el['change-time'].disabled = false;
    }
  });

  async function init() {
    el.year.textContent = String(new Date().getFullYear());
    const zones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['America/Chicago', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'UTC'];
    for (const value of [...new Set([zone, ...zones])]) {
      const option = document.createElement('option'); option.value = value;
      option.textContent = value.replaceAll('_', ' '); el.timezone.append(option);
    }
    el.timezone.value = zone;
    renderWeekdays();
    try {
      if (!api || api.includes('example.invalid')) throw new Error('Online booking is being prepared.');
      const config = await request('/api/config');
      types = config.types || {}; enabled = Boolean(config.enabled); recaptchaSiteKey = config.recaptchaSiteKey || '';
      const choices = Object.keys(types);
      if (!choices.length) throw new Error('No meetings are available.');
      el.loading.hidden = true; el['booking-ui'].hidden = false;
      const preferred = new URLSearchParams(location.search).get('type');
      await selectType(types[preferred] ? preferred : choices[0]);
    } catch (error) { showError(error.message); }
  }
  init();
})();
