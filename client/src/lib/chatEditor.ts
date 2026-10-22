import { qqFaceToken } from './qface';

export const MAX_CHAT_LENGTH = 500;

export function readEditorNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (!(node instanceof HTMLElement)) return '';
  if (node.dataset.qqFaceId) return qqFaceToken(node.dataset.qqFaceId);
  if (node.tagName === 'BR') return '';
  return Array.from(node.childNodes).map(readEditorNode).join('');
}

export function serializeEditorNodes(nodes: Iterable<ChildNode>): string {
  return Array.from(nodes).map(readEditorNode).join('');
}

export function serializeEditorElement(editor: HTMLElement | null): string {
  if (!editor) return '';
  return serializeEditorNodes(editor.childNodes);
}

export function editorHasDraft(editor: HTMLElement): boolean {
  if (editor.querySelector('img[data-qq-face-id]')) return true;
  return Boolean(editor.textContent?.trim());
}

export function getTextBeforeCursorSerialized(editor: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return serializeEditorElement(editor);
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return serializeEditorElement(editor);
  const preRange = document.createRange();
  preRange.selectNodeContents(editor);
  preRange.setEnd(range.startContainer, range.startOffset);
  const container = document.createElement('div');
  container.appendChild(preRange.cloneContents());
  return serializeEditorNodes(container.childNodes);
}

/** @ 提及查询（支持昵称含空格） */
export function getMentionQueryBeforeCursor(editor: HTMLElement): string | null {
  const before = getTextBeforeCursorSerialized(editor);
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return null;
  return before.slice(atIndex + 1);
}

/** 从光标到当前 @ 开头的字符数，用于替换未完成提及 */
export function getActiveMentionDeleteCount(editor: HTMLElement): number {
  const before = getTextBeforeCursorSerialized(editor);
  const atIndex = before.lastIndexOf('@');
  if (atIndex < 0) return 0;
  return before.length - atIndex;
}

/** / 命令查询（行首或空白后触发，类 TG Bot） */
export function getSlashQueryBeforeCursor(editor: HTMLElement): string | null {
  const before = getTextBeforeCursorSerialized(editor);
  const slashIndex = before.lastIndexOf('/');
  if (slashIndex < 0) return null;
  if (slashIndex > 0 && !/\s/.test(before[slashIndex - 1] || '')) return null;
  return before.slice(slashIndex + 1);
}

export function getActiveSlashDeleteCount(editor: HTMLElement): number {
  const before = getTextBeforeCursorSerialized(editor);
  const slashIndex = before.lastIndexOf('/');
  if (slashIndex < 0) return 0;
  if (slashIndex > 0 && !/\s/.test(before[slashIndex - 1] || '')) return 0;
  return before.length - slashIndex;
}

export function editorPlainIncludesAt(editor: HTMLElement): boolean {
  return (editor.innerText || editor.textContent || '').includes('@');
}

export function getSelectedTextLength(editor: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.anchorNode || !editor.contains(selection.anchorNode)) return 0;
  return selection.toString().length;
}
