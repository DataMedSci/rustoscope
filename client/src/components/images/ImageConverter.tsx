import { useState, useRef } from 'preact/hooks';

import { useWasm } from '@/hooks/useWasm';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { ACCEPTED_FILE_TYPES } from '@/utils/fileValidation';
import { ConversionAlgorithm } from '@/models/algorithms';

import ImagePreview from './ImageJSRootPreview';
import AlgorithmsContainer from '../algorithms/AlgorithmsContainer';
import DragAndDropZone from '../common/DragAndDropZone';

const ImageConverter = () => {
  const { wasmReady } = useWasm();
  const [algorithms, setAlgorithms] = useState<ConversionAlgorithm[]>([]);
  const [units, setUnits] = useState<'px' | 'mm'>('px');
  const [mmPerPx, setMmPerPx] = useState(16 / 10);
  const [previewsAspectRatios, setPreviewsAspectRatios] = useState(1);
  const overlayTargetRef = useRef<HTMLDivElement | null>(null);

  const {
    imageState,
    setImageState,
    errorMessage,
    setErrorMessage,
    processFile,
    handleFileReject,
  } = useFileUpload(wasmReady);

  const { isProcessing, processingProgress, currentAlgorithm, handleRun } =
    useImageProcessing(imageState, setImageState, setErrorMessage);

  const handleUpload = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) await processFile(file);
  };

  return (
    <div
      className={`flex items-center h-full w-full p-1 bg-white ${
        wasmReady ? '' : 'opacity-50'
      }`}
    >
      {/* Left panel: previews */}
      <div className="flex w-3/4 h-full rounded-md bg-orange-100 mr-1 mt-2">
        {/* Original image */}
        <div className="w-full flex items-start justify-center mt-10 rounded-md">
          <DragAndDropZone
            accept={ACCEPTED_FILE_TYPES}
            overlayTargetRef={overlayTargetRef}
            onFileDrop={processFile}
            onFileReject={handleFileReject}
            className="w-full"
          >
            <ImagePreview
              pixels={imageState.rawPixels}
              HorizontalLength={
                imageState.uploadedImage?.horizontal_length ?? null
              }
              VerticalLength={imageState.uploadedImage?.vertical_length ?? null}
              header="Original Image"
              aspectRatio={previewsAspectRatios}
              setAspectRatio={setPreviewsAspectRatios}
              error={errorMessage}
              units={units}
              mmPerPx={mmPerPx}
              emptyText="Drop image here or click 'Upload image' button"
              externalContainerRef={overlayTargetRef}
            />
          </DragAndDropZone>
        </div>

        {/* Converted image */}
        <div className="w-full flex items-start justify-center mt-10 rounded-md relative">
          <ImagePreview
            pixels={imageState.convertedPixels}
            HorizontalLength={
              imageState.imageToConvert?.horizontal_length ?? null
            }
            VerticalLength={imageState.imageToConvert?.vertical_length ?? null}
            header="Converted Image"
            aspectRatio={previewsAspectRatios}
            setAspectRatio={setPreviewsAspectRatios}
            units={units}
            mmPerPx={mmPerPx}
          />

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
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {processingProgress}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: controls */}
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
            onClick={() => handleRun(algorithms, wasmReady)}
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
                  autoComplete="off"
                  className="w-20 flex-none rounded-md border border-gray-300 px-2 py-1 text-right"
                  value={mmPerPx}
                  onInput={(e) => {
                    const v = Number(
                      (e as any).currentTarget.value.replace(',', '.')
                    );
                    if (Number.isFinite(v) && v > 0) setMmPerPx(v);
                  }}
                />
                <span className="text-s text-gray-500 self-center px-1">
                  mm/px
                </span>
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
