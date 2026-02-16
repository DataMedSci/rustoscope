import {useState, useCallback } from 'preact/hooks';
import { load_image } from '@/wasm';
import { ConversionAlgorithm, getAlgorithmName } from '@/models/algorithms';
import { applyAlgorithm, extractPixels } from '@/utils/imageConversion';
import type { ImageState } from './useFileUpload';


// the delays are used to draw progress bar (may be deleted in the future or adjusted somehow to not cause too much delay for user)
const YIELD_DELAY_MS = 10;
const FINAL_DISPLAY_DELAY_MS = 500;

export function useImageProcessing(
    imageState: ImageState,
    setImageState: (fn: (prev: ImageState) => ImageState) => void,
    setErrorMessage: (msg: string | undefined) => void
){
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    const [currentAlgorithm, setCurrentAlgorithm] = useState('');

    const handleRun = useCallback(
        async (algorithms: ConversionAlgorithm[], wasmReady: boolean) => {
            const enabledAlgorithms = algorithms.filter((a) => a.enabled);
            if (!imageState.rawBytes || !wasmReady) return;

            if (enabledAlgorithms.length === 0){
                setErrorMessage('No algorithms selected');
                return;
            }

// this will interrupt the processing and user would have to re-run the conversion (maybe it should be changed or at least a warning should be added in UI)
            if(!imageState.imageToConvert){
                const imageToConvert = load_image(imageState.rawBytes);
                setImageState((prev) => ({...prev, imageToConvert }));
                return;
            }

            setErrorMessage(undefined);
            setIsProcessing(true);
            setProcessingProgress(0);
            setCurrentAlgorithm('');

            try{
                for (let i=0;i<enabledAlgorithms.length;i++){
                    const algorithm = enabledAlgorithms[i];
                    setCurrentAlgorithm(getAlgorithmName(algorithm.type));
                    setProcessingProgress(Math.round((i / enabledAlgorithms.length) * 100));

                    const result = applyAlgorithm(imageState.imageToConvert, algorithm);
                    if(!result.success){
                        setErrorMessage(result.error);
                        return;
                    }

                    await new Promise((resolve) => setTimeout(resolve,YIELD_DELAY_MS));
            }

            const converted = extractPixels(imageState.imageToConvert);

            setImageState((prev) => ({ ...prev, convertedPixels: converted }));

            setProcessingProgress(100);
            setCurrentAlgorithm('Complete');
            setErrorMessage(undefined);

            await new Promise((resolve) => setTimeout(resolve, FINAL_DISPLAY_DELAY_MS));
        } catch (error) {
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            setErrorMessage(`Processing error: ${msg}`);
        } finally {
            setIsProcessing(false);
            setProcessingProgress(0);
            setCurrentAlgorithm('');
        }
    },
    [imageState, setImageState, setErrorMessage]
    );

    return { isProcessing, processingProgress, currentAlgorithm, handleRun };
}