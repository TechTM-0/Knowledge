import { state } from './state.js';
import { escapeHtml } from './utils.js';

const slideTabs      = document.getElementById('slideTabs');
const slideTabSlide  = document.getElementById('slideTabSlide');
const slideTabCode   = document.getElementById('slideTabCode');
const slideFrame     = document.getElementById('slideFrame');
const slideContainer = document.getElementById('slideContainer');
const noteContent    = document.getElementById('noteContent');

export function buildSlideHtml(htmlContent) {
  const escapedContent = JSON.stringify(htmlContent);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0f172a 100%); color: #f1f5f9; font-family: system-ui, sans-serif; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
#slides { flex: 1; min-height: 0; overflow-y: auto; padding: 32px; }
.slide { display: none; }
.slide.active { display: block; }
#nav { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 5px 32px; background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.08); }
#nav button { padding: 2px 10px; background: rgba(99,102,241,0.35); color: #e0e7ff; border: 1px solid rgba(165,180,252,0.30); border-radius: 9px; cursor: pointer; font-size: 0.75em; line-height: 1.6; }
#nav button:disabled { opacity: 0.4; cursor: default; }
#counter { color: rgba(255,255,255,0.4); font-size: 0.75em; }
</style>
</head>
<body>
<div id="slides"></div>
<div id="nav">
  <button id="prevBtn">← prev</button>
  <span id="counter"></span>
  <button id="nextBtn">next →</button>
</div>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
(function() {
  var container = document.getElementById('slides');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var counter = document.getElementById('counter');
  var idx = 0;

  var tmp = document.createElement('div');
  tmp.innerHTML = ${escapedContent};
  var slideEls = Array.from(tmp.querySelectorAll('[data-slide]'));
  if (slideEls.length === 0) {
    container.innerHTML = '<div style="color:#f87171;padding:24px;font-family:monospace;white-space:pre-wrap">[data-slide] 要素が見つかりません。\\nテンプレートを確認してください。</div>';
    return;
  }

  slideEls.forEach(function(s) {
    s.classList.add('slide');
    container.appendChild(s);
  });

  var slides = container.querySelectorAll('.slide');

  function update() {
    slides.forEach(function(s, i) { s.classList.toggle('active', i === idx); });
    counter.textContent = (idx + 1) + ' / ' + slides.length;
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === slides.length - 1;
  }

  prevBtn.addEventListener('click', function() { if (idx > 0) { idx--; update(); } });
  nextBtn.addEventListener('click', function() { if (idx < slides.length - 1) { idx++; update(); } });

  renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  });

  update();
})();
</script>
</body>
</html>`;
}

export function showSlideTab(tab) {
  state.slideViewTab = tab;
  slideTabSlide.classList.toggle('tag--active', tab === 'slide');
  slideTabCode.classList.toggle('tag--active', tab === 'code');

  if (tab === 'slide') {
    noteContent.classList.add('hidden');
    slideContainer.style.flex = '';
    slideContainer.style.overflow = '';
  } else {
    // display:none を避け flex で潰す（iframe の React 初期化を維持するため）
    slideContainer.style.flex = '0 0 0px';
    slideContainer.style.overflow = 'hidden';
    noteContent.classList.remove('hidden');
    noteContent.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;font-size:0.8rem;opacity:0.85;">${escapeHtml(state.selectedNote?.content ?? '')}</pre>`;
  }
}

export function renderSlide() {
  slideTabs.classList.remove('hidden');
  slideTabs.classList.add('flex');
  slideContainer.classList.remove('hidden');
  showSlideTab(state.slideViewTab);
  requestAnimationFrame(() => {
    const html = buildSlideHtml(state.selectedNote?.content ?? '');
    slideFrame.srcdoc = '';
    requestAnimationFrame(() => {
      slideFrame.srcdoc = html;
    });
  });
}

export function hideSlide() {
  slideTabs.classList.add('hidden');
  slideTabs.classList.remove('flex');
  slideContainer.classList.add('hidden');
  slideContainer.style.flex = '';
  slideContainer.style.overflow = '';
}

export function collapseSlide() {
  slideContainer.style.flex = '0 0 0px';
  slideContainer.style.overflow = 'hidden';
}
