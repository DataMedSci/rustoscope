import { useEffect, useRef } from 'preact/hooks';
import { BIT, createHistogram, draw } from 'jsroot';
import type { RefObject } from 'preact';

type TypedPixels = Uint8Array | Uint16Array | Float32Array;

type ImagePreviewProps = {
  /** Raw grayscale pixel buffer; one sample per pixel (row-major, X fastest) */
  pixels: TypedPixels | null;
  /** Image Horizontal Length & Vertical Length in pixels */
  HorizontalLength: number | null;
  VerticalLength: number | null;
  header?: string;
  emptyText?: string;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  error?: string;
  units?: 'px' | 'mm';
  mmPerPx?: number;
  // Used for correctly displaying the drag-and-drop overlay.
  externalContainerRef?: RefObject<HTMLDivElement | null>;
};

const DRAW_OPTS = 'colz;gridxy;nostat;tickxy';

const ImagePreview = ({
  pixels,
  HorizontalLength,
  VerticalLength,
  header,
  emptyText,
  aspectRatio,
  setAspectRatio,
  error,
  units = 'px',
  mmPerPx = 0.14,
  externalContainerRef,
}: ImagePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = containerRef.current;

    // No target or no data -> clear plot and bail
    if (
      !host ||
      !pixels ||
      !HorizontalLength ||
      !VerticalLength ||
      HorizontalLength <= 0 ||
      VerticalLength <= 0
    ) {
      if (host) host.innerHTML = '';
      return;
    }

    // Keep the layout box stable
    setAspectRatio(HorizontalLength / VerticalLength);

    // Clear any previous drawing to avoid stacking
    host.innerHTML = '';

    // Build histogram and draw
    const w = HorizontalLength;
    const h = VerticalLength;

    const hist = createHistogram('TH2F', w, h);

    const scale = units === 'mm' ? Math.max(1e-12, mmPerPx) : 1;
    hist.fXaxis.fXmin = 0;
    hist.fXaxis.fXmax = w * scale;
    hist.fYaxis.fXmin = 0;
    hist.fYaxis.fXmax = h * scale;
    hist.fXaxis.fTitle = units === 'mm' ? 'X [mm]' : 'X [px]';
    hist.fYaxis.fTitle = units === 'mm' ? 'Y [mm]' : 'Y [px]';
    hist.fTitle = '';

    // Center axis titles + offset (same trick as in JsRootGraph2D)
    hist.fXaxis.InvertBit(BIT(12));
    hist.fYaxis.InvertBit(BIT(12));
    hist.fXaxis.fTitleOffset = 1.4;
    hist.fYaxis.fTitleOffset = 1.4;

    // Fill from grayscale buffer; flip Y so top-left stays top-left
    let zmin = Number.POSITIVE_INFINITY;
    let zmax = Number.NEGATIVE_INFINITY;

    for (let y = 0; y < h; y++) {
      const yp = h - 1 - y; // flip vertically for plotting
      const rowOff = y * w;
      for (let x = 0; x < w; x++) {
        const v = (pixels as any)[rowOff + x]; // works for all TypedArrays
        if (v < zmin) zmin = v;
        if (v > zmax) zmax = v;
        hist.setBinContent(hist.getBin(x + 1, yp + 1), v);
      }
    }

    // Z scaling (avoid zero-range)
    if (!Number.isFinite(zmin) || !Number.isFinite(zmax)) {
      zmin = 0;
      zmax = 1;
    } else if (zmin === zmax) {
      zmin = Math.max(0, zmin - 1);
      zmax = zmax + 1;
    }
    hist.fMinimum = zmin;
    hist.fMaximum = zmax;

    // Draw (returns a Promise; we don't need to await)
    void draw(host, hist, DRAW_OPTS);

    // Cleanup on unmount/re-render
    return () => {
      if (host) host.innerHTML = '';
    };
  }, [
    pixels,
    HorizontalLength,
    VerticalLength,
    header,
    setAspectRatio,
    units,
    mmPerPx,
  ]);

  const previewStyle = { aspectRatio: aspectRatio.toFixed(5) };

  const setContainerRef = (el: HTMLDivElement | null) => {
    containerRef.current = el;
    if (externalContainerRef) {
      externalContainerRef.current = el;
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {header && <div className="text-xl font-bold p-2">{header}</div>}

      {pixels && HorizontalLength && VerticalLength ? (
        <div
          ref={setContainerRef}
          style={previewStyle}
          className="w-full rounded-md bg-gray-50 shadow-md overflow-hidden"
        />
      ) : (
        <div
          ref={(el) => {
            if (externalContainerRef) {
              externalContainerRef.current = el;
            }
          }}
          className="w-full flex justify-center items-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 shadow-sm"
          style={previewStyle}
        >
          <p className="text-gray-600">{emptyText || 'No image available'}</p>
        </div>
      )}

      {error && <span className="mt-5 text-red-600">{error}</span>}
    </div>
  );
};

export default ImagePreview;
