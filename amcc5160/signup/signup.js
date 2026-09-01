(() => {
  'use strict';

  const API_URL = window.AMCC5160_SIGNUP_API || '';
  const weeklySessions = [
    ['02', 'Sep 8'], ['03', 'Sep 15'], ['04', 'Sep 22'], ['05', 'Sep 29'], ['06', 'Oct 6'],
    ['07', 'Oct 13'], ['08', 'Oct 20'], ['09', 'Oct 27'], ['10', 'Nov 3'], ['11', 'Nov 10']
  ].map(([week, date]) => ({ id: `weekly-${week}`, type: 'weekly', eyebrow: `Week ${week}`, title: date, slotCount: 5 }));
  const finalSessions = [
    { id: 'final-12', type: 'final', eyebrow: 'Final presentations I', title: 'Nov 17', slotCount: 25 },
    { id: 'final-13', type: 'final', eyebrow: 'Final presentations II', title: 'Nov 24', slotCount: 25 }
  ];
  const SLIDES_MARKER = '\n[[SLIDES]]';

  const state = { code: '', type: new URLSearchParams(location.search).get('type') === 'final' ? 'final' : 'weekly', signups: [], selectedSlotId: '' };
  const accessForm = document.getElementById('access-form');
  const bookingArea = document.getElementById('booking-area');
  const bookingCard = document.getElementById('booking-card');
  const bookingForm = document.getElementById('booking-form');
  const manageForm = document.getElementById('manage-form');
  const manageResults = document.getElementById('manage-results');
  const sessionList = document.getElementById('session-list');
  const selectedSlotLabel = document.getElementById('selected-slot-label');
  const statusMessage = document.getElementById('status-message');
  const tabs = [...document.querySelectorAll('.type-tab')];
  let statusTimer;
  let refreshTimer;

  function showStatus(message, kind = '') {
    clearTimeout(statusTimer);
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${kind}`.trim();
    statusTimer = setTimeout(() => { statusMessage.className = 'status-message'; }, 4200);
  }

  async function apiRequest(payload) {
    if (!API_URL) throw new Error('The sign-up service is not connected yet. Please contact the instructor.');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('The sign-up service could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }

  function slotLabel(slotId) {
    const [type, sessionNumber, slotNumber] = slotId.split('-');
    const sessions = type === 'weekly' ? weeklySessions : finalSessions;
    const session = sessions.find(item => item.id.endsWith(sessionNumber));
    return session ? `${session.eyebrow} · ${session.title} · Slot ${Number(slotNumber)}` : slotId;
  }

  function presentationDetails(value) {
    const stored = String(value || '');
    const markerIndex = stored.indexOf(SLIDES_MARKER);
    return markerIndex === -1
      ? { topic: stored, slidesUrl: '' }
      : { topic: stored.slice(0, markerIndex), slidesUrl: stored.slice(markerIndex + SLIDES_MARKER.length) };
  }

  function storedPresentation(topic, slidesUrl) {
    const cleanTopic = String(topic || '').trim();
    const cleanUrl = String(slidesUrl || '').trim();
    if (!cleanUrl) return cleanTopic;
    let parsed;
    try { parsed = new URL(cleanUrl); } catch (_) { throw new Error('Please enter a complete slides link beginning with https://.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Please enter a complete slides link beginning with https://.');
    const stored = `${cleanTopic}${SLIDES_MARKER}${cleanUrl}`;
    if (stored.length > 240) throw new Error('The topic and slides link are a little too long together. Please shorten the topic or use a shorter sharing link.');
    return stored;
  }

  function renderTabs() {
    tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.type === state.type)));
  }

  function renderSessions() {
    renderTabs();
    sessionList.replaceChildren();
    const sessions = state.type === 'weekly' ? weeklySessions : finalSessions;
    const occupied = new Map(state.signups.map(item => [item.slotId, item]));

    sessions.forEach(session => {
      const card = document.createElement('article');
      card.className = 'session-card';

      const heading = document.createElement('div');
      heading.className = 'session-heading';
      const eyebrow = document.createElement('p');
      eyebrow.textContent = session.eyebrow;
      const title = document.createElement('h3');
      title.textContent = session.title;
      const count = document.createElement('span');
      const takenCount = Array.from({ length: session.slotCount }, (_, index) => occupied.has(`${session.id}-${index + 1}`)).filter(Boolean).length;
      const remaining = session.slotCount - takenCount;
      count.className = `capacity-badge${remaining === 0 ? ' full' : ''}`;
      count.innerHTML = remaining === 0 ? '<strong>Full</strong><small>0 slots left</small>' : `<strong>${remaining}</strong><small>${remaining === 1 ? 'slot' : 'slots'} left</small>`;
      heading.append(eyebrow, title, count);

      const grid = document.createElement('div');
      grid.className = 'slot-grid';
      for (let index = 1; index <= session.slotCount; index += 1) {
        const slotId = `${session.id}-${index}`;
        const signup = occupied.get(slotId);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `slot-button${signup ? ' taken' : ''}${state.selectedSlotId === slotId ? ' selected' : ''}`;
        button.disabled = Boolean(signup) && state.selectedSlotId !== slotId;
        button.dataset.slotId = slotId;
        const publicIdentity = signup ? `${signup.familyName} · ID ending ${signup.idLastFour}` : '';
        const details = presentationDetails(signup && signup.topic);
        button.setAttribute('aria-label', signup ? `Slot ${index}, reserved by ${publicIdentity}, topic ${details.topic}` : `Slot ${index}, available`);
        const number = document.createElement('strong');
        number.textContent = `Slot ${index}`;
        const detail = document.createElement('span');
        detail.textContent = signup ? `${signup.familyName} · •••• ${signup.idLastFour}` : 'Available';
        button.append(number, detail);
        if (signup) {
          const topic = document.createElement('span');
          topic.className = 'slot-topic';
          topic.textContent = details.topic;
          button.append(topic);
        }
        if (!signup || state.selectedSlotId === slotId) button.addEventListener('click', () => selectSlot(slotId));
        grid.append(button);
      }
      card.append(heading, grid);
      sessionList.append(card);
    });
  }

  function selectSlot(slotId, existing = null, studentId = '') {
    state.selectedSlotId = slotId;
    document.getElementById('slot-id').value = slotId;
    selectedSlotLabel.textContent = slotLabel(slotId);
    bookingCard.hidden = false;
    if (existing) {
      document.getElementById('student-name').value = existing.fullName || existing.name || '';
      document.getElementById('student-name').placeholder = 'Re-enter your full name';
      document.getElementById('student-id').value = studentId;
      const details = presentationDetails(existing.topic);
      document.getElementById('presentation-topic').value = details.topic;
      document.getElementById('slides-link').value = details.slidesUrl;
      document.querySelector('.primary-submit').textContent = 'Save changes →';
      document.getElementById('booking-title').textContent = 'Update your booking.';
    } else {
      document.querySelector('.primary-submit').textContent = 'Save reservation →';
      document.getElementById('booking-title').textContent = 'Complete your booking.';
    }
    renderSessions();
    bookingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('student-name').focus(), 350);
  }

  function clearSelection() {
    state.selectedSlotId = '';
    document.getElementById('slot-id').value = '';
    bookingCard.hidden = true;
    bookingForm.reset();
    document.getElementById('student-name').placeholder = '';
    document.getElementById('booking-title').textContent = 'Complete your booking.';
    document.querySelector('.primary-submit').textContent = 'Save reservation →';
    renderSessions();
  }

  function renderManageResults(bookings, studentId) {
    manageResults.hidden = false;
    if (!bookings.length) {
      manageResults.innerHTML = '<p class="manage-empty">No reservation was found for that student ID.</p>';
      return;
    }
    manageResults.replaceChildren(...bookings.map(booking => {
      const item = document.createElement('article');
      const copy = document.createElement('div');
      const kind = document.createElement('span');
      kind.textContent = booking.type === 'final' ? 'Final presentation' : 'Weekly presentation';
      const slot = document.createElement('strong');
      slot.textContent = slotLabel(booking.slotId);
      const details = presentationDetails(booking.topic);
      const topic = document.createElement('small');
      topic.textContent = details.topic;
      copy.append(kind, slot, topic);
      if (details.slidesUrl) {
        const slides = document.createElement('a');
        slides.href = details.slidesUrl;
        slides.target = '_blank';
        slides.rel = 'noreferrer';
        slides.textContent = 'Slides added ↗';
        copy.append(slides);
      }
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Change →';
      edit.addEventListener('click', () => {
        state.type = booking.type;
        selectSlot(booking.slotId, booking, studentId);
      });
      item.append(copy, edit);
      return item;
    }));
  }

  async function loadAvailability(quiet = false) {
    if (!quiet) sessionList.innerHTML = '<div class="loading-card">Loading live availability…</div>';
    const result = await apiRequest({ action: 'list', code: state.code });
    state.signups = Array.isArray(result.signups) ? result.signups : [];
    renderSessions();
  }

  accessForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = accessForm.querySelector('button');
    const codeInput = document.getElementById('course-code');
    button.disabled = true;
    button.textContent = 'Checking…';
    try {
      state.code = codeInput.value.trim().toUpperCase();
      await loadAvailability();
      codeInput.value = '';
      bookingArea.hidden = false;
      document.getElementById('access-panel').classList.add('unlocked');
      clearInterval(refreshTimer);
      refreshTimer = setInterval(() => loadAvailability(true).catch(() => {}), 30000);
      showStatus('Slots unlocked.', 'success');
      bookingArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      state.code = '';
      showStatus(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Unlock slots →';
    }
  });

  tabs.forEach(tab => tab.addEventListener('click', () => {
    state.type = tab.dataset.type;
    clearSelection();
  }));

  document.getElementById('refresh-button').addEventListener('click', async () => {
    try { await loadAvailability(); showStatus('Availability refreshed.', 'success'); }
    catch (error) { showStatus(error.message, 'error'); }
  });

  document.getElementById('cancel-selection').addEventListener('click', clearSelection);

  manageForm.addEventListener('submit', async event => {
    event.preventDefault();
    const studentId = document.getElementById('manage-student-id').value.trim();
    const button = manageForm.querySelector('button');
    button.disabled = true;
    button.textContent = 'Finding…';
    try {
      const result = await apiRequest({ action: 'lookup-signups', code: state.code, studentId });
      renderManageResults(result.bookings || [], studentId);
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Find my booking →';
    }
  });

  bookingForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submitButton = bookingForm.querySelector('.primary-submit');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving…';
    try {
      const form = new FormData(bookingForm);
      const topic = storedPresentation(form.get('topic'), form.get('slidesUrl'));
      const result = await apiRequest({
        action: 'signup',
        code: state.code,
        slotId: form.get('slotId'),
        name: form.get('name'),
        studentId: form.get('studentId'),
        topic
      });
      state.signups = result.signups || [];
      clearSelection();
      manageResults.hidden = true;
      manageForm.reset();
      showStatus('Your presentation reservation is saved.', 'success');
      bookingArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      showStatus(error.message, 'error');
      try { await loadAvailability(true); } catch (_) { /* Keep the original error visible. */ }
    } finally {
      submitButton.disabled = false;
      if (!bookingCard.hidden) submitButton.textContent = 'Save reservation →';
    }
  });

  renderTabs();
})();
