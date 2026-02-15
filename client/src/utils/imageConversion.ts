import { 
    clip_pixels_with_percentiles,
    median_blur_image,
    gaussian_blur_image,
    apply_linear_function,
    Image,
} from '@/wasm'
import {
    ConversionAlgorithm,
    ConversionAlgorithmType,
} from '@/models/algorithms'

export type ConversionResult = 
    | { success: true }
    | { success: false; error: string }

export function applyAlgorithm(image: Image, algorithm: ConversionAlgorithm): ConversionResult {
    switch (algorithm.type) {
        case ConversionAlgorithmType.HotPixelRemoval:
            try{
                clip_pixels_with_percentiles(image, algorithm.lowPercentile, algorithm.highPercentile);
            } catch (err){
                return { success: false, error: `Hot pixel removal failed: ${err}` };
            }
            return { success: true};
        case ConversionAlgorithmType.MedianBlur:
            try{
                median_blur_image(image, algorithm.kernelRadius);
                return { success: true};
            } catch (err){
                return { success: false, error: `Median blur failed: ${err}` };
            }
        case ConversionAlgorithmType.GaussianBlur:
            try{
                gaussian_blur_image(image, algorithm.sigma);
                return { success: true};
            } catch (err){
                return { success: false, error: `Gaussian blur failed: ${err}` };
            }
        case ConversionAlgorithmType.LinearTransform:
            const a = Number(algorithm.a);
            const b = Number(algorithm.b);
            if(!Number.isFinite(a) || !Number.isFinite(b)){
                return { success: false, error: `Linear transform requires numeric a and b` };
            }
            try{
                apply_linear_function(image, a, b);
                return { success: true};
            } catch (err){
                return { success: false, error: `Linear transform failed: ${err}` };
            }
        default:
            return { success: false, error: `Unsupported algorithm: ${(algorithm as any).type}` };
}
}

export function extractPixels(image: Image): Uint8Array | Uint16Array | null {
    if(image.bits_per_sample === 16) return image.pixels_u16() ?? null;
    if(image.bits_per_sample === 8) return image.pixels_u8() ?? null;
    return null;
}
