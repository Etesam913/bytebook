import {
  useFilePathFromRoute,
  useFolderPathFromRoute,
} from '../../../../hooks/routes';

/**
 * The current `/notes/*` route target in @pierre/trees' path convention:
 * files are slashless, directories carry a trailing slash. Returns null when
 * the route points at neither a note nor a folder.
 */
export function usePierreRouteTargetPath(): string | null {
  const filePath = useFilePathFromRoute();
  const folderPath = useFolderPathFromRoute();
  if (filePath) return filePath.fullPath;
  if (folderPath) return `${folderPath.fullPath}/`;
  return null;
}
