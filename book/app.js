(() => {
  const localApi = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? new URLSearchParams(location.search).get('api') : null;
  const api = localApi || window.DAYTA_BOOKING_API;
  const elements = Object.fromEntries([
    'loading', 'booking-ui', 'confirmation', 'confirmation-time', 'duration', 'meeting-heading',
    'meeting-description', 'type-picker', 'timezone', 'dates', 'more-dates', 'times', 'availability-status',
    'booking-form', 'selection-summary', 'form-status', 'submit'
  ].map(id => [id, document.getElementById(id)]));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone';
  const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const dayNumberFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  let types = {};
  let selectedType = '';
  let slots = [];
  let selectedDate = '';
  let selectedSlot = '';
  let bookingKey = '';
  let enabled = false;
  let requestGeneration = 0;
  let nextDate = null;
  let recaptchaSiteKey = '';
  let recaptchaWidget = null;
  let recaptchaLoader = null;

  function loadRecaptcha() {
    if (!recaptchaSiteKey) return Promise.resolve();
    if (!recaptchaLoader) recaptchaLoader = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Verification could not load. Please refresh and try again.')), 10_000);
      window.daytaRecaptchaReady = () => { clearTimeout(timeout); resolve(); };
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?onload=daytaRecaptchaReady&render=explicit';
      script.async = true;
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Verification could not load. Please refresh and try again.')); };
      document.head.append(script);
    });
    return recaptchaLoader.then(() => {
      if (recaptchaWidget === null) recaptchaWidget = window.grecaptcha.render('recaptcha', { sitekey: recaptchaSiteKey });
      else window.grecaptcha.reset(recaptchaWidget);
    });
  }

  function localDay(iso) {
    const date = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${api}${path}`, { cache: 'no-store', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Booking is unavailable right now.');
    return data;
  }

  function showError(message) {
    elements.loading.innerHTML = '';
    elements.loading.append(document.createTextNode(message));
    const email = document.createElement('p');
    email.innerHTML = '<a href="mailto:landon@daytanalytics.com">Email Landon to schedule</a>';
    elements.loading.append(email);
  }

  function renderTypes() {
    elements['type-picker'].replaceChildren();
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
      elements['type-picker'].append(button);
    }
  }

  function renderDates() {
    const groups = new Map();
    for (const slot of slots) {
      const day = localDay(slot);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(slot);
    }
    elements.dates.replaceChildren();
    elements['more-dates'].hidden = !nextDate;
    for (const [day, daySlots] of groups) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.day = day;
      button.setAttribute('aria-pressed', String(day === selectedDate));
      button.setAttribute('aria-label', dateFormat.format(new Date(daySlots[0])));
      const weekday = document.createElement('span');
      weekday.textContent = weekdayFormat.format(new Date(daySlots[0]));
      const number = document.createElement('strong');
      number.textContent = dayNumberFormat.format(new Date(daySlots[0]));
      button.append(weekday, number);
      button.addEventListener('click', () => selectDate(day));
      elements.dates.append(button);
    }
    if (!groups.size) {
      elements['availability-status'].textContent = nextDate
        ? 'No open times in these dates. Show more dates or email Landon.'
        : 'No open times are listed in the next 60 days. Email Landon to arrange a time.';
      elements.times.replaceChildren();
      elements['booking-form'].hidden = true;
      return;
    }
    if (!groups.has(selectedDate)) selectedDate = groups.keys().next().value;
    renderTimes();
  }

  function renderTimes() {
    for (const button of elements.dates.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.day === selectedDate));
    }
    elements.times.replaceChildren();
    for (const slot of slots.filter(value => localDay(value) === selectedDate)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = timeFormat.format(new Date(slot));
      button.setAttribute('aria-pressed', String(slot === selectedSlot));
      button.addEventListener('click', () => selectSlot(slot));
      elements.times.append(button);
    }
  }

  function selectDate(day) {
    selectedDate = day;
    selectedSlot = '';
    bookingKey = '';
    elements['booking-form'].hidden = true;
    elements['availability-status'].textContent = '';
    renderTimes();
  }

  function selectSlot(slot) {
    if (!enabled) return;
    selectedSlot = slot;
    bookingKey = crypto.randomUUID();
    for (const button of elements.times.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.textContent === timeFormat.format(new Date(slot))));
    }
    elements['selection-summary'].textContent = `${types[selectedType].title} · ${dateFormat.format(new Date(slot))} at ${timeFormat.format(new Date(slot))}`;
    elements['booking-form'].hidden = false;
    elements['form-status'].textContent = '';
    loadRecaptcha().catch(error => { elements['form-status'].textContent = error.message; });
  }

  async function selectType(slug) {
    if (!types[slug]) return;
    selectedType = slug;
    const generation = ++requestGeneration;
    selectedSlot = '';
    selectedDate = '';
    bookingKey = '';
    slots = [];
    nextDate = null;
    const type = types[slug];
    elements.duration.textContent = `${type.minutes} minutes`;
    elements['meeting-heading'].textContent = type.title;
    elements['meeting-description'].textContent = type.description;
    elements['availability-status'].textContent = 'Checking the calendar…';
    elements['booking-form'].hidden = true;
    renderTypes();
    elements.dates.replaceChildren();
    elements.times.replaceChildren();
    try {
      const result = await request(`/api/slots?type=${encodeURIComponent(slug)}`);
      if (generation !== requestGeneration) return;
      slots = result.slots || [];
      nextDate = result.nextDate || null;
      elements['availability-status'].textContent = '';
      renderDates();
    } catch (error) {
      elements['availability-status'].textContent = `${error.message} Email Landon to schedule.`;
    }
  }

  elements['more-dates'].addEventListener('click', async () => {
    if (!nextDate) return;
    const generation = requestGeneration;
    const after = nextDate;
    elements['more-dates'].disabled = true;
    elements['availability-status'].textContent = 'Loading more dates…';
    try {
      const result = await request(`/api/slots?type=${encodeURIComponent(selectedType)}&after=${after}`);
      if (generation !== requestGeneration) return;
      const addedSlots = result.slots || [];
      slots.push(...addedSlots);
      if (addedSlots.length) {
        selectedDate = localDay(addedSlots[0]);
        selectedSlot = '';
        bookingKey = '';
        elements['booking-form'].hidden = true;
      }
      nextDate = result.nextDate || null;
      elements['availability-status'].textContent = '';
      renderDates();
      elements.dates.querySelector('button[aria-pressed="true"]')?.scrollIntoView({ inline: 'start', block: 'nearest' });
    } catch (error) {
      elements['availability-status'].textContent = error.message;
    } finally {
      elements['more-dates'].disabled = false;
    }
  });

  elements['booking-form'].addEventListener('submit', async event => {
    event.preventDefault();
    if (!selectedSlot || !enabled) return;
    const form = new FormData(elements['booking-form']);
    const verificationToken = recaptchaSiteKey && recaptchaWidget !== null
      ? window.grecaptcha.getResponse(recaptchaWidget) : '';
    if (recaptchaSiteKey && !verificationToken) {
      elements['form-status'].textContent = 'Please complete the verification.';
      return;
    }
    const button = elements.submit;
    button.disabled = true;
    elements['form-status'].textContent = 'Booking your meeting…';
    try {
      await request('/api/book', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: selectedType, start: selectedSlot, bookingKey,
          name: String(form.get('name') || '').trim(), email: String(form.get('email') || '').trim(),
          notes: String(form.get('notes') || '').trim(), website: String(form.get('website') || ''), verificationToken
        })
      });
      elements['booking-ui'].hidden = true;
      elements.confirmation.hidden = false;
      elements['confirmation-time'].textContent = `${types[selectedType].title} · ${dateFormat.format(new Date(selectedSlot))} at ${timeFormat.format(new Date(selectedSlot))}`;
      elements.confirmation.focus();
    } catch (error) {
      elements['form-status'].textContent = error.message;
      if (recaptchaWidget !== null) window.grecaptcha.reset(recaptchaWidget);
      if (/no longer available/i.test(error.message)) {
        await selectType(selectedType);
      }
    } finally {
      button.disabled = false;
    }
  });

  async function init() {
    elements.timezone.textContent = zone.replaceAll('_', ' ');
    try {
      if (!api || api.includes('example.invalid')) throw new Error('Online booking is being prepared.');
      const config = await request('/api/config');
      types = config.types || {};
      enabled = Boolean(config.enabled);
      recaptchaSiteKey = config.recaptchaSiteKey || '';
      const choices = Object.keys(types);
      if (!choices.length) throw new Error('No meetings are available.');
      elements.loading.hidden = true;
      elements['booking-ui'].hidden = false;
      if (!enabled) elements['availability-status'].textContent = 'Online booking is being prepared. Email Landon to schedule.';
      const preferred = new URLSearchParams(location.search).get('type');
      await selectType(types[preferred] ? preferred : choices[0]);
      if (!enabled) {
        elements['booking-form'].hidden = true;
        elements['availability-status'].textContent = 'Online booking is being prepared. Email Landon to schedule.';
      }
    } catch (error) {
      showError(error.message);
    }
  }
  init();
})();
