// Prevents the browser's default backspace-to-navigate-back behavior when focus is outside an editable element.
export function disableBackspaceNavigation() {
  document.addEventListener('keydown', (e) => {
    // `document.activeElement` stops at a shadow host (e.g. the @pierre/trees
    // file tree), which would misreport its inner rename/search inputs as
    // non-editable — descend into shadow roots to find the real target.
    let activeElement = document.activeElement;
    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }
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
