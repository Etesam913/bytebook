import { useQuery } from '@tanstack/react-query';
import { type JSX, useEffect } from 'react';
import { Loader } from '../../icons/loader';
import type { ResizeWidth } from '../../types';
import type { FileType } from '../editor/nodes/file';
import { getFileElementTypeFromExtensionAndHead } from '../editor/utils/file-node';
import { FileError } from './error';
import { Image } from './image';
import { Pdf } from './pdf';
import { Video } from './video';
import { FilePath } from '../../utils/string-formatting';

export function File({
  src,
  widthWrittenToNode,
  writeWidthToNode,
  title,
  nodeKey,
  setElementType,
}: {
  src: string;
  widthWrittenToNode: ResizeWidth;
  writeWidthToNode: (width: ResizeWidth) => void;
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

  let content: JSX.Element;
  const segments = src.split('/');
  const fileName = segments[segments.length - 1];
  const folder = segments[segments.length - 2];
  const filePath = new FilePath({ folder, note: fileName });

  if (fileType === 'video') {
    content = (
      <Video
        src={filePath.getFileUrl()}
        widthWrittenToNode={widthWrittenToNode}
        writeWidthToNode={writeWidthToNode}
        title={title}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'image') {
    content = (
      <Image
        src={filePath.getFileUrl()}
        alt={title}
        widthWrittenToNode={widthWrittenToNode}
        writeWidthToNode={writeWidthToNode}
        nodeKey={nodeKey}
      />
    );
  } else if (fileType === 'pdf') {
    content = <Pdf src={src} alt={title} nodeKey={nodeKey} />;
  } else {
    // Replace with unknown attachment
    content = (
      <FileError src={src} nodeKey={nodeKey} type="unknown-attachment" />
    );
  }

  return content; // Single return statement
}
