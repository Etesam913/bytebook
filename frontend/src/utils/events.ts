import { Window } from '@wailsio/runtime';
import { WailsEvent } from '../hooks/events';

// Event name constants — mirrors internal/util/events.go
// Frontend-only events are noted below.

// File events
export const FILE_CREATE = 'file:create';
export const FILE_DELETE = 'file:delete';
export const FILE_RENAME = 'file:rename';
export const FILE_WRITE = 'file:write';

// Folder events
export const FOLDER_RENAME = 'folder:rename';
export const FOLDER_DELETE = 'folder:delete';
export const FOLDER_CREATE = 'folder:create';

// UI events
export const ZOOM_IN = 'zoom:in';
export const ZOOM_OUT = 'zoom:out';
export const ZOOM_RESET = 'zoom:reset';
export const SETTINGS_OPEN = 'settings:open';
export const SEARCH_OPEN = 'search:open';
export const SEARCH_NOTE = 'search:note';
export const FULLSCREEN = 'window:fullscreen';
export const WINDOW_RELOAD = 'window:reload';
export const TOGGLE_SIDEBAR = 'sidebar:toggle';
export const FILE_TREE_CONTENT_DROP = 'file-tree:content-drop';

// Context Menu events

// File watcher events
export const SETTINGS_UPDATE = 'settings:update';
export const TAGS_INDEX_UPDATE = 'tags:index_update';
export const SAVED_SEARCH_UPDATE = 'saved-search:update';

// Kernel/Code events
export const KERNEL_SHUTDOWN_REPLY = 'code:kernel:shutdown_reply';
export const KERNEL_LAUNCH_SUCCESS = 'kernel:launch-success';
export const KERNEL_LAUNCH_ERROR = 'kernel:launch-error';
export const CODE_BLOCK_STREAM = 'code:code-block:stream';
export const CODE_BLOCK_EXECUTE_RESULT = 'code:code-block:execute_result';
export const CODE_BLOCK_DISPLAY_DATA = 'code:code-block:display_data';
export const CODE_BLOCK_EXECUTE_INPUT = 'code:code-block:execute_input';
export const KERNEL_STATUS = 'code:kernel:status';
export const CODE_BLOCK_STATUS = 'code:code-block:status';
export const CODE_BLOCK_IOPUB_ERROR = 'code:code-block:iopub_error';
export const CODE_BLOCK_INPUT_REQUEST = 'code:code-block:input_request';
export const KERNEL_HEARTBEAT = 'code:kernel:heartbeat';

// Frontend-only events (not in events.go)
export const CODE_BLOCK_COMPLETE_REPLY = 'code:code-block:complete_reply';
export const CODE_BLOCK_INSPECT_REPLY = 'code:code-block:inspect_reply';

export async function isEventInCurrentWindow(data: WailsEvent) {
  const windowName = await Window.Name();
  if (windowName !== data.sender) return false;
  return true;
}
