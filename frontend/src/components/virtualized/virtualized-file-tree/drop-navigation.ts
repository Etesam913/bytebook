// Pierre remaps the tree selection to a dropped item's new path before
// `onDropComplete` runs; navigating on that emission would 404 since the
// backend move hasn't happened yet. `requestNavigation` defers navigation by
// one microtask so `onDropComplete` (same task) can cancel it; the route then
// follows the watcher's rename event, like inline renames do.
export function createDropNavigationGate(navigate: (path: string) => void) {
  let swallowNext = false;
  return {
    requestNavigation(path: string) {
      // The selection emission and onDropComplete fire synchronously in the
      // same task, emission first. Navigating on a later microtask gives
      // onDropComplete a chance to set swallowNext before navigation runs.
      queueMicrotask(() => {
        if (swallowNext) return;
        navigate(path);
      });
    },
    swallowPendingNavigation() {
      swallowNext = true;
      // Only swallow navigation queued in this task; re-open the gate after.
      queueMicrotask(() => {
        swallowNext = false;
      });
    },
  };
}
