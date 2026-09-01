(() => {
  'use strict';

  const API_URL = window.AMCC5160_SIGNUP_API || '';
  const form = document.getElementById('quiz-form');
  const lookupCard = document.getElementById('quiz-lookup-card');
  const lookupForm = document.getElementById('quiz-lookup-form');
  const lookupResult = document.getElementById('quiz-lookup-result');
  const journeyChoices = [...document.querySelectorAll('.quiz-journey-choice')];
  const preview = document.getElementById('quiz-preview');
  const confirmButton = document.getElementById('confirm-quiz');
  const status = document.getElementById('quiz-status');
  const success = document.getElementById('quiz-success');
  const questionPrompts = [...document.querySelectorAll('.question-card')].map(card => {
    const prompt = card.querySelector('.question-prompt');
    if (prompt) return prompt.textContent.trim();
    const label = card.querySelector('label');
    return [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(' ').trim();
  });
  let statusTimer;
  let pendingPayload = null;
  let isEditing = false;

  function showError(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add('show');
    statusTimer = setTimeout(() => status.classList.remove('show'), 5200);
  }

  async function request(payload) {
    if (!API_URL) throw new Error('The quiz service is not connected. Please contact the instructor.');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('The quiz service could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The quiz request could not be completed.');
    return result;
  }

  function setJourney(journey) {
    journeyChoices.forEach(choice => choice.setAttribute('aria-pressed', String(choice.dataset.quizJourney === journey)));
    preview.hidden = true;
    success.hidden = true;
    pendingPayload = null;
    lookupResult.hidden = true;
    if (journey === 'new') {
      isEditing = false;
      lookupCard.hidden = true;
      form.reset();
      form.hidden = false;
      document.getElementById('identity-kicker').textContent = 'Course access';
      document.getElementById('identity-title').textContent = 'Identify your submission.';
      document.getElementById('identity-copy').textContent = 'Use the access code shared in class. Your full name and student ID are stored with your submission and visible only in the protected instructor dashboard.';
      document.getElementById('preview-quiz').textContent = 'Preview submission →';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => form.elements.code.focus(), 350);
    } else {
      isEditing = false;
      form.hidden = true;
      lookupCard.hidden = false;
      lookupForm.reset();
      lookupCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => lookupForm.elements.code.focus(), 350);
    }
  }

  function populateSubmission(submission, code, studentId) {
    form.reset();
    form.elements.code.value = code;
    form.elements.name.value = submission.name || '';
    form.elements.studentId.value = studentId;
    const answerFields = [...form.querySelectorAll('textarea[name="answer"]')];
    answerFields.forEach((field, index) => { field.value = submission.answers[index] || ''; });
    isEditing = true;
    form.hidden = false;
    document.getElementById('identity-kicker').textContent = 'Current submission retrieved';
    document.getElementById('identity-title').textContent = 'Edit Quiz 01.';
    document.getElementById('identity-copy').textContent = 'These are your current saved answers. Make any changes you need, preview the complete submission, and confirm to replace the current version.';
    document.getElementById('preview-quiz').textContent = 'Preview updated submission →';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildPayload() {
    const data = new FormData(form);
    return { action: 'quiz-submit', quizId: 'week-01', code: data.get('code'), name: data.get('name'), studentId: data.get('studentId'), answers: data.getAll('answer') };
  }

  function showPreview(payload) {
    document.getElementById('preview-name').textContent = payload.name;
    document.getElementById('preview-student-id').textContent = payload.studentId;
    const answers = document.getElementById('preview-answers');
    answers.replaceChildren(...payload.answers.map((answer, index) => {
      const article = document.createElement('article');
      article.className = 'preview-answer';
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const copy = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = questionPrompts[index];
      const response = document.createElement('p');
      response.textContent = answer;
      copy.append(heading, response);
      article.append(number, copy);
      return article;
    }));
    preview.hidden = false;
    document.getElementById('preview-title').textContent = isEditing ? 'Confirm your update.' : 'Confirm your submission.';
    confirmButton.textContent = isEditing ? 'Confirm and update Quiz 01 →' : 'Confirm and submit Quiz 01 →';
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    preview.focus({ preventScroll: true });
  }

  journeyChoices.forEach(choice => choice.addEventListener('click', () => setJourney(choice.dataset.quizJourney)));

  lookupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const button = lookupForm.querySelector('button');
    const code = lookupForm.elements.code.value.trim();
    const studentId = lookupForm.elements.studentId.value.trim();
    button.disabled = true;
    button.textContent = 'Retrieving…';
    lookupResult.hidden = true;
    try {
      const result = await request({ action: 'quiz-lookup', quizId: 'week-01', code, studentId });
      if (!result.submitted) {
        lookupResult.innerHTML = '<p>No Quiz 01 submission was found for that student ID.</p><button type="button">Start a new submission →</button>';
        lookupResult.hidden = false;
        lookupResult.querySelector('button').addEventListener('click', () => setJourney('new'));
        return;
      }
      populateSubmission(result.submission, code, studentId);
    } catch (error) {
      showError(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Retrieve submission →';
    }
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    pendingPayload = buildPayload();
    showPreview(pendingPayload);
  });

  document.getElementById('edit-quiz').addEventListener('click', () => {
    preview.hidden = true;
    pendingPayload = null;
    document.querySelector('.identity-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.addEventListener('input', () => {
    if (!preview.hidden) preview.hidden = true;
    pendingPayload = null;
  });

  confirmButton.addEventListener('click', async () => {
    if (!pendingPayload) {
      showError('Please preview your current answers again before submitting.');
      return;
    }
    confirmButton.disabled = true;
    confirmButton.textContent = 'Saving…';
    try {
      const result = await request(pendingPayload);
      document.getElementById('submitted-at').textContent = `${result.updated ? 'Updated' : 'Saved'} ${new Date(result.submittedAt).toLocaleString()}`;
      form.hidden = true;
      preview.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      showError(error.message);
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = isEditing ? 'Confirm and update Quiz 01 →' : 'Confirm and submit Quiz 01 →';
    }
  });
})();
