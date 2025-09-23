export enum ConversionAlgorithmType {
  HotPixelRemoval = 'HotPixelRemoval',
  GaussianBlur = 'GaussianBlur',
  MedianBlur = 'MedianBlur',
  LinearTransform = 'LinearTransform',
}

export type HotPixelRemoval = {
  type: ConversionAlgorithmType.HotPixelRemoval;
  lowPercentile: number;
  highPercentile: number;
};
export type GaussianBlur = {
  type: ConversionAlgorithmType.GaussianBlur;
  sigma: number;
};
export type MedianBlur = {
  type: ConversionAlgorithmType.MedianBlur;
  kernelRadius: number;
};

export type LinearTransform = {
  type: ConversionAlgorithmType.LinearTransform;
  a: number;
  b: number;
};

export type ConversionAlgorithm = (
  | HotPixelRemoval
  | GaussianBlur
  | MedianBlur
  | LinearTransform
) & {
  enabled: boolean;
};

export const getAlgorithmName = (type: ConversionAlgorithmType) => {
  switch (type) {
    case ConversionAlgorithmType.HotPixelRemoval:
      return 'Hot Pixel Removal';
    case ConversionAlgorithmType.GaussianBlur:
      return 'Gaussian Blur';
    case ConversionAlgorithmType.MedianBlur:
      return 'Median Blur';
    case ConversionAlgorithmType.LinearTransform:
      return 'Linear Transform';
    default:
      return 'Unknown Algorithm';
  }
};

export const defaultAlgorithm = (
  type: ConversionAlgorithmType
): ConversionAlgorithm => {
  switch (type) {
    case ConversionAlgorithmType.HotPixelRemoval:
      return {
        type,
        enabled: true,
        lowPercentile: 1.0,
        highPercentile: 99.0,
      };
    case ConversionAlgorithmType.GaussianBlur:
      return {
        type,
        enabled: true,
        sigma: 2.0,
      };
    case ConversionAlgorithmType.MedianBlur:
      return {
        type,
        enabled: true,
        kernelRadius: 2,
      };
    case ConversionAlgorithmType.LinearTransform:
      return {
        type,
        enabled: true,
        a: 1.0,
        b: 0.0,
      };
    default:
      throw new Error('Unknown algorithm type');
  }
};
