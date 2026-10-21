import type { FileTreeIconConfig } from '@pierre/trees';
import { renderToStaticMarkup } from 'react-dom/server';
import { Folder } from '@/icons/folder';
import { FolderOpen } from '@/icons/folder-open';
import { Note } from '@/icons/page';
import { ImageIcon } from '@/icons/image';
import { VideoIcon } from '@/icons/video';
import { IMAGE_FILE_EXTENSIONS, VIDEO_FILE_EXTENSIONS } from '@/types';

// Pierre renders SVG symbols inside its shadow root, so reuse the app icons
// as markup and inherit the folder state from each row through CSS variables.
export const FILE_TREE_ICONS: FileTreeIconConfig = {
  set: 'none',
  colored: false,
  spriteSheet: renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      width="0"
      height="0"
    >
      <symbol id="bytebook-tree-folder" viewBox="0 0 18 18">
        <g style={{ display: 'var(--tree-folder-closed, inline)' }}>
          <Folder width="18px" height="18px" />
        </g>
        <g style={{ display: 'var(--tree-folder-open, none)' }}>
          <FolderOpen width="18px" height="18px" />
        </g>
      </symbol>
      <symbol id="bytebook-tree-file" viewBox="0 0 18 18">
        <Note width="18px" height="18px" />
      </symbol>
      <symbol id="bytebook-tree-image" viewBox="0 0 18 18">
        <ImageIcon width="18px" height="18px" />
      </symbol>
      <symbol id="bytebook-tree-video" viewBox="0 0 18 18">
        <VideoIcon width="18px" height="18px" />
      </symbol>
    </svg>
  ),
  byFileExtension: Object.fromEntries<{ name: string; viewBox: string }>([
    ...IMAGE_FILE_EXTENSIONS.map(
      (extension) =>
        [
          extension,
          { name: 'bytebook-tree-image', viewBox: '0 0 18 18' },
        ] as const
    ),
    ...VIDEO_FILE_EXTENSIONS.map(
      (extension) =>
        [
          extension,
          { name: 'bytebook-tree-video', viewBox: '0 0 18 18' },
        ] as const
    ),
  ]),
  remap: {
    'file-tree-icon-chevron': {
      name: 'bytebook-tree-folder',
      viewBox: '0 0 18 18',
    },
    'file-tree-icon-file': {
      name: 'bytebook-tree-file',
      viewBox: '0 0 18 18',
    },
  },
};
