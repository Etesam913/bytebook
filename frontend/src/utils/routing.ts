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
