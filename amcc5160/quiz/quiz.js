(() => {
  'use strict';

  const API_URL = window.AMCC5160_SIGNUP_API || '';
  const form = document.getElementById('quiz-form');
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

  function showError(message) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.add('show');
    statusTimer = setTimeout(() => status.classList.remove('show'), 5200);
  }

  async function submitQuiz(payload) {
    if (!API_URL) throw new Error('The quiz service is not connected. Please contact the instructor.');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!response.ok) throw new Error('The quiz service could not be reached. Please try again.');
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'The quiz could not be submitted.');
    return result;
  }

  function buildPayload() {
    const data = new FormData(form);
    return {
      action: 'quiz-submit',
      quizId: 'week-01',
      code: data.get('code'),
      name: data.get('name'),
      studentId: data.get('studentId'),
      answers: data.getAll('answer')
    };
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
    preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    preview.focus({ preventScroll: true });
  }

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
    confirmButton.textContent = 'Submitting…';
    try {
      const result = await submitQuiz(pendingPayload);
      document.getElementById('submitted-at').textContent = `Saved ${new Date(result.submittedAt).toLocaleString()}`;
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      showError(error.message);
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Confirm and submit Quiz 01 →';
    }
  });
})();
