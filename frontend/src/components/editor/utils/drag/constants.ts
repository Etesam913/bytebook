/** Custom MIME type for the key of the Lexical node being dragged. */
export const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';

/** `id` of the editor `contenteditable`. Shared so we don't hardcode in many places. */
export const CONTENT_EDITABLE_ID = 'content-editable-editor';

/** Minimum rendered height for the file-tree drop caret when line metrics are unusable. */
export const MIN_DROP_CARET_HEIGHT = 18;

/** Classname of the drag-handle menu element; used to detect pointer hits. */
export const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

/** Search direction sentinels used by the block-lookup routine. */
export const Downward = 1;
export const Upward = -1;
export const Indeterminate = 0;
