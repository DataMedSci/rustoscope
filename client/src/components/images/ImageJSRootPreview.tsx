import { useEffect, useRef } from 'preact/hooks';
import { BIT, createHistogram, draw } from 'jsroot';

type TypedPixels = Uint8Array | Uint16Array | Float32Array;

type ImagePreviewProps = {
  /** Raw grayscale pixel buffer; one sample per pixel (row-major, X fastest) */
  pixels: TypedPixels | null;
  /** Image width & height in pixels */
  width: number | null;
  height: number | null;
  header?: string;
  emptyText?: string;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  error?: string;
};

const DRAW_OPTS = 'colz;gridxy;nostat;tickxy';

const ImagePreview = ({
  pixels,
  width,
  height,
  header,
  emptyText,
  aspectRatio,
  setAspectRatio,
  error,
}: ImagePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = containerRef.current;

    // No target or no data -> clear plot and bail
    if (!host || !pixels || !width || !height || width <= 0 || height <= 0) {
      if (host) host.innerHTML = '';
      return;
    }


    // Keep the layout box stable
    setAspectRatio(width / height);

    // Build histogram and draw
    const w = width;
    const h = height;

    // Clear any previous drawing to avoid stacking
    host.innerHTML = '';

    const hist = createHistogram('TH2F', w, h);

    // Axes (in pixels)
    hist.fXaxis.fXmin = 0; hist.fXaxis.fXmax = w;
    hist.fYaxis.fXmin = 0; hist.fYaxis.fXmax = h;
    hist.fXaxis.fTitle = 'X [px]';
    hist.fYaxis.fTitle = 'Y [px]';
    hist.fTitle = header = '';

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
      zmin = 0; zmax = 1;
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
  }, [pixels, width, height, header, setAspectRatio]);

  const previewStyle = { aspectRatio: aspectRatio.toFixed(5) };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {header && <div className="text-xl font-bold p-2">{header}</div>}

      {pixels && width && height ? (
        <div
          ref={containerRef}
          style={previewStyle}
          className="w-full rounded-md bg-gray-50 shadow-md overflow-hidden"
        />
      ) : (
        <div
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
