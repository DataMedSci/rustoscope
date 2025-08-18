import { useEffect, useRef, useState } from 'preact/hooks';

type ImagePreviewProps = {
  imageUrl: string | null;
  header?: string;
  emptyText?: string;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  error?: string;
};

const TICK_LEN = 8;          // długość kreski ticka (px)
const LABEL_GAP = 2;         // odstęp między kreską a etykietą (px)
const FONT_PX = 10;          // rozmiar czcionki etykiet (px)
const AXIS_X_HEIGHT = TICK_LEN + LABEL_GAP + FONT_PX + 4; // wysokość rynienki dla osi X
const AXIS_Y_GUTTER = 56;    // szerokość rynienki dla osi Y (miejsce na etykiety)

const ImagePreview = ({
  imageUrl,
  header,
  emptyText,
  aspectRatio,
  setAspectRatio,
  error,
}: ImagePreviewProps) => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  // naturalne wymiary (opcjonalnie do innych celów)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  // renderowane wymiary (CSS px) — do długości osi
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

  // ładny krok podziałki
  const niceStep = (range: number, targetCount = 6) => {
    if (!isFinite(range) || range <= 0) return 50;
    const rough = range / targetCount;
    const p = Math.pow(10, Math.floor(Math.log10(rough)));
    const candidates = [1, 2, 2.5, 5, 10].map((m) => m * p);
    let best = candidates[0];
    let bestDiff = Math.abs(rough - best);
    for (const c of candidates) {
      const d = Math.abs(rough - c);
      if (d < bestDiff) {
        best = c;
        bestDiff = d;
      }
    }
    return Math.max(1, Math.round(best));
  };

  const makeTicks = (lengthPx: number, stepPx: number) => {
    const ticks: number[] = [];
    const max = Math.max(0, Math.round(lengthPx));
    const step = Math.max(1, Math.round(stepPx));
    for (let v = 0; v <= max; v += step) ticks.push(v);
    if (ticks[ticks.length - 1] !== max) ticks.push(max);
    return ticks;
  };

  useEffect(() => {
    const img = imgRef.current;
    if (!imageUrl || !img) {
      setDisplaySize(null);
      return;
    }

    const updateAll = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      }
      const rect = img.getBoundingClientRect();
      setDisplaySize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };

    if (img.complete) updateAll();
    else img.addEventListener('load', updateAll, { once: true });

    const hasWindow = typeof window !== 'undefined';
    const measure = () => {
      const r = img.getBoundingClientRect();
      setDisplaySize({ width: Math.round(r.width), height: Math.round(r.height) });
    };

    let ro: ResizeObserver | null = null;
    if (hasWindow && 'ResizeObserver' in window) {
      ro = new ResizeObserver(measure);
      ro.observe(img);
    } else if (hasWindow) {
      window.addEventListener('resize', measure);
    }

    return () => {
      img.removeEventListener('load', updateAll);
      if (ro) ro.disconnect();
      else if (hasWindow) window.removeEventListener('resize', measure);
    };
  }, [imageUrl, setAspectRatio]);

  const previewStyle = { aspectRatio: aspectRatio > 0 ? aspectRatio.toFixed(5) : undefined };

  const ticksX = displaySize ? makeTicks(displaySize.width,  niceStep(displaySize.width))  : [];
  const ticksY = displaySize ? makeTicks(displaySize.height, niceStep(displaySize.height)) : [];

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {header && <div className="text-xl font-bold p-2">{header}</div>}

      {imageUrl ? (
        <div
          className="grid gap-2 w-full"
          style={{
            gridTemplateColumns: 'auto 1fr',
            gridTemplateRows: '1fr auto',
            alignItems: 'start',
          }}
        >
          {/* OŚ Y (po lewej) — etykiety po PRAWEJ stronie osi, w dedykowanej rynience */}
          <div className="row-start-1 col-start-1">
            {displaySize && (
              <div
                className="relative"
                style={{ height: displaySize.height, width: AXIS_Y_GUTTER }}
              >
                {/* linia osi przy lewej krawędzi rynienki */}
                <div className="absolute left-0 top-0 w-px h-full bg-gray-400" />

                {/* ticki + etykiety (po prawej od osi, wewnątrz rynienki) */}
                {ticksY.map((y) => (
                  <div
                    key={`ty-${y}`}
                    className="absolute flex items-center"
                    style={{
                      top: `${(1 - y / displaySize.height) * 100}%`,
                      left: 0,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {/* kreska ticka w prawo */}
                    <div className="bg-gray-600" style={{ width: TICK_LEN, height: 1 }} />
                    {/* etykieta po prawej, nie wyjedzie poza ekran */}
                    <div
                      className="text-[10px] text-gray-700 ml-1 whitespace-nowrap"
                      style={{ lineHeight: `${FONT_PX}px` }}
                    >
                      {y}px
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OBRAZ */}
          <div className="row-start-1 col-start-2">
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              style={previewStyle}
              className="block w-full object-contain rounded-md bg-gray-50 shadow-md"
            />
          </div>

          {/* OŚ X (na dole) — ma WYSOKOŚĆ na ticki i etykiety, więc nie wchodzi na obraz */}
          <div className="row-start-2 col-start-2">
            {displaySize && (
              <div
                className="relative"
                style={{ width: displaySize.width, height: AXIS_X_HEIGHT }}
              >
                {/* linia osi na samej górze rynienki */}
                <div className="absolute left-0 top-0 right-0 h-px bg-gray-400" />

                {/* ticki + etykiety POD linią */}
                {ticksX.map((x) => (
                  <div
                    key={`tx-${x}`}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: `${(x / displaySize.width) * 100}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="w-px bg-gray-600" style={{ height: TICK_LEN }} />
                    <div
                      className="text-[10px] text-gray-700 mt-[2px] whitespace-nowrap"
                      style={{ lineHeight: `${FONT_PX}px` }}
                    >
                      {x}px
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
