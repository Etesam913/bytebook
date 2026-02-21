type MouseLikeEvent = Pick<
  MouseEvent,
  'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>;

export function isRegularMouseClick(event: MouseLikeEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function shouldHandleOutsideSelectionInteraction(
  event: MouseEvent | KeyboardEvent
) {
  if (!(event instanceof MouseEvent)) return false;
  return isRegularMouseClick(event);
}
