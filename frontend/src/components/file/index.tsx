import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect } from 'react';
import { Loader } from '../../icons/loader';
import type { FileType } from '../editor/nodes/file';
import { getFileElementTypeFromExtensionAndHead } from '../editor/utils/file-node';
import { FileError } from './error';
import { Image } from './image';
import { Pdf } from './pdf';
import { Video } from './video';
import {
  GlobalFilePath,
  LocalFilePath,
  Path,
} from '../../utils/string-formatting';
import { FileDimensions } from '../editor/nodes/types';

function constructPathFromSrc(src: string): Path {
  if (src.startsWith('wails://')) {
    const segments = src.split('/');
    if (segments.length < 3) {
      throw new Error(`Invalid wails:// URL: ${src}`);
    }
    return new LocalFilePath({
      folder: segments[1],
      note: segments[2],
    });
  }
  return new GlobalFilePath({ url: src });
}

export function File({
  src,
  dimensionsWrittenToNode,
  writeDimensionsToNode,
  title,
  nodeKey,
  setElementType,
}: {
  src: string;
  dimensionsWrittenToNode: FileDimensions;
  writeDimensionsToNode: (dimensions: FileDimensions) => void;
  title: string;
  nodeKey: string;
  setElementType: (elementType: FileType) => void;
}) {
  const { data: fileType, isLoading } = useQuery({
    queryKey: ['file', src],
    queryFn: async () => await getFileElementTypeFromExtensionAndHead(src),
  });

  useEffect(() => {
    if (!fileType || isLoading) return;
    setElementType(fileType);
  }, [fileType, isLoading]);

  if (isLoading) return <Loader width={28} height={28} />;

  const path = constructPathFromSrc(src);

  let content: JSX.Element;

  if (fileType === 'video') {
    content = (
      <Video
        path={path}
        dimensionsWrittenToNode={dimensionsWrittenToNode}
        writeDimensionsToNode={writeDimensionsToNode}
        title={title}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'image') {
    content = (
      <Image
        path={path}
        alt={title}
        dimensionsWrittenToNode={dimensionsWrittenToNode}
        writeDimensionsToNode={writeDimensionsToNode}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'pdf') {
    content = <Pdf path={path} alt={title} nodeKey={nodeKey} />;
  } else {
    // Replace with unknown attachment
    content = (
      <FileError path={path} nodeKey={nodeKey} type="unknown-attachment" />
    );
  }

  return content; // Single return statement
}
