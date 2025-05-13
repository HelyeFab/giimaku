"use client";

import React, { useRef, useState, useEffect } from 'react';

interface FileSelectorProps {
  onVideoSelect: (file: File) => void;
  onSubtitleSelect: (file: File) => void;
  currentVideoName?: string; // Add current video name for validation
}

const FileSelector: React.FC<FileSelectorProps> = ({
  onVideoSelect,
  onSubtitleSelect,
  currentVideoName = ''
}) => {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const [selectedVideoName, setSelectedVideoName] = useState<string>('');
  const [selectedSubtitleName, setSelectedSubtitleName] = useState<string>('');

  // Reset subtitle display when video changes
  useEffect(() => {
    if (currentVideoName && currentVideoName !== selectedVideoName) {
      setSelectedSubtitleName('');
      // Reset the subtitle input field
      if (subtitleInputRef.current) {
        subtitleInputRef.current.value = '';
      }
    }
  }, [currentVideoName, selectedVideoName]);

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

  // Helper function to check if subtitle likely belongs to the video
  const isSubtitleMatchingVideo = (subtitleName: string, videoName: string): boolean => {
    if (!videoName) return true; // If no video is loaded, don't validate

    // Remove extensions from both names
    const subtitleBaseName = subtitleName.replace(/\.[^/.]+$/, "");
    const videoBaseName = videoName.replace(/\.[^/.]+$/, "");

    // Check if subtitle name contains video name or vice versa
    // This is a simple heuristic that can be improved
    return (
      subtitleBaseName.includes(videoBaseName) ||
      videoBaseName.includes(subtitleBaseName) ||
      // Check for common naming patterns like "movie_name.en.srt" for "movie_name.mp4"
      subtitleBaseName.startsWith(videoBaseName + '.') ||
      // Allow exact match of base names
      subtitleBaseName === videoBaseName
    );
  };

  const handleSubtitleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Validate if subtitle likely belongs to current video
      if (currentVideoName && !isSubtitleMatchingVideo(file.name, currentVideoName)) {
        const confirmLoad = window.confirm(
          `The subtitle file "${file.name}" may not match the current video "${currentVideoName}". Load it anyway?`
        );

        if (!confirmLoad) {
          // Reset the file input
          if (subtitleInputRef.current) {
            subtitleInputRef.current.value = '';
          }
          return;
        }
      }

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
