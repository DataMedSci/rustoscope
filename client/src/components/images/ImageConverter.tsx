import { useState, useRef, useEffect } from 'preact/hooks';
import { useWasm } from '@/hooks/useWasm';
import {
  to_grayscale,
  invert_colors,
  to_png,
  clip_pixels_with_percentiles,
  gaussian_blur,
  median_blur,
} from '@/wasm';
import ImagePreview from './ImagePreview.jsx';
import AlgorithmsContainer from '@/components/algorithms/AlgorithmsContainer';
import {
  ConversionAlgorithm,
  ConversionAlgorithmType,
  getAlgorithmName,
} from '@/models/algorithms';
import { TargetedEvent } from 'preact/compat';

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

const processBytes = (fileType: string, bytes: Uint8Array<ArrayBufferLike>) => {
  switch (fileType) {
    case 'image/png':
    case 'image/jpg':
    case 'image/jpeg':
      return bytes;
    case 'image/tiff':
      return to_png(bytes);
    default:
      throw new Error('Unsupported image type. Supported: [png, jpg, tiff]');
  }
};

const ImageConverter = () => {
  const { wasmReady } = useWasm();
  const [algorithms, setAlgorithms] = useState<ConversionAlgorithm[]>([]);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgResult, setImgResult] = useState<string | null>(null);
  const [rawBytes, setRawBytes] = useState<Uint8Array | null>(null);
  const [previewsAspectRatios, setPreviewsAspectRatios] = useState(16 / 10);

  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentAlgorithm, setCurrentAlgorithm] = useState<string>('');
  
  const prevSrcUrlRef = useRef<string | null>(null);
  const prevResultUrlRef = useRef<string | null>(null);

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

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    setErrorMessage(undefined);

    try {
      const processedBytes = processBytes(file.type, bytes);
      setRawBytes(processedBytes);
      
      if (prevSrcUrlRef.current) {
        URL.revokeObjectURL(prevSrcUrlRef.current);
      }
      
      const blob = new Blob([processedBytes]);
      const newUrl = URL.createObjectURL(blob);
      prevSrcUrlRef.current = newUrl;
      setImgSrc(newUrl);
      
      if (prevResultUrlRef.current) {
        URL.revokeObjectURL(prevResultUrlRef.current);
        prevResultUrlRef.current = null;
        setImgResult(null);
      }
    } catch (err) {
      setErrorMessage(`Upload error: ${err}`);
      setImgSrc(null);
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
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      setErrorMessage(`Processing error: ${error}`);
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
          <ImagePreview
            imageUrl={imgSrc}
            header={'Original Image'}
            aspectRatio={previewsAspectRatios}
            setAspectRatio={setPreviewsAspectRatios}
            emptyText={'No image selected'}
            error={errorMessage}
          />
        </div>
        <div className="w-full flex items-start justify-center mt-10 rounded-md relative">
          <ImagePreview
            imageUrl={imgResult}
            header={'Converted Image'}
            aspectRatio={previewsAspectRatios}
            setAspectRatio={setPreviewsAspectRatios}
            emptyText={
              imgSrc
                ? "Select conversion type and press 'Run'"
                : 'No image selected'
            }
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

        <AlgorithmsContainer
          algorithms={algorithms}
          setAlgorithms={setAlgorithms}
        />
      </div>
    </div>
  );
};

export default ImageConverter;
