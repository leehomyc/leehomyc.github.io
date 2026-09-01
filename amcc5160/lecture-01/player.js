(() => {
  const lectureVideo = document.querySelector('.video-section video');
  const image = document.getElementById('slide-image');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const transcriptToggle = document.getElementById('transcript-toggle');
  const transcriptPanel = document.getElementById('transcript-panel');
  const slideStrip = document.getElementById('slide-strip');
  const videoSectionTrack = document.getElementById('video-section-track');
  const videoSectionTitle = document.getElementById('video-section-title');
  const videoSectionTime = document.getElementById('video-section-time');
  let lecture;
  let videoTimeline;
  let videoChapters = [];
  let activeVideoChapter = -1;
  let current = 0;

  function setInitialPlaybackRate() {
    if (!lectureVideo) return;
    lectureVideo.defaultPlaybackRate = .8;
    lectureVideo.playbackRate = .8;
  }

  function showDefaultCaptions() {
    if (!lectureVideo?.textTracks?.length) return;
    [...lectureVideo.textTracks].forEach(track => {
      track.mode = track.label === 'English + 中文' ? 'showing' : 'disabled';
    });
  }

  lectureVideo?.addEventListener('loadedmetadata', showDefaultCaptions, { once: true });
  lectureVideo?.addEventListener('loadedmetadata', setInitialPlaybackRate, { once: true });
  showDefaultCaptions();
  setInitialPlaybackRate();

  const pad = value => String(value).padStart(3, '0');

  const clock = seconds => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(value / 60);
    const remainder = value % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  };

  function updateVideoSectionBar() {
    if (!lectureVideo || !videoChapters.length) return;
    const time = lectureVideo.currentTime || 0;
    const chapterIndex = [...videoChapters].reverse().findIndex(chapter => time >= chapter.start);
    const activeIndex = chapterIndex < 0 ? 0 : videoChapters.length - 1 - chapterIndex;
    const activeChapter = videoChapters[activeIndex];
    const progress = Math.max(0, Math.min(1, (time - activeChapter.start) / Math.max(.1, activeChapter.end - activeChapter.start)));
    videoSectionTitle.textContent = activeChapter.title;
    videoSectionTime.textContent = `${clock(time)} / ${clock(lectureVideo.duration || videoTimeline?.totalSeconds)}`;
    [...videoSectionTrack.children].forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle('active', isActive);
      button.classList.toggle('complete', index < activeIndex);
      button.setAttribute('aria-current', isActive ? 'true' : 'false');
      button.style.setProperty('--section-progress', isActive ? `${progress * 100}%` : '0%');
    });
    if (activeIndex !== activeVideoChapter) {
      activeVideoChapter = activeIndex;
      const activeButton = videoSectionTrack.children[activeIndex];
      if (activeButton) {
        videoSectionTrack.scrollTo({
          left: activeButton.offsetLeft - (videoSectionTrack.clientWidth - activeButton.clientWidth) / 2,
          behavior: 'smooth',
        });
      }
    }
  }

  function buildVideoSectionBar() {
    if (!lecture || !videoSectionTrack) return;
    videoSectionTrack.replaceChildren();
    activeVideoChapter = -1;
    videoChapters = lecture.sections.map((section, index) => {
      const nextSection = lecture.sections[index + 1];
      const measuredStart = videoTimeline?.slides?.[section.start - 1]?.start;
      const measuredEnd = nextSection
        ? videoTimeline?.slides?.[nextSection.start - 1]?.start
        : videoTimeline?.totalSeconds;
      const duration = lectureVideo?.duration || videoTimeline?.totalSeconds || 0;
      const start = Number.isFinite(measuredStart) ? measuredStart : duration * (section.start - 1) / lecture.slideCount;
      const end = Number.isFinite(measuredEnd) ? measuredEnd : duration * ((nextSection?.start || lecture.slideCount + 1) - 1) / lecture.slideCount;
      return { ...section, start, end };
    });
    videoChapters.forEach(chapter => {
      const button = document.createElement('button');
      button.type = 'button';
      const number = document.createElement('span');
      number.textContent = chapter.number;
      const title = document.createElement('strong');
      title.textContent = chapter.title;
      button.append(number, title);
      button.title = `${chapter.title} · ${clock(chapter.start)}`;
      button.setAttribute('aria-label', `Jump to ${chapter.title} at ${clock(chapter.start)}`);
      button.addEventListener('click', () => {
        lectureVideo.currentTime = chapter.start;
        updateVideoSectionBar();
      });
      videoSectionTrack.appendChild(button);
    });
    updateVideoSectionBar();
  }

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
    const sectionIndex = lecture.sections.findIndex(item => item.start === section?.start);
    [...slideStrip.children].forEach((button, buttonIndex) => {
      const isActive = buttonIndex === sectionIndex;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
    slideStrip.children[sectionIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

    history.replaceState(null, '', `#slide-${pad(slideNumber)}`);
    if (scrollTranscript) image.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  Promise.all([
    fetch('./lecture_content.json').then(response => {
      if (!response.ok) throw new Error('Lecture content unavailable');
      return response.json();
    }),
    fetch('./audio/audio_timing_102.json').then(response => response.ok ? response.json() : null).catch(() => null),
  ])
    .then(([data, timing]) => {
      lecture = data;
      videoTimeline = timing;
      buildVideoSectionBar();
      lecture.sections.forEach((section, index) => {
        const nextSection = lecture.sections[index + 1];
        const lastSlide = nextSection ? nextSection.start - 1 : lecture.slideCount;
        const button = document.createElement('button');
        button.type = 'button';
        const number = document.createElement('span');
        number.textContent = section.number;
        const title = document.createElement('strong');
        title.textContent = section.title;
        const range = document.createElement('small');
        range.textContent = `Slides ${pad(section.start)}–${pad(lastSlide)}`;
        button.append(number, title, range);
        button.title = `${section.title}, slides ${section.start} to ${lastSlide}`;
        button.setAttribute('aria-label', `${section.title}, slides ${section.start} to ${lastSlide}`);
        button.addEventListener('click', () => render(section.start - 1, true));
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
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeking', 'seeked'].forEach(eventName => {
    lectureVideo?.addEventListener(eventName, updateVideoSectionBar);
  });
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
