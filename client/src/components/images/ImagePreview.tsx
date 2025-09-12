import { useEffect, useRef } from 'preact/hooks';

type ImagePreviewProps = {
  imageUrl: string | null;
  header?: string;
  emptyText?: string;
  aspectRatio: number;
  setAspectRatio: (ratio: number) => void;
  error?: string;
};

const ImagePreview = ({
  imageUrl,
  header,
  emptyText,
  aspectRatio,
  setAspectRatio,
  error,
}: ImagePreviewProps) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imageUrl || !imgRef.current) return;

    const img = imgRef.current;

    const updateAspect = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };

    if (img.complete) {
      updateAspect();
    } else {
      img.onload = updateAspect;
    }
  }, [imageUrl]);

  const previewStyle = {
    aspectRatio: aspectRatio.toFixed(5),
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {header && <div className="text-xl font-bold p-2">{header}</div>}
      {imageUrl ? (
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Preview"
          style={previewStyle}
          className="w-full object-contain rounded-md bg-gray-50 shadow-md"
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