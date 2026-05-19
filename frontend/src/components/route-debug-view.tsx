import { motion, useDragControls, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useLocation, useRoute, useSearchParams } from 'wouter';
import { ROUTE_PATTERNS } from '../utils/routes';

const MAX_HISTORY = 20;

type RouteEntry = {
  /** ms-since-epoch when the route change was observed. */
  at: number;
  /** wouter pathname at this point. */
  pathname: string;
  /** Stringified search params (e.g. `restore=`), or '' if none. */
  search: string;
};

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const mmm = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${mmm}`;
}

function useRouteHistory(pathname: string, search: string): RouteEntry[] {
  const [history, setHistory] = useState<RouteEntry[]>([]);
  const lastKeyRef = useRef<string | null>(null);

  // Treat wouter's location as an external system: timestamp each change
  // when observed. Date.now() is impure so it must run in an effect.
  useEffect(() => {
    const key = `${pathname}|${search}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    const entry: RouteEntry = { at: Date.now(), pathname, search };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debug-only instrumentation; timestamping is intrinsically effectful
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, [pathname, search]);

  return history;
}

function useMatchedPatternName(): string {
  // Order matters: check more specific patterns before catch-alls.
  const [isRoot] = useRoute(ROUTE_PATTERNS.ROOT);
  const [isKernels] = useRoute(ROUTE_PATTERNS.KERNELS);
  const [isSearch] = useRoute(ROUTE_PATTERNS.SEARCH);
  const [isSavedSearch] = useRoute(ROUTE_PATTERNS.SAVED_SEARCH);
  const [isNotes] = useRoute(ROUTE_PATTERNS.NOTES);
  const [isNotFound] = useRoute(ROUTE_PATTERNS.NOT_FOUND_FALLBACK);

  if (isRoot) return 'ROOT';
  if (isKernels) return 'KERNELS';
  if (isSearch) return 'SEARCH';
  if (isSavedSearch) return 'SAVED_SEARCH';
  if (isNotes) return 'NOTES';
  if (isNotFound) return 'NOT_FOUND_FALLBACK';
  return 'CATCH_ALL';
}

function serializeDebugState({
  pathname,
  search,
  matchedPattern,
  history,
}: {
  pathname: string;
  search: string;
  matchedPattern: string;
  history: readonly RouteEntry[];
}): string {
  const historyLines =
    history.length === 0
      ? '(empty)'
      : history
          .map(
            (entry, i) =>
              `  [${i}] ${formatTime(entry.at)} ${entry.pathname}${
                entry.search ? `?${entry.search}` : ''
              }`
          )
          .join('\n');

  return [
    '=== Route Debug State ===',
    '',
    `pathname: ${pathname}`,
    `search: ${search || '(none)'}`,
    `matched pattern: ${matchedPattern}`,
    '',
    `--- history (newest first, max ${MAX_HISTORY}) ---`,
    historyLines,
  ].join('\n');
}

export function RouteDebugView() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [pathname] = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  const matchedPattern = useMatchedPatternName();
  const history = useRouteHistory(pathname, search);

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

  // Panel rests at bottom-right (bottom-2 right-2), so x=0/y=0 is the resting
  // position. Allow dragging left/up to the opposite edges, minus margin.
  useEffect(() => {
    const MARGIN = 8;
    function updateConstraints() {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      setDragConstraints({
        left: -Math.max(0, window.innerWidth - rect.width - MARGIN * 2),
        right: 0,
        top: -Math.max(0, window.innerHeight - rect.height - MARGIN * 2),
        bottom: 0,
      });
    }
    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [isCollapsed]);

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
      className={`fixed bottom-2 right-2 z-[9999] ${isCollapsed ? 'w-[260px]' : 'w-[480px]'} max-h-[80vh] flex flex-col rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-lg font-mono text-xs overflow-hidden`}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="flex items-center justify-between px-2 py-1 border-b border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 cursor-move select-none touch-none"
      >
        <span className="font-semibold text-xs text-(--accent-color)">
          Route Debug
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const text = serializeDebugState({
                pathname,
                search,
                matchedPattern,
                history,
              });
              navigator.clipboard
                .writeText(text)
                .then(() => toast.success('Route debug state copied'))
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
            <div className="text-zinc-500 dark:text-zinc-400">— current —</div>
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400">
                pathname:
              </span>{' '}
              <span className="text-(--accent-color)">{pathname}</span>
            </div>
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400">search:</span>{' '}
              {search ? search : '(none)'}
            </div>
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">
                matched pattern:
              </span>{' '}
              {matchedPattern}
            </div>
          </section>

          <section className="mt-2">
            <div className="text-zinc-500 dark:text-zinc-400">
              — history (newest first, max {MAX_HISTORY}) —
            </div>
            {history.length === 0 ? (
              <div className="italic text-zinc-500 dark:text-zinc-400">
                (no route changes yet)
              </div>
            ) : (
              <div>
                {history.map((entry, i) => (
                  <div
                    key={`${entry.at}-${i}`}
                    className="flex gap-1 whitespace-nowrap"
                  >
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {formatTime(entry.at)}
                    </span>
                    <span className="truncate text-zinc-800 dark:text-zinc-200">
                      {entry.pathname}
                      {entry.search ? (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          ?{entry.search}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </motion.div>
  );
}
