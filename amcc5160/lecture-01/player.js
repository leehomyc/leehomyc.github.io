(() => {
  const audio = document.getElementById('lecture-audio');
  const image = document.getElementById('slide-image');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const syncToggle = document.getElementById('sync-toggle');
  const transcriptToggle = document.getElementById('transcript-toggle');
  const transcriptPanel = document.getElementById('transcript-panel');
  const chapterStrip = document.getElementById('chapter-strip');
  let lecture;
  let timing;
  let current = 0;

  const pad = value => String(value).padStart(2, '0');
  const clock = seconds => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  function render(index, seek = false) {
    if (!lecture || !timing) return;
    current = Math.max(0, Math.min(index, lecture.slides.length - 1));
    const slide = lecture.slides[current];
    const chapter = timing.chapters[current];
    image.src = `./slides/slide-${pad(current + 1)}.png`;
    image.alt = `Slide ${current + 1}: ${slide.title}`;
    document.getElementById('now-slide').textContent = `NOW PLAYING · SLIDE ${pad(current + 1)}`;
    document.getElementById('now-title').textContent = chapter.title;
    document.getElementById('transcript-number').textContent = `SLIDE ${pad(current + 1)}`;
    document.getElementById('transcript-title').textContent = slide.title;
    document.getElementById('transcript-duration').textContent = `${slide.duration} min`;
    const subtitle = document.getElementById('transcript-subtitle');
    subtitle.textContent = slide.subtitle || '';
    subtitle.hidden = !slide.subtitle;
    const copy = document.getElementById('transcript-copy');
    copy.replaceChildren(...slide.notes.split('\n\n').map(text => {
      const p = document.createElement('p'); p.textContent = text; return p;
    }));
    document.getElementById('facilitation').textContent = slide.facilitation;
    previous.disabled = current === 0;
    next.disabled = current === lecture.slides.length - 1;
    [...chapterStrip.children].forEach((button, i) => button.classList.toggle('active', i === current));
    if (seek) { audio.currentTime = chapter.start; updateClock(chapter.start); }
  }

  function updateClock(seconds) {
    const total = timing?.totalSeconds || 7200;
    document.getElementById('clock').textContent = `${clock(seconds)} / ${clock(total)}`;
    document.getElementById('progress').style.width = `${Math.min(100, seconds / total * 100)}%`;
  }

  Promise.all([
    fetch('./lecture_content.json').then(r => r.json()),
    fetch('./audio/audio_timing.json').then(r => r.json())
  ]).then(([lectureData, timingData]) => {
    lecture = lectureData; timing = timingData;
    timing.chapters.forEach((chapter, index) => {
      const button = document.createElement('button');
      button.textContent = pad(chapter.slide); button.title = chapter.title;
      button.addEventListener('click', () => render(index, true));
      chapterStrip.appendChild(button);
    });
    render(0);
    updateClock(0);
  }).catch(() => {
    document.getElementById('now-title').textContent = 'Lecture materials could not be loaded.';
  });

  audio.addEventListener('timeupdate', () => {
    updateClock(audio.currentTime);
    if (!syncToggle.checked || !timing || audio.paused) return;
    const index = timing.chapters.findIndex(item => audio.currentTime >= item.start && audio.currentTime < item.end);
    if (index >= 0 && index !== current) render(index);
  });
  previous.addEventListener('click', () => render(current - 1, true));
  next.addEventListener('click', () => render(current + 1, true));
  transcriptToggle.addEventListener('click', () => {
    const hidden = transcriptPanel.hidden;
    transcriptPanel.hidden = !hidden;
    transcriptToggle.textContent = hidden ? 'Hide transcript' : 'Show transcript';
  });
})();
