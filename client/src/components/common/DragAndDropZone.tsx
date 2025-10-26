import { useDropzone, type Accept } from 'react-dropzone';
import type { ComponentChildren } from 'preact';

type DragAndDropZoneProps = {
  onFileDrop: (file: File) => void | Promise<void>;
  accept?: Accept;
  multiple?: boolean;
  className?: string;
  children?: ComponentChildren;
};

const DragAndDropZone = ({
  onFileDrop,
  accept,
  multiple = false,
  className = '',
  children,
}: DragAndDropZoneProps) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept,
    multiple,
    maxFiles: multiple ? undefined : 1,
    onDropAccepted: async (files) => {
      const f = files[0];
      if (f) await onFileDrop(f);
    },
  });

  // react-dropzone zwraca propsy typowane pod React — rzutujemy dla Preact
  const rootProps = getRootProps({ refKey: 'ref' }) as any;
  const inputProps = getInputProps() as any;

  return (
    <div {...rootProps} className={className}>
      <input {...inputProps} />
      {children}
    </div>
  );
};

export default DragAndDropZone;