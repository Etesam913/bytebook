type MouseLikeEvent = Pick<
  MouseEvent,
  'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>;

// Returns true if the event is a plain left-click with no modifier keys held.
export function isRegularMouseClick(event: MouseLikeEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
