"use client";

import React, { useRef, useState } from 'react';

interface FileSelectorProps {
  onVideoSelect: (file: File) => void;
  onSubtitleSelect: (file: File) => void;
}

const FileSelector: React.FC<FileSelectorProps> = ({ onVideoSelect, onSubtitleSelect }) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const [selectedVideoName, setSelectedVideoName] = useState<string>('');
  const [selectedSubtitleName, setSelectedSubtitleName] = useState<string>('');

  const handleVideoButtonClick = () => {
    if (videoInputRef.current) {
      videoInputRef.current.click();
    }
  };

  const handleSubtitleButtonClick = () => {
    if (subtitleInputRef.current) {
      subtitleInputRef.current.click();
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedVideoName(file.name);
      console.log('Selected video file:', file.name, file.type, file.size);
      onVideoSelect(file);
    }
  };

  const handleSubtitleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedSubtitleName(file.name);
      console.log('Selected subtitle file:', file.name, file.type, file.size);
      onSubtitleSelect(file);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-100 rounded-lg">
        <div className="flex-1">
          <input
            type="file"
            ref={videoInputRef}
            onChange={handleVideoFileChange}
            accept="video/*,.ogv"
            className="hidden"
          />
          <button
            onClick={handleVideoButtonClick}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Select Video File
          </button>
        </div>

        <div className="flex-1">
          <input
            type="file"
            ref={subtitleInputRef}
            onChange={handleSubtitleFileChange}
            accept=".srt,.vtt,.ass,.ssa"
            className="hidden"
          />
          <button
            onClick={handleSubtitleButtonClick}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg"
          >
            Select Subtitle File (Optional)
          </button>
        </div>
      </div>

      {/* Display selected file names */}
      <div className="px-4">
        {selectedVideoName && (
          <div className="text-green-500 font-medium mb-1">
            <span className="font-bold">Selected video:</span> {selectedVideoName}
          </div>
        )}
        {selectedSubtitleName && (
          <div className="text-green-500 font-medium">
            <span className="font-bold">Selected subtitle:</span> {selectedSubtitleName}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileSelector;
