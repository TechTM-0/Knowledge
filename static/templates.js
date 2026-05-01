import { state } from './state.js';
import { api, escapeHtml } from './utils.js';

const templateModal     = document.getElementById('templateModal');
const templateList      = document.getElementById('templateList');
const templateFormEmpty = document.getElementById('templateFormEmpty');
const templateForm      = document.getElementById('templateForm');
const tmplName          = document.getElementById('tmplName');
const tmplFormatType    = document.getElementById('tmplFormatType');
const tmplContent       = document.getElementById('tmplContent');
const tmplParamRows     = document.getElementById('tmplParamRows');
const tmplDeleteBtn     = document.getElementById('tmplDeleteBtn');
const tmplError         = document.getElementById('tmplError');

export async function openTemplateModal() {
  state.templates = await api('/api/templates');
  renderTemplateList();
  templateFormEmpty.classList.remove('hidden');
  templateForm.classList.add('hidden');
  templateModal.classList.remove('hidden');
}

export function closeTemplateModal() {
  templateModal.classList.add('hidden');
}

export function renderTemplateList() {
  if (state.templates.length === 0) {
    templateList.innerHTML = '<div class="text-white/30 text-xs text-center py-6">テンプレートなし</div>';
    return;
  }
  templateList.innerHTML = state.templates.map(t => `
    <button
      class="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors ${state.editingTemplate?.id === t.id ? 'bg-white/10 text-white' : ''}"
      data-tid="${t.id}"
    >${escapeHtml(t.name)}<span class="ml-1.5 text-xs text-white/40">${t.format_type}</span></button>
  `).join('');
}

export function openTemplateForm(template) {
  state.editingTemplate = template;
  renderTemplateList();

  tmplName.value = template?.name ?? '';
  tmplFormatType.value = template?.format_type ?? 'article';
  tmplContent.value = template?.content ?? '';
  renderParamsEditor(template?.params ?? {});
  tmplError.classList.add('hidden');
  tmplDeleteBtn.classList.toggle('hidden', !template);

  templateFormEmpty.classList.add('hidden');
  templateForm.classList.remove('hidden');
  tmplName.focus();
}

function renderParamsEditor(params) {
  tmplParamRows.innerHTML = '';
  Object.entries(params).forEach(([k, v]) => addParamRow(k, v));
}

export function addParamRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'flex gap-1.5';
  row.innerHTML = `
    <input type="text" placeholder="キー（例: 枚数）" value="${escapeHtml(key)}"
      class="glass-input px-2 py-1.5 text-xs flex-1" data-param="key">
    <input type="text" placeholder="値（例: 8枚）" value="${escapeHtml(value)}"
      class="glass-input px-2 py-1.5 text-xs flex-1" data-param="val">
    <button class="text-white/40 hover:text-red-400 text-lg leading-none px-1" data-remove>×</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  tmplParamRows.appendChild(row);
}

export function collectParams() {
  const params = {};
  Array.from(tmplParamRows.children).forEach(row => {
    const key = row.querySelector('[data-param="key"]')?.value.trim();
    const val = row.querySelector('[data-param="val"]')?.value.trim();
    if (key) params[key] = val ?? '';
  });
  return params;
}

export async function saveTemplate() {
  const name = tmplName.value.trim();
  if (!name) { showTmplError('テンプレート名を入力してください'); return; }

  const body = {
    name,
    format_type: tmplFormatType.value,
    content: tmplContent.value,
    params: collectParams(),
  };

  try {
    let savedId;
    if (state.editingTemplate) {
      await api(`/api/templates/${state.editingTemplate.id}`, { method: 'PUT', body: JSON.stringify(body) });
      savedId = state.editingTemplate.id;
    } else {
      const created = await api('/api/templates', { method: 'POST', body: JSON.stringify(body) });
      savedId = created.id;
    }
    state.templates = await api('/api/templates');
    state.editingTemplate = state.templates.find(t => t.id === savedId) ?? null;
    renderTemplateList();
    tmplError.classList.add('hidden');
  } catch (e) {
    showTmplError(`保存に失敗しました: ${e.message}`);
  }
}

export async function deleteTemplateItem() {
  if (!state.editingTemplate) return;
  await api(`/api/templates/${state.editingTemplate.id}`, { method: 'DELETE' });
  state.templates = await api('/api/templates');
  state.editingTemplate = null;
  renderTemplateList();
  templateFormEmpty.classList.remove('hidden');
  templateForm.classList.add('hidden');
}

function showTmplError(msg) {
  tmplError.textContent = msg;
  tmplError.classList.remove('hidden');
}
