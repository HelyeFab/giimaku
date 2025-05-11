"use client";

import { useState } from 'react';
import FileSelector from '@/components/FileSelector';
import VideoPlayer from '@/components/VideoPlayer';
import SubtitleDisplay from '@/components/SubtitleDisplay';
import SubtitleGenerator from '@/components/SubtitleGenerator';

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitle, setSubtitle] = useState<string>('');

  const handleVideoFileSelect = (file: File) => {
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
        />
      </div>

      {videoFile && (
        <div className="w-full max-w-4xl space-y-4">
          <SubtitleGenerator
            videoFile={videoFile}
            onSubtitlesGenerated={handleGeneratedSubtitles}
          />
          <div className="relative aspect-video">
            <VideoPlayer
              videoFile={videoFile}
              subtitleFile={subtitleFile}
              onTimeUpdate={handleTimeUpdate}
              onSubtitleChange={setSubtitle}
            />
          </div>

          <div className="w-full p-4 bg-gray-800 rounded-lg min-h-16 flex items-center justify-center">
            <SubtitleDisplay text={subtitle} />
          </div>
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
