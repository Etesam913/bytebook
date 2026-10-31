# Pierre trees patch

`@pierre/trees@1.0.0-beta.6` has two local changes:

- `setItemHeight` updates the mounted tree when Bytebook's sidebar zoom changes,
  without replacing the tree model and losing its interaction state.
- The viewport update still bounds the virtual layout's scroll position, but
  no longer writes the computed bound back to the scroll element. This avoids
  an immediate programmatic scroll when the visible row count or measured
  viewport changes. The browser still clamps scrolling to the actual content.
  The original patch did not record a reproduction, so its original triggering
  workflow remains unverified.
