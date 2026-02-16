import { useState, useCallback } from 'preact/hooks';
import type { FileRejection } from 'react-dropzone';
import { load_image, Image } from '@/wasm';
import { isAllowedFileType, formatRejectionReasons } from '@/utils/fileValidation';
import { extractPixels } from '@/utils/imageConversion';

export type ImageState = {
    rawBytes: Uint8Array | null;
    uploadedImage: Image | null;
    rawPixels: Uint8Array | Uint16Array | null;
    imageToConvert: Image | null;
    convertedPixels: Uint8Array | Uint16Array | null;
}

const INITIAL_STATE: ImageState = {
    rawBytes: null,
    uploadedImage: null,
    rawPixels: null,
    imageToConvert: null,
    convertedPixels: null,
};

export function useFileUpload(wasmReady: boolean) {
    const [imageState, setImageState] = useState<ImageState>(INITIAL_STATE);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const processFile = useCallback(
        async (file: File) => {
            if (!wasmReady) {
                setErrorMessage('WASM engine is not ready - try again in a moment');
                return;
            }
            if (!isAllowedFileType(file)){
                setErrorMessage(' Unsupported image type. Supported types are: PNG, TIFF, JPEG');
                return;
            }

            const bytes = new Uint8Array(await file.arrayBuffer());
            setErrorMessage(undefined);

            try {
                const img = load_image(bytes);
                const pixels = extractPixels(img);

                if (!pixels) {
                    setErrorMessage('Failed to extract pixel data from the image');
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
        },
        [wasmReady]
    );

    const handleFileReject = useCallback((rejectedFiles: FileRejection[]) => {
        if (rejectedFiles.length === 0) return;
        setErrorMessage(`Rejected files: ${formatRejectionReasons(rejectedFiles)}`);
    }, []);

    return {
        imageState,
        setImageState,
        errorMessage,
        processFile,
        handleFileReject,
    }
}