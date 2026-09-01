(() => {
  'use strict';

  const API_URL = window.AMCC5160_SIGNUP_API || '';
  const form = document.getElementById('quiz-form');
  const submitButton = document.getElementById('submit-quiz');
  const status = document.getElementById('quiz-status');
  const success = document.getElementById('quiz-success');
  let statusTimer;

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

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
    try {
      const result = await submitQuiz({
        action: 'quiz-submit',
        quizId: 'week-01',
        code: data.get('code'),
        name: data.get('name'),
        studentId: data.get('studentId'),
        answers: data.getAll('answer')
      });
      document.getElementById('submitted-at').textContent = `Saved ${new Date(result.submittedAt).toLocaleString()}`;
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      showError(error.message);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Quiz 01 →';
    }
  });
})();
