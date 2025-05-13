"use client";

import { useState } from 'react';
import FileSelector from '@/components/FileSelector';
import VideoPlayer from '@/components/VideoPlayer';
import SubtitleDisplay from '@/components/SubtitleDisplay';
import SubtitleGenerator from '@/components/SubtitleGenerator';
import SubtitleSyncControls from '@/components/SubtitleSyncControls';
import useSubtitleSync from '@/hooks/useSubtitleSync';

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitleDelay, setSubtitleDelay] = useState(0); // Manual offset in seconds

  // Use the subtitle sync hook for displaying subtitles with manual offset
  const { currentSubtitle, detectedLanguage } = useSubtitleSync(subtitleFile, currentTime, subtitleDelay);

  const handleVideoFileSelect = (file: File) => {
    // Reset subtitle file when a new video is loaded
    if (videoFile?.name !== file.name) {
      setSubtitleFile(null);
    }
    setVideoFile(file);
  };

  const handleSubtitleFileSelect = (file: File) => {
    setSubtitleFile(file);
  };

  const handleGeneratedSubtitles = (srtContent: string) => {
    // Create a Blob from the SRT content
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const file = new File([blob], 'generated-subtitles.srt', { type: 'text/plain' });
    setSubtitleFile(file);
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <h1 className="text-3xl font-bold mb-8">Video Subtitle Player</h1>

      <div className="w-full max-w-4xl mb-6">
        <FileSelector
          onVideoSelect={handleVideoFileSelect}
          onSubtitleSelect={handleSubtitleFileSelect}
          currentVideoName={videoFile?.name}
        />
      </div>

      {videoFile && (
        <div className="w-full max-w-4xl space-y-4">
          <SubtitleGenerator
            videoFile={videoFile}
            onSubtitlesGenerated={handleGeneratedSubtitles}
            onSubtitlesCleared={() => setSubtitleFile(null)}
          />
          <div className="relative">
            <VideoPlayer
              videoFile={videoFile}
              subtitleFile={subtitleFile}
              onTimeUpdate={handleTimeUpdate}
              onSubtitleChange={() => {}} // We're using the hook now
            />
          </div>

          <div className="w-full h-32 p-4 bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
            <SubtitleDisplay
              text={currentSubtitle}
              videoKey={videoFile ? videoFile.name : undefined}
              language={detectedLanguage}
            />
          </div>

          {/* Add subtitle sync controls */}
          <SubtitleSyncControls
            onDelayChange={setSubtitleDelay}
            currentDelay={subtitleDelay}
          />
        </div>
      )}

      {!videoFile && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg mt-8">
          <p className="text-xl text-gray-500">
            Select a video file to get started
          </p>
        </div>
      )}
    </main>
  );
}
