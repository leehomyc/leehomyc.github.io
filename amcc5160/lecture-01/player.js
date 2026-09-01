(() => {
  const image = document.getElementById('slide-image');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const transcriptToggle = document.getElementById('transcript-toggle');
  const transcriptPanel = document.getElementById('transcript-panel');
  const slideStrip = document.getElementById('slide-strip');
  let lecture;
  let current = 0;

  const pad = value => String(value).padStart(3, '0');

  function activeSection(index) {
    if (!lecture?.sections?.length) return null;
    return [...lecture.sections].reverse().find(section => index + 1 >= section.start) || lecture.sections[0];
  }

  function renderSources(sources) {
    const container = document.getElementById('transcript-sources');
    container.replaceChildren();
    if (!sources?.length) return;
    const label = document.createElement('strong');
    label.textContent = 'Sources';
    container.appendChild(label);
    sources.forEach((url, index) => {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `Source ${index + 1} ↗`;
      container.appendChild(link);
    });
  }

  function render(index, scrollTranscript = false) {
    if (!lecture) return;
    current = Math.max(0, Math.min(index, lecture.slides.length - 1));
    const slide = lecture.slides[current];
    const section = activeSection(current);
    const slideNumber = current + 1;

    image.src = `./slides102/${slide.image}`;
    image.alt = `Slide ${slideNumber}: ${slide.title}`;
    document.getElementById('now-slide').textContent = `SLIDE ${pad(slideNumber)} OF ${lecture.slideCount}`;
    document.getElementById('now-title').textContent = slide.title;
    document.getElementById('now-section').textContent = section?.title || '';
    document.getElementById('deck-progress-label').textContent = `${slideNumber} / ${lecture.slideCount}`;
    document.getElementById('progress').style.width = `${slideNumber / lecture.slideCount * 100}%`;
    document.getElementById('transcript-number').textContent = `SLIDE ${pad(slideNumber)}`;
    document.getElementById('transcript-title').textContent = slide.title;
    document.getElementById('transcript-duration').textContent = '≈1 minute';

    const subtitle = document.getElementById('transcript-subtitle');
    subtitle.textContent = slide.subtitle || '';
    subtitle.hidden = !slide.subtitle;

    const copy = document.getElementById('transcript-copy');
    copy.replaceChildren(...slide.notes.split('\n\n').filter(Boolean).map(paragraph => {
      const p = document.createElement('p');
      p.textContent = paragraph;
      return p;
    }));
    renderSources(slide.sources);

    previous.disabled = current === 0;
    next.disabled = current === lecture.slides.length - 1;
    [...slideStrip.children].forEach((button, buttonIndex) => {
      button.classList.toggle('active', buttonIndex === current);
      button.setAttribute('aria-current', buttonIndex === current ? 'page' : 'false');
    });
    slideStrip.children[current]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    history.replaceState(null, '', `#slide-${pad(slideNumber)}`);
    if (scrollTranscript) image.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  fetch('./lecture_content.json')
    .then(response => {
      if (!response.ok) throw new Error('Lecture content unavailable');
      return response.json();
    })
    .then(data => {
      lecture = data;
      lecture.slides.forEach((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = pad(index + 1);
        button.title = slide.title;
        button.setAttribute('aria-label', `Slide ${index + 1}: ${slide.title}`);
        button.addEventListener('click', () => render(index, true));
        slideStrip.appendChild(button);
      });
      const match = location.hash.match(/slide-(\d+)/);
      const start = match ? Number(match[1]) - 1 : 0;
      render(Number.isFinite(start) ? start : 0);
    })
    .catch(() => {
      document.getElementById('now-title').textContent = 'Lecture materials could not be loaded.';
    });

  previous.addEventListener('click', () => render(current - 1));
  next.addEventListener('click', () => render(current + 1));
  transcriptToggle.addEventListener('click', () => {
    const hidden = transcriptPanel.hidden;
    transcriptPanel.hidden = !hidden;
    transcriptToggle.setAttribute('aria-expanded', String(hidden));
    transcriptToggle.textContent = hidden ? 'Hide transcript' : 'Show transcript';
  });

  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowLeft') render(current - 1);
    if (event.key === 'ArrowRight' || event.key === ' ') {
      if (event.key === ' ') event.preventDefault();
      render(current + 1);
    }
    if (event.key === 'Home') render(0);
    if (event.key === 'End' && lecture) render(lecture.slides.length - 1);
  });
})();
