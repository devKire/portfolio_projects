export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const editable = target.closest(
    [
      'input',
      'textarea',
      'select',
      '[contenteditable=""]',
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[data-editor]',
      '[data-markdown-editor]',
    ].join(',')
  );

  return Boolean(editable);
}

export function hasKeyboardScope(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLElement &&
    target.closest('[data-keyboard-scope]')
  ) {
    return true;
  }

  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[data-keyboard-scope]'));
}
