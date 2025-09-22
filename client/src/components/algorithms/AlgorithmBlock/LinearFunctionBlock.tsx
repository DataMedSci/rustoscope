import { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { TargetedEvent } from 'preact';
import { ConversionAlgorithm, ConversionAlgorithmType } from '@/models/algorithms';

type Props = {
  algorithm: ConversionAlgorithm;
  onChange: (alg: ConversionAlgorithm) => void;
  onRemove?: () => void;
};

const LinearFunctionBlock = ({ algorithm, onChange, onRemove }: Props): JSX.Element => {
  const initialA = (algorithm as any).a ?? 1;
  const initialB = (algorithm as any).b ?? 0;

  const [enabled, setEnabled] = useState<boolean>(!!algorithm.enabled);
  const [a, setA] = useState<number>(Number(initialA));
  const [b, setB] = useState<number>(Number(initialB));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(!!algorithm.enabled);
    setA(Number((algorithm as any).a ?? 1));
    setB(Number((algorithm as any).b ?? 0));
  }, [algorithm]);

  const pushChange = (next: Partial<ConversionAlgorithm>) => {
    const merged = {
      ...algorithm,
      ...next,
    } as ConversionAlgorithm;
    onChange(merged);
  };

  const handleEnabledToggle = (ev: TargetedEvent<HTMLInputElement, Event>) => {
    const v = ev.currentTarget.checked;
    setEnabled(v);
    pushChange({ enabled: v });
  };

  const handleAChange = (ev: TargetedEvent<HTMLInputElement, Event>) => {
    const v = ev.currentTarget.value;
    const n = Number(v);
    setA(n);
    if (!Number.isFinite(n)) {
      setLocalError('a must be a finite number');
      return;
    }
    setLocalError(null);
    pushChange({ ...(algorithm as any), a: n });
  };

  const handleBChange = (ev: TargetedEvent<HTMLInputElement, Event>) => {
    const v = ev.currentTarget.value;
    const n = Number(v);
    setB(n);
    if (!Number.isFinite(n)) {
      setLocalError('b must be a finite number');
      return;
    }
    setLocalError(null);
    pushChange({ ...(algorithm as any), b: n });
  };

  return (
    <div className="border rounded p-2 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <input
            id={`linear-enabled-${(algorithm as any).id ?? ''}`}
            type="checkbox"
            checked={enabled}
            onChange={handleEnabledToggle}
            className="w-4 h-4"
          />
          <label className="font-medium">Linear transform</label>
          <span className="text-sm text-gray-500 ml-2">y = a·x + b</span>
        </div>
        <div className="flex items-center gap-2">
          {onRemove ? (
            <button
              className="text-sm text-red-600 hover:underline"
              onClick={() => onRemove()}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col text-sm">
          <span className="text-xs text-gray-600">a</span>
          <input
            type="number"
            step="any"
            value={Number.isNaN(a) ? '' : a}
            onInput={handleAChange}
            className="border p-1 rounded"
          />
        </label>

        <label className="flex flex-col text-sm">
          <span className="text-xs text-gray-600">b</span>
          <input
            type="number"
            step="any"
            value={Number.isNaN(b) ? '' : b}
            onInput={handleBChange}
            className="border p-1 rounded"
          />
        </label>
      </div>

      {localError ? <div className="text-xs text-red-600 mt-2">{localError}</div> : null}
    </div>
  );
};

export default LinearFunctionBlock;