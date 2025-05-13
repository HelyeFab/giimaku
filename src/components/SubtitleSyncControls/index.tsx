"use client";

import React, { useState, useEffect } from 'react';

interface SubtitleSyncControlsProps {
  onDelayChange: (delay: number) => void;
  currentDelay: number;
}

const SubtitleSyncControls: React.FC<SubtitleSyncControlsProps> = ({
  onDelayChange,
  currentDelay
}) => {
  const [localDelay, setLocalDelay] = useState<number>(currentDelay);
  const [fineAdjustment, setFineAdjustment] = useState<boolean>(false);
  const [presets, setPresets] = useState<number[]>([]);

  useEffect(() => {
    setLocalDelay(currentDelay);
  }, [currentDelay]);

  const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDelay = parseFloat(e.target.value);
    setLocalDelay(newDelay);
    onDelayChange(newDelay);
  };

  const adjustDelay = (amount: number) => {
    const newDelay = parseFloat((localDelay + amount).toFixed(fineAdjustment ? 3 : 1));
    setLocalDelay(newDelay);
    onDelayChange(newDelay);
  };

  const savePreset = () => {
    if (!presets.includes(localDelay)) {
      const newPresets = [...presets, localDelay].sort((a, b) => a - b);
      setPresets(newPresets);
    }
  };

  const applyPreset = (preset: number) => {
    setLocalDelay(preset);
    onDelayChange(preset);
  };

  const removePreset = (preset: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(presets.filter(p => p !== preset));
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-white font-medium mr-2">
              Subtitle Sync: {localDelay > 0 ? '+' : ''}{localDelay.toFixed(fineAdjustment ? 3 : 1)}s
            </span>
            <button
              onClick={() => setFineAdjustment(!fineAdjustment)}
              className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-white rounded"
              title="Toggle fine adjustment mode"
            >
              {fineAdjustment ? 'Fine' : 'Normal'}
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={savePreset}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
              title="Save current delay as preset"
            >
              Save
            </button>
            <button
              onClick={() => onDelayChange(0)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Frame-perfect controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => adjustDelay(fineAdjustment ? -0.042 : -0.5)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            title={fineAdjustment ? "Adjust by -1 frame (24fps)" : "Adjust by -0.5 seconds"}
          >
            {fineAdjustment ? "-1f" : "-0.5s"}
          </button>
          <button
            onClick={() => adjustDelay(fineAdjustment ? -0.021 : -0.1)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            title={fineAdjustment ? "Adjust by -0.5 frame" : "Adjust by -0.1 seconds"}
          >
            {fineAdjustment ? "-0.5f" : "-0.1s"}
          </button>

          <input
            type="range"
            min={fineAdjustment ? "-2" : "-10"}
            max={fineAdjustment ? "2" : "10"}
            step={fineAdjustment ? "0.021" : "0.1"} // 0.021 is ~half a frame at 24fps
            value={localDelay}
            onChange={handleDelayChange}
            className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />

          <button
            onClick={() => adjustDelay(fineAdjustment ? 0.021 : 0.1)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            title={fineAdjustment ? "Adjust by +0.5 frame" : "Adjust by +0.1 seconds"}
          >
            {fineAdjustment ? "+0.5f" : "+0.1s"}
          </button>
          <button
            onClick={() => adjustDelay(fineAdjustment ? 0.042 : 0.5)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            title={fineAdjustment ? "Adjust by +1 frame (24fps)" : "Adjust by +0.5 seconds"}
          >
            {fineAdjustment ? "+1f" : "+0.5s"}
          </button>
        </div>

        {/* Presets */}
        {presets.length > 0 && (
          <div className="mt-2">
            <div className="text-sm text-gray-400 mb-1">Saved Presets:</div>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <div
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`px-2 py-1 rounded text-xs cursor-pointer flex items-center ${
                    preset === localDelay
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  <span>{preset > 0 ? '+' : ''}{preset.toFixed(3)}s</span>
                  <button
                    onClick={(e) => removePreset(preset, e)}
                    className="ml-1 text-gray-400 hover:text-gray-200"
                    title="Remove preset"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleSyncControls;
