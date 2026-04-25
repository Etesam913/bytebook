import { useAtomValue } from 'jotai';
import { motion, useDragControls, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  activeDropTargetIdAtom,
  dragHighlightIdsAtom,
  fileTreeDataAtom,
  sidebarSelectionAtom,
} from '../../../atoms';
import { useWailsEvent } from '../../../hooks/events';
import { Folder as FolderIcon } from '../../../icons/folder';
import { Note as NoteIcon } from '../../../icons/page';
import {
  FILE_CREATE,
  FILE_DELETE,
  FILE_RENAME,
  FOLDER_CREATE,
  FOLDER_DELETE,
  FOLDER_RENAME,
} from '../../../utils/events';
import { FILE_TYPE, FOLDER_TYPE, type FileOrFolder } from './types';

const ICON_SIZE = '0.75rem';
const MAX_EVENT_LOG = 10;

type LoggedEvent = {
  /** ms-since-epoch when the event was received. */
  receivedAt: number;
  /** Wails event name (e.g. `file:create`). */
  name: string;
  /** The raw `body.data` payload as captured when the event fired. */
  data: unknown;
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
}

function useFileTreeEventLog(): LoggedEvent[] {
  const [events, setEvents] = useState<LoggedEvent[]>([]);

  function push(name: string, data: unknown) {
    setEvents((prev) =>
      [{ receivedAt: Date.now(), name, data }, ...prev].slice(0, MAX_EVENT_LOG)
    );
  }

  useWailsEvent(FILE_CREATE, (body) => push(FILE_CREATE, body.data));
  useWailsEvent(FILE_DELETE, (body) => push(FILE_DELETE, body.data));
  useWailsEvent(FILE_RENAME, (body) => push(FILE_RENAME, body.data));
  useWailsEvent(FOLDER_CREATE, (body) => push(FOLDER_CREATE, body.data));
  useWailsEvent(FOLDER_DELETE, (body) => push(FOLDER_DELETE, body.data));
  useWailsEvent(FOLDER_RENAME, (body) => push(FOLDER_RENAME, body.data));

  return events;
}

function NodeLine({
  level,
  icon,
  label,
  markers,
}: {
  level: number;
  icon: ReactNode;
  label: ReactNode;
  markers: string[];
}) {
  return (
    <div
      className="flex items-center gap-1 whitespace-nowrap"
      style={{ paddingLeft: `${level * 12}px` }}
    >
      <span className="flex-shrink-0 flex items-center">{icon}</span>
      <span className="truncate">{label}</span>
      {markers.length > 0 && (
        <span className="text-(--accent-color)">[{markers.join(',')}]</span>
      )}
    </div>
  );
}

function renderNodeLines({
  node,
  treeData,
  level,
  highlightIds,
  activeDropTargetId,
  selections,
}: {
  node: FileOrFolder;
  treeData: ReadonlyMap<string, FileOrFolder>;
  level: number;
  highlightIds: ReadonlySet<string>;
  activeDropTargetId: string | null;
  selections: ReadonlySet<string>;
}): ReactNode[] {
  const markers: string[] = [];
  if (selections.has(node.id)) markers.push('SEL');
  if (highlightIds.has(node.id)) markers.push('DRAG');
  if (activeDropTargetId === node.id) markers.push('DROP');
  const shortId = node.id.slice(0, 8);

  if (node.type === FILE_TYPE) {
    return [
      <NodeLine
        key={node.id}
        level={level}
        icon={
          <NoteIcon
            width={ICON_SIZE}
            height={ICON_SIZE}
            className="text-zinc-600 dark:text-zinc-400"
          />
        }
        label={
          <>
            {node.name}{' '}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({shortId})
            </span>
          </>
        }
        markers={markers}
      />,
    ];
  }

  const openMarker = node.isOpen ? '▼' : '▶';
  const childrenInfo = `children=${node.childrenIds.length}${node.hasMoreChildren ? '+more' : ''}`;
  const cursorInfo = node.childrenCursor
    ? ` cursor=${node.childrenCursor.slice(0, 8)}`
    : '';

  const lines: ReactNode[] = [
    <NodeLine
      key={node.id}
      level={level}
      icon={
        <>
          <span className="mr-0.5 text-zinc-500 dark:text-zinc-400">
            {openMarker}
          </span>
          <FolderIcon
            width={ICON_SIZE}
            height={ICON_SIZE}
            className="text-(--accent-color)"
          />
        </>
      }
      label={
        <>
          {node.name}{' '}
          <span className="text-zinc-500 dark:text-zinc-400">
            ({shortId}) [{childrenInfo}
            {cursorInfo}]
          </span>
        </>
      }
      markers={markers}
    />,
  ];

  for (const childId of node.childrenIds) {
    const child = treeData.get(childId);
    if (!child) {
      lines.push(
        <div
          key={`missing-${childId}`}
          className="text-yellow-600 dark:text-yellow-400"
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
        >
          ⚠ missing id={childId.slice(0, 8)}
        </div>
      );
      continue;
    }
    lines.push(
      ...renderNodeLines({
        node: child,
        treeData,
        level: level + 1,
        highlightIds,
        activeDropTargetId,
        selections,
      })
    );
  }
  return lines;
}

function renderTree({
  treeData,
  highlightIds,
  activeDropTargetId,
  selections,
}: {
  treeData: ReadonlyMap<string, FileOrFolder>;
  highlightIds: ReadonlySet<string>;
  activeDropTargetId: string | null;
  selections: ReadonlySet<string>;
}): ReactNode {
  const topLevel: FileOrFolder[] = [];
  for (const node of treeData.values()) {
    if (node.parentId === null) topLevel.push(node);
  }
  topLevel.sort((a, b) => {
    if (a.type === FOLDER_TYPE && b.type === FILE_TYPE) return -1;
    if (a.type === FILE_TYPE && b.type === FOLDER_TYPE) return 1;
    return a.name.localeCompare(b.name);
  });

  if (topLevel.length === 0) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400 italic">
        (empty tree)
      </div>
    );
  }

  return topLevel.flatMap((node) =>
    renderNodeLines({
      node,
      treeData,
      level: 0,
      highlightIds,
      activeDropTargetId,
      selections,
    })
  );
}

function serializeNode({
  node,
  treeData,
  level,
  highlightIds,
  activeDropTargetId,
  selections,
  visited,
}: {
  node: FileOrFolder;
  treeData: ReadonlyMap<string, FileOrFolder>;
  level: number;
  highlightIds: ReadonlySet<string>;
  activeDropTargetId: string | null;
  selections: ReadonlySet<string>;
  visited: Set<string>;
}): string {
  visited.add(node.id);
  const indent = '  '.repeat(level);
  const markers: string[] = [];
  if (selections.has(node.id)) markers.push('SEL');
  if (highlightIds.has(node.id)) markers.push('DRAG');
  if (activeDropTargetId === node.id) markers.push('DROP');
  const markerText = markers.length > 0 ? ` [${markers.join(',')}]` : '';

  if (node.type === FILE_TYPE) {
    return `${indent}- file "${node.name}" id=${node.id} path=${node.path} parentId=${node.parentId ?? 'null'}${markerText}`;
  }

  const header = `${indent}- folder "${node.name}" id=${node.id} path=${node.path} parentId=${node.parentId ?? 'null'} isOpen=${node.isOpen} hasMoreChildren=${node.hasMoreChildren} childrenCursor=${node.childrenCursor ?? 'null'} childrenIds=[${node.childrenIds.join(',')}]${markerText}`;

  const childLines: string[] = [];
  for (const childId of node.childrenIds) {
    const child = treeData.get(childId);
    if (!child) {
      childLines.push(
        `${'  '.repeat(level + 1)}- MISSING id=${childId} (referenced but not in treeData)`
      );
      continue;
    }
    childLines.push(
      serializeNode({
        node: child,
        treeData,
        level: level + 1,
        highlightIds,
        activeDropTargetId,
        selections,
        visited,
      })
    );
  }
  return [header, ...childLines].join('\n');
}

function serializeDebugState({
  treeData,
  filePathToTreeDataId,
  selections,
  anchor,
  highlightIds,
  activeDropTargetId,
  recentEvents,
}: {
  treeData: ReadonlyMap<string, FileOrFolder>;
  filePathToTreeDataId: ReadonlyMap<string, string>;
  selections: ReadonlySet<string>;
  anchor: string | null;
  highlightIds: ReadonlySet<string>;
  activeDropTargetId: string | null;
  recentEvents: readonly LoggedEvent[];
}): string {
  const topLevel: FileOrFolder[] = [];
  for (const node of treeData.values()) {
    if (node.parentId === null) topLevel.push(node);
  }
  topLevel.sort((a, b) => {
    if (a.type === FOLDER_TYPE && b.type === FILE_TYPE) return -1;
    if (a.type === FILE_TYPE && b.type === FOLDER_TYPE) return 1;
    return a.name.localeCompare(b.name);
  });

  const visited = new Set<string>();
  const treeLines =
    topLevel.length === 0
      ? '(empty tree)'
      : topLevel
          .map((node) =>
            serializeNode({
              node,
              treeData,
              level: 0,
              highlightIds,
              activeDropTargetId,
              selections,
              visited,
            })
          )
          .join('\n');

  const filePathLines = [...filePathToTreeDataId.entries()]
    .map(([path, id]) => `  ${path} -> ${id}`)
    .join('\n');

  // --- Consistency checks (high-signal for diagnosing desync) ---
  // 1. Nodes in treeData not reachable from any root via childrenIds.
  const orphanIds: string[] = [];
  for (const id of treeData.keys()) {
    if (!visited.has(id)) orphanIds.push(id);
  }

  // 2. filePathToTreeDataId entries whose id isn't in treeData.
  const danglingPathMappings: string[] = [];
  // 3. treeData nodes whose path isn't indexed by filePathToTreeDataId (or
  //    points to a different id).
  const pathIndexMismatches: string[] = [];

  for (const [path, id] of filePathToTreeDataId.entries()) {
    if (!treeData.has(id)) {
      danglingPathMappings.push(`${path} -> ${id} (id missing in treeData)`);
    }
  }
  for (const node of treeData.values()) {
    const indexedId = filePathToTreeDataId.get(node.path);
    if (indexedId === undefined) {
      pathIndexMismatches.push(
        `node ${node.id} path="${node.path}" not indexed`
      );
    } else if (indexedId !== node.id) {
      pathIndexMismatches.push(
        `node ${node.id} path="${node.path}" indexed to different id ${indexedId}`
      );
    }
  }

  const consistencyLines = [
    `orphan nodes (in treeData but unreachable from roots) (${orphanIds.length}):`,
    orphanIds.length === 0
      ? '  (none)'
      : orphanIds.map((id) => `  ${id}`).join('\n'),
    `dangling filePathToTreeDataId entries (${danglingPathMappings.length}):`,
    danglingPathMappings.length === 0
      ? '  (none)'
      : danglingPathMappings.map((s) => `  ${s}`).join('\n'),
    `treeData ↔ filePathToTreeDataId mismatches (${pathIndexMismatches.length}):`,
    pathIndexMismatches.length === 0
      ? '  (none)'
      : pathIndexMismatches.map((s) => `  ${s}`).join('\n'),
  ].join('\n');

  const eventLines =
    recentEvents.length === 0
      ? '(no events)'
      : recentEvents
          .map(
            (evt, i) =>
              `  [${i}] ${formatTime(evt.receivedAt)} ${evt.name} data=${JSON.stringify(evt.data)}`
          )
          .join('\n');

  return [
    '=== VirtualizedFileTree Debug State ===',
    '',
    `fileTreeDataAtom.treeData.size: ${treeData.size}`,
    `fileTreeDataAtom.filePathToTreeDataId.size: ${filePathToTreeDataId.size}`,
    '',
    `sidebarSelectionAtom.anchorSelection: ${anchor ?? 'null'}`,
    `sidebarSelectionAtom.selections (${selections.size}): [${[...selections].join(',')}]`,
    '',
    `dragHighlightIds (${highlightIds.size}): [${[...highlightIds].join(',')}]`,
    `activeDropTargetId: ${activeDropTargetId ?? 'null'}`,
    '',
    `--- recent events (newest first, max ${MAX_EVENT_LOG}) ---`,
    eventLines,
    '',
    '--- tree ---',
    treeLines,
    '',
    '--- filePathToTreeDataId ---',
    filePathLines || '(empty)',
    '',
    '--- consistency checks ---',
    consistencyLines,
  ].join('\n');
}

export function VirtualizedFileTreeDebugView() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const fileTreeData = useAtomValue(fileTreeDataAtom);
  const sidebarSelection = useAtomValue(sidebarSelectionAtom);
  const dragHighlightIds = useAtomValue(dragHighlightIdsAtom);
  const activeDropTargetId = useAtomValue(activeDropTargetIdAtom);
  const recentEvents = useFileTreeEventLog();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragConstraints, setDragConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  // Clamp dragging to the viewport. Panel is fixed at bottom-left (bottom-2
  // left-2), so x=0/y=0 is the resting position. Allowed range goes right/up
  // to the opposite edges, minus the 8px margin we want to preserve.
  useEffect(() => {
    const MARGIN = 8;
    function updateConstraints() {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setDragConstraints({
        left: 0,
        right: Math.max(0, window.innerWidth - rect.width - MARGIN * 2),
        top: -Math.max(0, window.innerHeight - rect.height - MARGIN * 2),
        bottom: 0,
      });
    }
    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isCollapsed]);

  const treeContent = renderTree({
    treeData: fileTreeData.treeData,
    highlightIds: dragHighlightIds,
    activeDropTargetId,
    selections: sidebarSelection.selections,
  });

  const totalNodes = fileTreeData.treeData.size;
  const pathMapSize = fileTreeData.filePathToTreeDataId.size;
  const selectionList = [...sidebarSelection.selections];
  const anchor = sidebarSelection.anchorSelection;

  return (
    <motion.div
      ref={panelRef}
      drag
      dragMomentum={false}
      dragListener={false}
      dragControls={dragControls}
      dragElastic={0}
      dragConstraints={dragConstraints}
      style={{ x: dragX, y: dragY }}
      className={`fixed bottom-2 left-2 z-[9999] ${isCollapsed ? 'w-[240px]' : 'w-[560px]'} max-h-[80vh] flex flex-col rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-lg font-mono text-xs overflow-hidden`}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex items-center justify-between px-2 py-1 border-b border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 cursor-move select-none touch-none"
      >
        <span className="font-semibold text-xs text-(--accent-color)">
          FileTree Debug
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const text = serializeDebugState({
                treeData: fileTreeData.treeData,
                filePathToTreeDataId: fileTreeData.filePathToTreeDataId,
                selections: sidebarSelection.selections,
                anchor: sidebarSelection.anchorSelection,
                highlightIds: dragHighlightIds,
                activeDropTargetId,
                recentEvents,
              });
              navigator.clipboard
                .writeText(text)
                .then(() => toast.success('Debug state copied to clipboard'))
                .catch((e: unknown) =>
                  toast.error(
                    `Failed to copy: ${e instanceof Error ? e.message : String(e)}`
                  )
                );
            }}
            className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-650 dark:hover:bg-zinc-600"
          >
            copy
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed((c) => !c)}
            className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-650 dark:hover:bg-zinc-600"
          >
            {isCollapsed ? 'expand' : 'collapse'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="overflow-auto px-2 py-1.5 leading-[1.15]">
          <section className="mb-1">
            <div className="text-zinc-500 dark:text-zinc-400">
              — fileTreeDataAtom —
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                treeData.size:
              </span>{' '}
              {totalNodes}
              <span className="text-zinc-500 dark:text-zinc-400">
                {' '}
                · filePathToTreeDataId.size:
              </span>{' '}
              {pathMapSize}
            </div>
          </section>

          <section className="mb-1">
            <div className="text-zinc-500 dark:text-zinc-400">
              — sidebarSelectionAtom —
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">anchor:</span>{' '}
              {anchor ? anchor.slice(0, 8) : '(none)'}
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                selections ({selectionList.length}):
              </span>{' '}
              {selectionList.length === 0
                ? '(none)'
                : selectionList.map((s) => s.slice(0, 8)).join(', ')}
            </div>
          </section>

          <section className="mb-1">
            <div className="text-zinc-500 dark:text-zinc-400">
              — drag state —
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                dragHighlightIds ({dragHighlightIds.size}):
              </span>{' '}
              {dragHighlightIds.size === 0
                ? '(none)'
                : [...dragHighlightIds].map((s) => s.slice(0, 8)).join(', ')}
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                activeDropTargetId:
              </span>{' '}
              {activeDropTargetId ? activeDropTargetId.slice(0, 8) : '(none)'}
            </div>
          </section>

          <section className="mb-1">
            <div className="text-zinc-500 dark:text-zinc-400">
              — recent events (newest first, max {MAX_EVENT_LOG}) —
            </div>
            {recentEvents.length === 0 ? (
              <div className="italic text-zinc-500 dark:text-zinc-400">
                (no events yet)
              </div>
            ) : (
              <div>
                {recentEvents.map((evt, i) => (
                  <div
                    key={`${evt.receivedAt}-${i}`}
                    className="flex gap-1 whitespace-nowrap"
                  >
                    <span className="text-(--accent-color)">{evt.name}</span>
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {JSON.stringify(evt.data)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mt-2">
            <div className="text-zinc-500 dark:text-zinc-400">— tree —</div>
            <div className="text-zinc-800 dark:text-zinc-200 leading-tight">
              {treeContent}
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
}
