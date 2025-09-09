import { useEffect, useRef } from 'preact/hooks';
import { draw, createHistogram, settings } from 'jsroot'; 

type ImageJsrootPreviewProps = {
  imageUrl: string | null;
  header?: string;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  error?: string;
};

const ImageJsrootPreview = ({
  imageUrl,
  header,
  aspectRatio,
  setAspectRatio,
  error,
}: ImageJsrootPreviewProps) => {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
  const host = plotRef.current;
  if (!imageUrl || !host) { if (host) host.innerHTML = ''; return; }

  let alive = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';

  img.onload = async () => {
    if (!alive) return;

    setAspectRatio(img.naturalWidth / img.naturalHeight);

    const w = img.naturalWidth, h = img.naturalHeight;

    // Decode pixels via canvas (you can downsample here if needed)
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    // ✅ Create a real TH2 with allocated bins
    const h2 = createHistogram('TH2F', w, h);
    h2.fName = 'image_hist';
    h2.fTitle = header = '';
    h2.fXaxis.fXmin = 0; h2.fXaxis.fXmax = w;
    h2.fYaxis.fXmin = 0; h2.fYaxis.fXmax = h;

    // Fill (flip Y so image isn't upside-down)
    for (let y = 0; y < h; y++) {
      const yp = h - 1 - y; // flip
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const gray = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
        h2.setBinContent(h2.getBin(x + 1, yp + 1), gray);
      }
    }

    // Help JSROOT with Z scaling
    h2.fMinimum = 0;
    h2.fMaximum = 255;

    await draw(host, h2, 'colz;nostat;tickxy');
  };

  img.onerror = () => console.error('Failed to load image:', imageUrl);
  img.src = imageUrl;

  return () => { alive = false; host.innerHTML = ''; };
}, [imageUrl, header, setAspectRatio]);

  const previewStyle = {
    aspectRatio: aspectRatio.toFixed(5),
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {header && <div className="text-xl font-bold p-2">{header}</div>}
      <div
        ref={plotRef}
        style={previewStyle}
        className="w-full rounded-md bg-gray-50 shadow-md"
      />
      {error && <span className="mt-5 text-red-600">{error}</span>}
    </div>
  );
};

export default ImageJsrootPreview;