import { useDropzone, type Accept } from 'react-dropzone';
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import type { ComponentChildren, RefObject } from 'preact';

type DragAndDropZoneProps = {
  onFileDrop: (file: File) => void | Promise<void>;
  accept?: Accept;
  multiple?: boolean;
  className?: string;
  children?: ComponentChildren;
  overlayTargetRef?: RefObject<HTMLElement>;
};

const DragAndDropZone = ({
  onFileDrop,
  accept,
  multiple = false,
  className = '',
  children,
  overlayTargetRef,
}: DragAndDropZoneProps) => {

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const updateOverlayRect = useCallback(() => {
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
  }, [overlayTargetRef]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple,
    noClick: true,
    maxFiles: multiple ? undefined : 1,
    onDropAccepted: async (files) => {
      const f = files[0];
      if (f) await onFileDrop(f);
    },
    onDragEnter: () => updateOverlayRect(),
  });

  // react-dropzone returns props typed for React — we cast them for Preact
  const rootProps = getRootProps({ refKey: 'ref' }) as { ref?: unknown; [key: string]: unknown };
  const inputProps = getInputProps() as { ref?: unknown; [key: string]: unknown };

  const setWrapperRef = (el: HTMLDivElement | null) => {
    if (typeof rootProps.ref === 'function') {
      rootProps.ref(el);
    } else if (rootProps.ref && typeof rootProps.ref === 'object' && 'current' in rootProps.ref) {
      (rootProps.ref as { current: HTMLDivElement | null }).current = el;
    }
    wrapperRef.current = el;
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
  }, [overlayTargetRef, updateOverlayRect]);

  useEffect(() => {
    if (isDragActive) updateOverlayRect();
  }, [isDragActive, updateOverlayRect]);
  return (
    <div {...rootProps} ref={setWrapperRef} className={`relative ${className}`.trim()}>
      <input {...inputProps} aria-label="File upload via drag and drop"/>
      {children}

      {isDragActive && overlayRect && (
        <div
          style={{
            position: 'absolute',
            left: overlayRect.left,
            top: overlayRect.top,
            width: overlayRect.width,
            height: overlayRect.height,
          }}
          className="bg-orange-100/60 border-2 border-orange-400 rounded-md pointer-events-none"
        />
      )}
    </div>
  );
};

export default DragAndDropZone;