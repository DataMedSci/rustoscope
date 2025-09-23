import React, { useState, useEffect } from "react";
import { ConversionAlgorithm } from "@/models/algorithms";
import AlgorithmBlockHeader from "./AlgorithmBlockHeader";
import { AlgorithmBlockProps } from ".";

type LinearFunctionProps = AlgorithmBlockProps & {
  algorithm: ConversionAlgorithm & { a: number; b: number };
};

// Regex: optional "-", then digits (optional), then optional ".", then digits (optional)
const floatRegex = /^-?\d*(\.\d*)?$/;

const LinearFunctionBlock = ({
  idx,
  algorithm,
  setEnabled,
  removeAlgorithm,
  updateAlgorithm,
  moveUp,
  moveDown,
  isFirst,
  isLast,
}: LinearFunctionProps) => {
  // Local inputs (as string)
  const [aInput, setAInput] = useState(algorithm.a.toString());
  const [bInput, setBInput] = useState(algorithm.b.toString());

  // Error messages
  const [aError, setAError] = useState<string | null>(null);
  const [bError, setBError] = useState<string | null>(null);

  // Keep local state in sync if algorithm updates from outside
  useEffect(() => {
    setAInput(algorithm.a.toString());
  }, [algorithm.a]);
  useEffect(() => {
    setBInput(algorithm.b.toString());
  }, [algorithm.b]);

  const handleChange = (
    value: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    key: "a" | "b"
  ) => {
    if (value === "" || floatRegex.test(value)) {
      // Valid so far
      setInput(value);
      setError(null);

      // Update algorithm only if value is a valid number (not just "-", ".", "-.")
      if (value !== "" && value !== "-" && value !== "." && value !== "-.") {
        updateAlgorithm(idx, { [key]: parseFloat(value) });
      }
    } else {
      // Invalid character entered
      setInput(value);
      setError("Invalid number format");
    }
  };

  return (
    <div
      key={idx}
      className="relative flex w-full flex-col border rounded p-3 mb-1"
    >
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

      <div className="flex gap-6 mt-2">
        <div className="flex flex-col">
          <label>
            a:
            <input
              type="text"
              className={`ml-2 border rounded px-1 w-24 ${
                aError ? "border-red-500" : ""
              }`}
              value={aInput}
              onChange={(e) =>
                handleChange(e.currentTarget.value, setAInput, setAError, "a")
              }
            />
          </label>
          {aError && <span className="text-red-500 text-sm">{aError}</span>}
        </div>

        <div className="flex flex-col">
          <label>
            b:
            <input
              type="text"
              className={`ml-2 border rounded px-1 w-24 ${
                bError ? "border-red-500" : ""
              }`}
              value={bInput}
              onChange={(e) =>
                handleChange(e.currentTarget.value, setBInput, setBError, "b")
              }
            />
          </label>
          {bError && <span className="text-red-500 text-sm">{bError}</span>}
        </div>
      </div>
    </div>
  );
};

export default LinearFunctionBlock;
