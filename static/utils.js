export const CATEGORY_LABELS = { memo: 'メモ', idea: 'アイデア', research: '調査' };

export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail ?? ''; } catch {}
    const err = new Error(detail || `API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function extractTitle(content) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : '新しいノート';
}

export function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}
