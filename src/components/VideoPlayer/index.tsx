"use client";

import React, { useEffect, useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import dynamic from 'next/dynamic';
import { transcodeOgvToMp4, TranscodingProgress } from '../../utils/videoTranscoder';
import { parseSRT } from '@/utils/srtParser';
import VideoWithTheora from './VideoWithTheora';

interface VideoPlayerProps {
  videoFile: File;
  subtitleFile?: File | null;
  onTimeUpdate: (time: number) => void;
  onSubtitleChange: (text: string) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoFile,
  subtitleFile,
  onTimeUpdate,
  onSubtitleChange
}) => {
  const videoRef = useRef<any>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [subtitleDelay, setSubtitleDelay] = useState<number>(0); // Delay in seconds

  // Process video file and transcode if necessary
  useEffect(() => {
    if (videoFile) {
      try {
        setErrorMsg(null);
        setIsLoading(true);
        setIsReady(false);
        setTranscodingProgress(null);

        // Check if it's an OGV file that needs transcoding
        const isOgv = videoFile.name.toLowerCase().endsWith('.ogv') ||
          videoFile.type.includes('ogg');

        // Set a timeout to clear loading state if it takes too long
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }

        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
        }, 10000); // 10 seconds max loading time for transcoding

        // Cleanup function for URL objects
        let cleanupUrls: string[] = [];

        const processVideo = async () => {
          if (isOgv) {
            console.log('Processing OGV file:', videoFile.name);
            // Transcode OGV to MP4
            try {
              const url = await transcodeOgvToMp4(videoFile, (progress) => {
                console.log('Transcoding progress:', progress.ratio);
                setTranscodingProgress(progress.ratio * 100);
              });
              cleanupUrls.push(url);
              setVideoUrl(url);
            } catch (error) {
              console.error('Transcoding failed:', error);
              setErrorMsg('Failed to transcode OGV file. Try a different format.');
              setIsLoading(false);
            }
          } else {
            // For non-OGV files, just create a URL
            const url = URL.createObjectURL(videoFile);
            console.log('Video URL created:', url, 'Type:', videoFile.type);
            cleanupUrls.push(url);
            setVideoUrl(url);
          }
        };

        processVideo();

        return () => {
          // Clean up all created URLs
          cleanupUrls.forEach(url => URL.revokeObjectURL(url));
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
        };
      } catch (err) {
        console.error('Error processing video:', err);
        setErrorMsg('Failed to load video');
        setIsLoading(false);
      }
    }
  }, [videoFile]);

  // Process subtitle file if provided
  useEffect(() => {
    if (subtitleFile) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          try {
            console.log('Subtitle file loaded, processing...');
            const parsedSubtitles = parseSRT(result);
            console.log(`Parsed ${parsedSubtitles.length} subtitles`);
            setSubtitles(parsedSubtitles);
          } catch (error) {
            console.error('Failed to parse subtitle file:', error);
          }
        }
      };
      reader.readAsText(subtitleFile);
    }
  }, [subtitleFile]);

  // Handle video events for HTML5 video element
  const handleNativeTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget) {
      const currentTime = e.currentTarget.currentTime;
      console.log('Native video time update:', currentTime);
      onTimeUpdate(currentTime);
      updateSubtitles(currentTime);
    }
  };

  // Handle time update for ReactPlayer or other sources
  const handlePlayerTimeUpdate = () => {
    console.log('Player time update event fired');
    if (videoRef.current && videoRef.current.getInternalPlayer) {
      const player = videoRef.current.getInternalPlayer();
      if (player) {
        const currentTime = player.currentTime || 0;
        onTimeUpdate(currentTime);
        updateSubtitles(currentTime);
      }
    }
  };

  // Update subtitles based on current time
  const updateSubtitles = (currentTime: number) => {
    // Log current playback time and number of subtitles
    console.log(`Updating subtitles at ${currentTime}s, total subtitles: ${subtitles.length}`);
    const currentSubtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );

    if (currentSubtitle) {
      console.log(`Found subtitle: ${currentSubtitle.text}`);
      console.log(`Time range: ${currentSubtitle.start}s - ${currentSubtitle.end}s`);
      onSubtitleChange(currentSubtitle.text);
    } else {
      onSubtitleChange('');
    }
  };

  const handleVideoLoaded = () => {
    console.log('Video loaded');
    setIsLoading(false);
    setIsReady(true);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  const handleVideoError = (e: any) => {
    console.error('Video error:', e);
    setErrorMsg('Error playing this video format. Try a different file or format.');
    setIsLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  return (
    <div className="w-full h-full bg-black rounded-lg overflow-hidden relative">
      {videoUrl ? (
        <div className="w-full h-full flex items-center justify-center">
          {/* Special handling for OGV (Ogg Theora) files */}
          {videoFile.name.toLowerCase().endsWith('.ogv') || videoFile.type.includes('ogg') ? (
            <VideoWithTheora
              src={videoUrl || ''}
              className="w-full h-full max-h-full"
              onLoadedData={handleVideoLoaded}
              onTimeUpdate={(time) => {
                console.log('Theora time update:', time);
                onTimeUpdate(time);
                updateSubtitles(time);
              }}
              onError={handleVideoError}
              onPlay={() => console.log('Video started playing with Theora')}
            />
          ) : (
            <ReactPlayer
              ref={videoRef as any}
              className="w-full h-full max-h-full"
              url={videoUrl}
              controls={true}
              playing={true}
              width="100%"
              height="100%"
              onReady={handleVideoLoaded}
              onProgress={({ playedSeconds }) => {
                console.log('ReactPlayer progress:', playedSeconds);
                onTimeUpdate(playedSeconds);
                updateSubtitles(playedSeconds);
              }}
              onError={handleVideoError}
              onPlay={() => console.log('Video started playing')}
              config={{
                file: {
                  attributes: {
                    onTimeUpdate: handlePlayerTimeUpdate
                  },
                  forceVideo: true
                },
                // Enable additional player backends for wider format support
                youtube: {
                  playerVars: { showinfo: 1 }
                },
                facebook: {
                  appId: '12345'
                }
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-white text-xl">Select a video file to start playback</p>
        </div>
      )}

      {isLoading && !isReady && !errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white text-xl">
              {transcodingProgress !== null
                ? `Transcoding video: ${Math.round(transcodingProgress)}%`
                : 'Loading video...'}
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-20">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md">
            <p className="text-red-500 text-xl font-bold p-4 text-center">{errorMsg}</p>
            <p className="text-white text-center mt-2">The video format may not be supported by your browser.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
