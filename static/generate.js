import { state } from './state.js';
import { api, escapeHtml, extractTitle } from './utils.js';

const generateModal     = document.getElementById('generateModal');
const generateError     = document.getElementById('generateError');
const generateSubmitBtn = document.getElementById('generateSubmitBtn');
const generatePrompt    = document.getElementById('generatePrompt');
const templateSelect    = document.getElementById('templateSelect');
const modelSelect       = document.getElementById('modelSelect');
const noteTitle         = document.getElementById('noteTitle');
const noteTitleInput    = document.getElementById('noteTitleInput');
const noteEditor        = document.getElementById('noteEditor');

export async function openGenerateModal() {
  const tmplList = await api('/api/templates');
  templateSelect.innerHTML = '<option value="">テンプレートを選択...</option>' +
    tmplList.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  generatePrompt.value = '';
  generateError.classList.add('hidden');
  state.generateCancelled = false;
  generateModal.classList.remove('hidden');
  generatePrompt.focus();
}

export function closeGenerateModal() {
  state.generateCancelled = true;
  generateModal.classList.add('hidden');
  generateSubmitBtn.textContent = '生成する';
  generateSubmitBtn.disabled = false;
}

export async function submitGenerate(onSuccess) {
  const templateId = Number(templateSelect.value);
  const prompt = generatePrompt.value.trim();

  if (!templateId) { showGenerateError('テンプレートを選択してください'); return; }
  if (!prompt) { showGenerateError('トピックを入力してください'); return; }

  generateSubmitBtn.disabled = true;
  generateError.classList.add('hidden');
  state.generateCancelled = false;

  const MAX_RETRIES = 20;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (state.generateCancelled) return;
    generateSubmitBtn.textContent = attempt === 1 ? '生成中...' : `リトライ中... (${attempt}/${MAX_RETRIES})`;

    try {
      const { content, format_type } = await api('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId, prompt, model: modelSelect.value }),
      });

      if (state.generateCancelled) return;

      const title = extractTitle(content);
      const updated = await api(`/api/notes/${state.selectedNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content, title, format_type }),
      });

      state.selectedNote = { ...updated, tags: state.selectedNote.tags };
      noteTitle.textContent = updated.title;
      noteTitleInput.value = updated.title;
      noteEditor.value = content;
      const idx = state.notes.findIndex(n => n.id === updated.id);
      if (idx !== -1) state.notes[idx] = updated;

      generateSubmitBtn.textContent = '生成する';
      generateSubmitBtn.disabled = false;
      closeGenerateModal();
      onSuccess();
      return;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (state.generateCancelled) return;
  showGenerateError(`生成に失敗しました（${MAX_RETRIES}回試行）: ${lastError.message}`);
  generateSubmitBtn.textContent = '生成する';
  generateSubmitBtn.disabled = false;
}

function showGenerateError(msg) {
  generateError.textContent = msg;
  generateError.classList.remove('hidden');
}
