import { useEffect, useRef,useState } from 'preact/hooks';

type DragAndDropZoneProps = {
  onFileDrop: (file: File) => void | Promise<void>;
  className?: string;
  children?: preact.ComponentChildren;
  // ref to the element that will act as the drop target (in this case original image preview)
  overlayTargetRef?: preact.RefObject<HTMLElement>;
};

const DragAndDropZone = ({ onFileDrop, className = '', children, overlayTargetRef }: DragAndDropZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

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
    updateOverlayRect();
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const updateOverlayRect = () => {
    const wrapper = wrapperRef.current;
    const target = overlayTargetRef?.current ?? null;
    if (!wrapper || !target) {
      setOverlayRect(null);
      return;
    }
    const w = wrapper.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    setOverlayRect({
      left: t.left - w.left,
      top: t.top - w.top,
      width: t.width,
      height: t.height,
    });
  };

  useEffect(() => {
    updateOverlayRect();
    const t = overlayTargetRef?.current ?? null;
    if (!t) return;
    const ro = new ResizeObserver(() => updateOverlayRect());
    ro.observe(t);
    const onWin = () => updateOverlayRect();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [overlayTargetRef]);

  return (
    <div
      ref={wrapperRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative inline-block ${className}`.trim()}
    >
      {children}

      {/* subtle overlay that appears only when dragging */}
      {isDragOver && overlayRect && (
        <div
          style={{
            position: 'absolute',
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
          }}
          className="bg-orange-100/60 border-2 border-orange-400 rounded-md flex items-center justify-center pointer-events-none"
        >
        </div>
      )}
    </div>
  );
};

export default DragAndDropZone;
