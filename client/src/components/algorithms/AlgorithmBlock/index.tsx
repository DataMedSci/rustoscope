import React from 'react';
import {
  ConversionAlgorithm,
  ConversionAlgorithmType,
} from '@/models/algorithms';
import SimpleAlgorithmBlock from './SimpleAlgorithmBlock';
import HotPixelsRemovalBlock from './HotPixelsRemovalBlock';
import GaussianBlurBlock from './GaussianBlurBlock';
import MedianBlurBlock from './MedianBlurBlock';
import LinearFunctionBlock from './LinearFunctionBlock';


export type AlgorithmBlockProps = {
  idx: number;
  algorithm: ConversionAlgorithm;
  setEnabled: (idx: number, enabled: boolean) => void;
  updateAlgorithm: (
    index: number,
    updates: Partial<ConversionAlgorithm>
  ) => void;
  removeAlgorithm: (index: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  isFirst: boolean;
  isLast: boolean;
};

const AlgorithmBlock = (props: AlgorithmBlockProps) => {
  const { algorithm } = props;
  switch (algorithm.type) {
    case ConversionAlgorithmType.HotPixelRemoval:
      return <HotPixelsRemovalBlock {...props} algorithm={algorithm} />;
    case ConversionAlgorithmType.GaussianBlur:
      return <GaussianBlurBlock {...props} algorithm={algorithm} />;
    case ConversionAlgorithmType.MedianBlur:
      return <MedianBlurBlock {...props} algorithm={algorithm} />;
    case ConversionAlgorithmType.LinearTransform:
      return <LinearFunctionBlock {...props} algorithm={algorithm} />;
    default:
      return <SimpleAlgorithmBlock {...props} algorithm={algorithm} />;
  }
};

export default AlgorithmBlock;
