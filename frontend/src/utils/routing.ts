// Prevents the browser's default backspace-to-navigate-back behavior when focus is outside an editable element.
export function disableBackspaceNavigation() {
  document.addEventListener('keydown', (e) => {
    const activeElement = document.activeElement;
    const isEditableElement =
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        ('isContentEditable' in activeElement &&
          activeElement.isContentEditable));

    if (e.key === 'Backspace' && !isEditableElement) {
      e.preventDefault();
    }
  });
}
