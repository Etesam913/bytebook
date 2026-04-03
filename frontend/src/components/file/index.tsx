import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect } from 'react';
import { Loader } from '../../icons/loader';
import type { FileType } from '../editor/nodes/file';
import { getFileElementTypeFromExtensionAndHead } from '../editor/utils/file-node';
import { FileError } from './error';
import { Image } from './media/image';
import { Pdf } from './pdf';
import { Video } from './media/video';
import { FileDimensions } from '../editor/nodes/types';

function getFileUrlFromSrc(src: string): string {
  if (src.startsWith('wails://')) {
    const segments = src.split('/');
    if (segments.length < 3) {
      throw new Error(`Invalid wails:// URL: ${src}`);
    }
    return `/notes/${segments[1]}/${segments[2]}`;
  }
  return src;
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

  if (isLoading) return <Loader width="1.75rem" height="1.75rem" />;

  const fileUrl = getFileUrlFromSrc(src);

  let content: JSX.Element;

  if (fileType === 'video') {
    content = (
      <Video
        src={fileUrl}
        dimensionsWrittenToNode={dimensionsWrittenToNode}
        writeDimensionsToNode={writeDimensionsToNode}
        title={title}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'image') {
    content = (
      <Image
        src={fileUrl}
        alt={title}
        dimensionsWrittenToNode={dimensionsWrittenToNode}
        writeDimensionsToNode={writeDimensionsToNode}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'pdf') {
    content = <Pdf src={fileUrl} alt={title} nodeKey={nodeKey} />;
  } else {
    content = (
      <FileError src={fileUrl} nodeKey={nodeKey} type="unknown-attachment" />
    );
  }

  return content; // Single return statement
}
