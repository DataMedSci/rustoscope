import { useState, useRef, useEffect } from 'preact/hooks';
import { useWasm } from '@/hooks/useWasm';
import {
  clip_pixels_with_percentiles,
  median_blur_image,
  load_image,
  gaussian_blur_image,
  apply_linear_function,
  Image
} from '@/wasm';
import AlgorithmsContainer from '@/components/algorithms/AlgorithmsContainer';
import {
  ConversionAlgorithm,
  ConversionAlgorithmType,
  getAlgorithmName,
} from '@/models/algorithms';
import { TargetedEvent } from 'preact/compat';
import ImageJSRootPreview from './ImageJSRootPreview';

type ImageState = {
  rawBytes: Uint8Array | null;
  uploadedImage: Image | null;
  rawPixels: Uint8Array | Uint16Array | null;
  imageToConvert: Image | null;
  convertedPixels: Uint8Array | Uint16Array | null;
};


const ImageConverter = () => {
  const { wasmReady } = useWasm();
  const [algorithms, setAlgorithms] = useState<ConversionAlgorithm[]>([]);

  const [imageState, setImageState] = useState<ImageState>({
    rawBytes: null,
    uploadedImage: null,
    rawPixels: null,
    imageToConvert: null,
    convertedPixels: null,
  });

  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentAlgorithm, setCurrentAlgorithm] = useState<string>('');
  const [units, setUnits] = useState<'px' | 'mm'>('px');
  const [mmPerPx, setMmPerPx] = useState(16 / 10);
  const [previewsAspectRatios, setPreviewsAspectRatios] = useState<number>(1);
  
  const prevSrcUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);
  const YIELD_DELAY_MS = 10;
  const FINAL_DISPLAY_DELAY_MS = 500;

  const cleanupBlobUrls = () => {
    if (prevSrcUrlRef.current) {
      URL.revokeObjectURL(prevSrcUrlRef.current);
      prevSrcUrlRef.current = null;
    }
    if (prevResultUrlRef.current) {
      URL.revokeObjectURL(prevResultUrlRef.current);
      prevResultUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupBlobUrls();
    };
  }, []);

  const handleUpload = async (e: TargetedEvent<HTMLInputElement, Event>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    if (!wasmReady) {
      setErrorMessage('WASM engine not ready — try again in a moment');
      return;
    }

    const allowedTypes = ['image/tiff', 'image/png', 'image/jpg', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Unsupported image type. Supported: [png, jpg, tiff]');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    setErrorMessage(undefined);

    try {
      const img = load_image(bytes);
      const pixels = img.bits_per_sample === 16 ? img.pixels_u16() : 
        img.bits_per_sample === 8 ? img.pixels_u8() : null;
      if (!pixels) {
        setErrorMessage('Failed to extract pixel data from image');
        return;
      }

      setImageState({
        rawBytes: bytes,
        uploadedImage: img,
        rawPixels: pixels,
        imageToConvert: img,
        convertedPixels: null,
      });

    } catch (err) {
      setErrorMessage(`Upload error: ${err}`);
    }
  };

  const handleRun = async () => {
    const enabledAlgorithms = algorithms.filter((a) => a.enabled);
    if (!imageState.rawBytes || !wasmReady) return;
    if (enabledAlgorithms.length === 0) {
      setErrorMessage('No algorithms selected');
      return;
    }
    if (!imageState.imageToConvert) {
      const imageToConvert = load_image(imageState.rawBytes);
      setImageState((prevState) => ({
        ...prevState,
        imageToConvert,
      }));
      return;
    }

    setErrorMessage(undefined);
    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentAlgorithm('');

    try {
      for (let i = 0; i < enabledAlgorithms.length; i++) {
        const algorithm = enabledAlgorithms[i];
        
        setCurrentAlgorithm(getAlgorithmName(algorithm.type));
        setProcessingProgress(Math.round((i / enabledAlgorithms.length) * 100));
        
        try {
          convert(imageState.imageToConvert, algorithm, setErrorMessage);
        } catch (error) {
          console.error(`Error occurred while processing algorithm ${algorithm.type}:`, error);
          return;
        }   
        await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS));
      }

       const finalImage = imageState.imageToConvert;
    let converted: Uint8Array | Uint16Array | null = null;
    if (finalImage) {
      if (finalImage.bits_per_sample === 16) {
        converted = finalImage.pixels_u16() ?? null;
      } else if (finalImage.bits_per_sample === 8) {
        converted = finalImage.pixels_u8() ?? null;
      }
    }

    setImageState(prev => ({
      ...prev,
      convertedPixels: converted,
    }));


      setProcessingProgress(100);
      setCurrentAlgorithm('Complete');
      
      if (prevResultUrlRef.current) {
        URL.revokeObjectURL(prevResultUrlRef.current);
      }
      
      setErrorMessage(undefined);
      
      await new Promise(resolve => setTimeout(resolve, FINAL_DISPLAY_DELAY_MS));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : JSON.stringify(error);
      setErrorMessage(`Processing error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setCurrentAlgorithm('');
    }
  };

    const convert = (
    image: Image,
    algorithm: ConversionAlgorithm,
    setErrorMessage: (msg: string) => void
  ): Uint8Array<ArrayBufferLike> | undefined => {
    switch (algorithm.type) {
      case ConversionAlgorithmType.HotPixelRemoval:
        clip_pixels_with_percentiles(
          image,
          algorithm.lowPercentile,
          algorithm.highPercentile
        );
        return;
      case ConversionAlgorithmType.MedianBlur:
        try {
          median_blur_image(image, algorithm.kernelRadius);
          return;
        } catch (err) {
          setErrorMessage(`Conversion error: ${err}`);
          return;
        }
      case ConversionAlgorithmType.GaussianBlur:
        try {
          gaussian_blur_image(image, algorithm.sigma);
          return;
        } catch (err) {
          setErrorMessage(`Conversion error: ${err}`);
          return;
        }
      case ConversionAlgorithmType.LinearTransform: {
        // coerce and validate params a and b
        const rawA = (algorithm as any).a;
        const rawB = (algorithm as any).b;
        const a = rawA === undefined ? NaN : Number(rawA);
        const b = rawB === undefined ? NaN : Number(rawB);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
          setErrorMessage('Linear transform requires numeric a and b');
          return;
        }
        try {
          // This mutates the Image in-place (same pattern as gaussian_blur_image)
          apply_linear_function(image, a, b);
          return;
        } catch (err) {
          setErrorMessage(`Conversion error: ${err}`);
          return;
        }
      }
      default:
        // fallback for unsupported algorithms
        // This should ideally never happen if the algorithm list is properly managed
        // That is why we use `as any` to avoid TypeScript errors
        setErrorMessage(`Unsupported algorithm: ${(algorithm as any).type}`);
        return;
    }
  };

  return (
    <div
      className={`flex items-center h-full w-full p-1 bg-white ${
        wasmReady ? '' : 'opacity-50'
      }`}
    >
      <div className="flex w-3/4 h-full rounded-md bg-orange-100 mr-1 mt-2">
        <div className="w-full flex items-start justify-center mt-10 rounded-md">
          <ImageJSRootPreview
            pixels={imageState.rawPixels}
            HorizontalLength={imageState.uploadedImage ? imageState.uploadedImage.horizontal_length : null}
            VerticalLength={imageState.uploadedImage ? imageState.uploadedImage.vertical_length : null}
            header="Original Image"
            aspectRatio={previewsAspectRatios}
            setAspectRatio={setPreviewsAspectRatios}
            error={errorMessage}
            units={units}
            mmPerPx={mmPerPx}
          />

        </div>
        <div className="w-full flex items-start justify-center mt-10 rounded-md relative">
          <ImageJSRootPreview
            pixels={imageState.convertedPixels}
            HorizontalLength={imageState.imageToConvert ? imageState.imageToConvert.horizontal_length : null}
            VerticalLength={imageState.imageToConvert ? imageState.imageToConvert.vertical_length : null}
            header={'Converted Image'}
            aspectRatio={previewsAspectRatios}
            setAspectRatio={setPreviewsAspectRatios}
            error={errorMessage}
            units={units}
            mmPerPx={mmPerPx}
          />
          
          {/* Progress Indicator */}
          {isProcessing && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-4 py-2 shadow-md z-10">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  {currentAlgorithm || 'Processing...'}
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-1">
                  <div 
                    className="bg-green-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {processingProgress}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-1/4 flex-col h-full bg-gray-50 mt-2 ml-1 rounded-md p-3 shadow-md">
        <div className="flex justify-evenly space-around w-full mb-4">
          <label
            htmlFor="image-upload"
            className="cursor-pointer text-center flex items-center justify-center px-4 py-2 rounded-md h-[30px] w-[135px] bg-orange-500 text-white transition-colors hover:bg-orange-600"
          >
            Upload image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            className={`cursor-pointer text-center flex items-center justify-center px-4 py-2 rounded-md h-[30px] w-[135px] text-white transition-colors ${
              isProcessing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            onClick={handleRun}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Run'}
          </button>
        </div>
        
  <div className="mb-4 p-3 rounded-md border border-gray-200 bg-white">
  <div className="text-sm font-semibold mb-2">Units</div>

  <div className="flex items-center gap-4 mb-2 flex-nowrap">
    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
      <input
        type="radio"
        name="units"
        value="px"
        checked={units === 'px'}
        onChange={() => setUnits('px')}
      />
      <span>Pixels</span>
    </label>

    <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
      <input
        type="radio"
        name="units"
        value="mm"
        checked={units === 'mm'}
        onChange={() => setUnits('mm')}
      />
      <span>Millimeters</span>
    </label>

      {units === 'mm' && (
    <div className="flex-1 flex justify-center min-w-0">
      <input
        type="text"
        inputMode="decimal"
        autoComplete={'off'}
        className="w-20 flex-none rounded-md border border-gray-300 px-2 py-1 text-right"
        value={mmPerPx}
        onInput={(e) => {
          const v = Number((e as any).currentTarget.value.replace(',', '.'));
          if (Number.isFinite(v) && v > 0) setMmPerPx(v);
        }}
      />
      <span className="text-s text-gray-500 self-center px-1">mm/px</span>
    </div>
  )}
  </div>
</div>

        <AlgorithmsContainer
          algorithms={algorithms}
          setAlgorithms={setAlgorithms}
        />
      </div>
    </div>
  );
};

export default ImageConverter;