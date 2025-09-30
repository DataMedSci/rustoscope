import React, {useState, useEffect} from 'react';
import { ConversionAlgorithm, GaussianBlur } from '@/models/algorithms';
import AlgorithmBlockHeader from './AlgorithmBlockHeader';

type GaussianBlurBlockProps = {
  idx: number;
  algorithm: GaussianBlur & { enabled: boolean };
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

const positiveFloatRegex = /^\d*(\.\d*)?$/; // matches "123", "0.5", ".5", "0."

const GaussianBlurBlock = ({
  idx,
  algorithm,
  setEnabled,
  removeAlgorithm,
  updateAlgorithm,
  moveUp,
  moveDown,
  isFirst,
  isLast,
}: GaussianBlurBlockProps) => {
  const [inputValue, setInputValue] = useState(algorithm.sigma.toString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputValue(algorithm.sigma.toString());
  }, [algorithm.sigma]);

  const handleChange = (val: string) => {
    if (val === "" || positiveFloatRegex.test(val)) {
      setInputValue(val);
      setError(null);
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        updateAlgorithm(idx, { sigma: num });
      }
    } else {
      setInputValue(val);
      setError('Invalid number format');
    }
  };

  return (
    <div className="relative flex w-full flex-col border rounded p-3 mb-1">
      <AlgorithmBlockHeader
        idx={idx}
        algorithm={algorithm}
        setEnabled={setEnabled}
        removeAlgorithm={removeAlgorithm}
        moveUp={moveUp}
        moveDown={moveDown}
        isFirst={isFirst}
        isLast={isLast}
      />
      <div className="flex flex-col gap-1 mt-2">
        <label className="flex items-center gap-2">
          Sigma:
          <input
            type="text"
            className={`ml-2 border rounded px-1 w-24 ${error ? 'border-red-500' : ''}`}
            value={inputValue}
            onChange={(e) => handleChange(e.currentTarget.value)}
          />
        </label>
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
    </div>
  );
};

export default GaussianBlurBlock;