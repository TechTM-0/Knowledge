import { state } from './state.js';
import { escapeHtml } from './utils.js';

const slideTabs      = document.getElementById('slideTabs');
const slideTabSlide  = document.getElementById('slideTabSlide');
const slideTabCode   = document.getElementById('slideTabCode');
const slideFrame     = document.getElementById('slideFrame');
const slideContainer = document.getElementById('slideContainer');
const noteContent    = document.getElementById('noteContent');

export function buildSlideHtml(jsxCode) {
  const escapedCode = JSON.stringify(jsxCode);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f172a; color: white; font-family: system-ui, sans-serif; height: 100vh; overflow: hidden; }
#root { height: 100vh; }
#error { display: none; padding: 24px; color: #f87171; font-family: monospace; font-size: 13px; white-space: pre-wrap; overflow: auto; height: 100vh; }
</style>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<div id="error"></div>
<script>
(function() {
  var root = document.getElementById('root');
  var errEl = document.getElementById('error');
  function showError(msg) {
    root.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = msg;
  }
  root.textContent = '[1] 起動中...';
  try {
    var jsxCode = ${escapedCode};
    root.textContent = '[2] コンパイル中...';
    var transformed = Babel.transform(jsxCode, { presets: ['react'] }).code;
    root.textContent = '[3] コンポーネント生成中...';
    var factory = new Function('React', 'ReactDOM', transformed + '\\nreturn typeof Slide !== "undefined" ? Slide : null;');
    var SlideComponent = factory(React, ReactDOM);
    if (!SlideComponent) { showError('エラー: Slide が定義されていません'); return; }
    root.textContent = '[4] レンダリング中...';
    ReactDOM.createRoot(root).render(React.createElement(SlideComponent));
  } catch(e) {
    showError('エラー [' + (root.textContent || '?') + ']:\\n' + e.message);
  }
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
  slideContainer.classList.add('hidden');
  slideContainer.style.flex = '';
  slideContainer.style.overflow = '';
}

export function collapseSlide() {
  slideContainer.style.flex = '0 0 0px';
  slideContainer.style.overflow = 'hidden';
}
