import { useState, useRef, useEffect } from 'preact/hooks';
import { useWasm } from '@/hooks/useWasm';
import {
  to_grayscale,
  invert_colors,
  clip_pixels_with_percentiles,
  gaussian_blur,
  median_blur,
  load_image
} from '@/wasm';
import AlgorithmsContainer from '@/components/algorithms/AlgorithmsContainer';
import {
  ConversionAlgorithm,
  ConversionAlgorithmType,
  getAlgorithmName,
} from '@/models/algorithms';
import { TargetedEvent } from 'preact/compat';
import ImageJSRootPreview from './ImageJSRootPreview';



const convert = (
  bytesToProcess: Uint8Array<ArrayBufferLike>,
  algorithm: ConversionAlgorithm,
  setErrorMessage: (msg: string) => void
): Uint8Array<ArrayBufferLike> | undefined => {
  switch (algorithm.type) {
    case ConversionAlgorithmType.Grayscale:
      return to_grayscale(bytesToProcess);
    case ConversionAlgorithmType.Invert:
      return invert_colors(bytesToProcess);
    case ConversionAlgorithmType.HotPixelRemoval:
      return clip_pixels_with_percentiles(
        bytesToProcess,
        algorithm.lowPercentile,
        algorithm.highPercentile
      );
    case ConversionAlgorithmType.GaussianBlur:
      return gaussian_blur(bytesToProcess, algorithm.sigma);
    case ConversionAlgorithmType.MedianBlur:
      return median_blur(bytesToProcess, algorithm.kernelRadius);
    default:
      // fallback for unsupported algorithms
      // This should ideally never happen if the algorithm list is properly managed
      // That is why we use `as any` to avoid TypeScript errors
      setErrorMessage(`Unsupported algorithm: ${(algorithm as any).type}`);
      return;
  }
};


const ImageConverter = () => {
  const { wasmReady } = useWasm();
  const [algorithms, setAlgorithms] = useState<ConversionAlgorithm[]>([]);

  const [imgResult, setImgResult] = useState<string | null>(null);
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);
  const [previewsAspectRatios, setPreviewsAspectRatios] = useState(16 / 10);
  const [rawPixels, setRawPixels] = useState<Uint8Array | Uint16Array | null>(null);
  const [ImageHorizontalLength, setImageHorizontalLength] = useState<number | null>(null);
  const [ImageVerticalLength, setImageVerticalLength] = useState<number | null>(null);


  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentAlgorithm, setCurrentAlgorithm] = useState<string>('');
  const [units, setUnits] = useState<'px' | 'mm'>('px');
  const [mmPerPx, setMmPerPx] = useState<number>(0.14);
  
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
      setRawBytes(bytes);

      const img = load_image(bytes);

      setImageHorizontalLength(img.horizontal_length);
      setImageVerticalLength(img.vertical_length);

      if (img.bits_per_sample === 16) {
        const pixels16 = img.pixels_u16();
        if (pixels16) {
          setRawPixels(pixels16);
        }
      } else if (img.bits_per_sample === 8) {
        const pixels8 = img.pixels_u8();
        if (pixels8) {
          setRawPixels(pixels8);
        }
      } else {
        setRawPixels(null);
        setErrorMessage(`Unsupported bits per sample: ${img.bits_per_sample}`);
      }

      if (prevSrcUrlRef.current) {
        URL.revokeObjectURL(prevSrcUrlRef.current);
      }

    } catch (err) {
      setErrorMessage(`Upload error: ${err}`);
      setRawBytes(null);
    }
  };

  const handleRun = async () => {
    const enabledAlgorithms = algorithms.filter((a) => a.enabled);
    if (!rawBytes || !wasmReady) return;
    if (enabledAlgorithms.length === 0) {
      setErrorMessage('No algorithms selected');
      return;
    }
    
    setErrorMessage(undefined);
    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentAlgorithm('');

    try {
      let processedBytes: Uint8Array<ArrayBufferLike> | undefined =
        Uint8Array.from(rawBytes);
      
      for (let i = 0; i < enabledAlgorithms.length; i++) {
        const algorithm = enabledAlgorithms[i];
        
        setCurrentAlgorithm(getAlgorithmName(algorithm.type));
        setProcessingProgress(Math.round((i / enabledAlgorithms.length) * 100));
              
        processedBytes = convert(processedBytes, algorithm, setErrorMessage);
        if (!processedBytes) {
          console.error(`Conversion failed for algorithm: ${algorithm.type}`);
          return;
        }
        
        if (prevResultUrlRef.current) {
          URL.revokeObjectURL(prevResultUrlRef.current);
        }
        
        const intermediateBlob = new Blob([processedBytes], { type: 'image/png' });
        const newUrl = URL.createObjectURL(intermediateBlob);
        prevResultUrlRef.current = newUrl;
        setImgResult(newUrl);
        
        await new Promise(resolve => setTimeout(resolve, YIELD_DELAY_MS));
      }

      setProcessingProgress(100);
      setCurrentAlgorithm('Complete');
      
      if (prevResultUrlRef.current) {
        URL.revokeObjectURL(prevResultUrlRef.current);
      }
      
      const finalBlob = new Blob([processedBytes], { type: 'image/png' });
      const finalUrl = URL.createObjectURL(finalBlob);
      prevResultUrlRef.current = finalUrl;
      setImgResult(finalUrl);
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

  return (
    <div
      className={`flex items-center h-full w-full p-1 bg-white ${
        wasmReady ? '' : 'opacity-50'
      }`}
    >
      <div className="flex w-3/4 h-full rounded-md bg-orange-100 mr-1 mt-2">
        <div className="w-full flex items-start justify-center mt-10 rounded-md">
          <ImageJSRootPreview
            pixels={rawPixels}
            HorizontalLength={ImageHorizontalLength}
            VerticalLength={ImageVerticalLength}
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
            pixels={rawBytes}
            HorizontalLength={ImageHorizontalLength}
            VerticalLength={ImageVerticalLength}
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