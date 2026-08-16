if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (!window.location.hash) {
  window.scrollTo(0, 0);
}

document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

document.querySelectorAll('.skill-toggle').forEach(btn => {
  const list = btn.nextElementSibling;
  btn.addEventListener('click', () => {
    const isOpen = list.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });
});

document.querySelectorAll('.article-toggle').forEach(btn => {
  const list = btn.closest('h2').nextElementSibling;
  btn.addEventListener('click', () => {
    const isOpen = list.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
  });
});

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = btn.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.innerHTML;
      btn.innerHTML = '✓';
      setTimeout(() => { btn.innerHTML = original; }, 1500);
    } catch (e) {}
  });
});

document.querySelectorAll('.carousel-wrap').forEach(wrap => {
  const track = wrap.querySelector('.carousel-track');
  const prev = wrap.querySelector('.carousel-btn.prev');
  const next = wrap.querySelector('.carousel-btn.next');
  const scrollByAmount = () => track.querySelector('.carousel-slide').offsetWidth + 16;
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: scrollByAmount(), behavior: 'smooth' }));
});

document.querySelectorAll('.brand-row-wrap').forEach(wrap => {
  const track = wrap.querySelector('.brand-row-tall');
  const prev = wrap.querySelector('.carousel-btn.prev');
  const next = wrap.querySelector('.carousel-btn.next');
  const scrollByAmount = () => (track.querySelector('img')?.offsetWidth || 300) + 20;
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: scrollByAmount(), behavior: 'smooth' }));
});

// Book viewer: turn a masonry gallery into a page-turn reader
document.querySelectorAll('.book-source').forEach(source => {
  const items = [...source.querySelectorAll('img')];
  if (items.length < 2) return;

  const pages = items.map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' }));
  const dimsCache = {};

  function loadDims(src) {
    if (dimsCache[src]) return Promise.resolve(dimsCache[src]);
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const dims = { w: img.naturalWidth || 16, h: img.naturalHeight || 10 };
        dimsCache[src] = dims;
        resolve(dims);
      };
      img.onerror = () => resolve({ w: 16, h: 10 });
      img.src = src;
    });
  }

  const viewer = document.createElement('div');
  viewer.className = 'book-viewer';
  viewer.innerHTML =
    '<button class="book-btn prev" aria-label="Página anterior"><svg class="icon" style="transform:scaleX(-1)"><use href="#icon-arrow-right"></use></svg></button>' +
    '<div class="book-stage">' +
      '<div class="book-img-under"><img alt=""></div>' +
      '<div class="book-flip"><img alt=""></div>' +
      '<button class="media-expand-btn" type="button" aria-label="Ver em tela cheia"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H4a1 1 0 00-1 1v4M16 3h4a1 1 0 011 1v4M8 21H4a1 1 0 01-1-1v-4M16 21h4a1 1 0 001-1v-4"></path></svg></button>' +
    '</div>' +
    '<button class="book-btn next" aria-label="Próxima página"><svg class="icon"><use href="#icon-arrow-right"></use></svg></button>';

  const counter = document.createElement('p');
  counter.className = 'book-counter';

  source.insertAdjacentElement('afterend', counter);
  source.insertAdjacentElement('afterend', viewer);
  source.style.display = 'none';

  const prevBtn = viewer.querySelector('.book-btn.prev');
  const nextBtn = viewer.querySelector('.book-btn.next');
  const stage = viewer.querySelector('.book-stage');
  const underImg = viewer.querySelector('.book-img-under img');
  const flipEl = viewer.querySelector('.book-flip');
  const flipImg = flipEl.querySelector('img');
  const expandBtn = viewer.querySelector('.media-expand-btn');

  let index = 0;
  let animating = false;

  expandBtn.addEventListener('click', () => {
    if (typeof window.openLightbox === 'function') {
      window.openLightbox(pages[index].src, false, pages[index].alt);
    }
  });

  async function render() {
    const dims = await loadDims(pages[index].src);
    stage.style.aspectRatio = `${dims.w} / ${dims.h}`;
    flipImg.src = pages[index].src;
    flipImg.alt = pages[index].alt;
    flipEl.style.transition = 'none';
    flipEl.style.transform = 'translateX(0)';
    void flipEl.offsetWidth;
    flipEl.style.transition = '';
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === pages.length - 1;
    counter.textContent = `Página ${index + 1} de ${pages.length}`;
  }

  function go(direction) {
    if (animating) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    animating = true;
    underImg.src = pages[targetIndex].src;
    underImg.alt = pages[targetIndex].alt;
    flipEl.style.transform = direction > 0 ? 'translateX(-100%)' : 'translateX(100%)';

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      flipEl.removeEventListener('transitionend', finish);
      index = targetIndex;
      render();
      animating = false;
    };
    flipEl.addEventListener('transitionend', finish);
    setTimeout(finish, 550);
  }

  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  render();
});

// Lightbox: click any content image/video to view it enlarged
(() => {
  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.innerHTML = '<button class="lightbox-close" aria-label="Fechar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg></button><div class="lightbox-content"></div>';
  document.body.appendChild(overlay);
  const content = overlay.querySelector('.lightbox-content');
  const closeBtn = overlay.querySelector('.lightbox-close');

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.classList.remove('lightbox-locked');
    content.innerHTML = '';
  }

  function openLightbox(src, isVideo, alt) {
    content.innerHTML = '';
    if (isVideo) {
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      content.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = src;
      img.alt = alt || '';
      content.appendChild(img);
    }
    overlay.classList.add('open');
    document.body.classList.add('lightbox-locked');
  }

  window.openLightbox = openLightbox;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === closeBtn || closeBtn.contains(e.target)) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeLightbox();
  });

  document.querySelectorAll('.masonry-item img, .brand-row img').forEach(img => {
    img.classList.add('zoomable');
    img.addEventListener('click', () => openLightbox(img.currentSrc || img.src, false, img.alt));
  });

  document.querySelectorAll('.carousel-slide').forEach(slide => {
    const media = slide.querySelector('img, video');
    if (!media) return;
    const isVideo = media.tagName === 'VIDEO';
    const figure = slide.querySelector('figure') || slide;
    figure.style.position = 'relative';
    const btn = document.createElement('button');
    btn.className = 'media-expand-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Ampliar');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H4a1 1 0 00-1 1v4M16 3h4a1 1 0 011 1v4M8 21H4a1 1 0 01-1-1v-4M16 21h4a1 1 0 001-1v-4"></path></svg>';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openLightbox(media.currentSrc || media.src, isVideo, media.alt);
    });
    figure.appendChild(btn);
    if (!isVideo) {
      media.classList.add('zoomable');
      media.addEventListener('click', () => openLightbox(media.currentSrc || media.src, false, media.alt));
    }
  });
})();

// Article viewer: open PDFs and Word docs in a popup instead of navigating away
(() => {
  const items = document.querySelectorAll('.article-item[data-ext]');
  if (!items.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'file-overlay';
  overlay.innerHTML = '<div class="file-overlay-inner"><button class="file-overlay-close" aria-label="Fechar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"></line><line x1="19" y1="5" x2="5" y2="19"></line></svg></button><iframe title="Artigo"></iframe></div>';
  document.body.appendChild(overlay);
  const iframe = overlay.querySelector('iframe');
  const closeBtn = overlay.querySelector('.file-overlay-close');

  function closeFile() {
    overlay.classList.remove('open');
    document.body.classList.remove('lightbox-locked');
    iframe.src = 'about:blank';
  }

  items.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const ext = link.getAttribute('data-ext');
      iframe.src = ext === 'pdf'
        ? link.href
        : 'https://docs.google.com/viewer?embedded=true&url=' + encodeURIComponent(link.href);
      overlay.classList.add('open');
      document.body.classList.add('lightbox-locked');
    });
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === closeBtn || closeBtn.contains(e.target)) closeFile();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeFile();
  });
})();
