import { useState } from 'preact/hooks';

type DragAndDropZoneProps = {
  onFileDrop: (file: File) => void | Promise<void>;
  className?: string;
  children?: preact.ComponentChildren;
};

const DragAndDropZone = ({ onFileDrop, className = '', children }: DragAndDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) await onFileDrop(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative w-full h-full ${className}`}
    >
      {children}

      {/* subtle overlay that appears only when dragging */}
      {isDragOver && (
        <div className="absolute inset-0 bg-orange-100/60 border-2 border-orange-400 rounded-md flex items-center justify-center pointer-events-none">
          <p className="text-orange-700 font-medium text-sm">Drop your image here</p>
        </div>
      )}
    </div>
  );
};

export default DragAndDropZone;
