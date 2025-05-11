"use client";

import React, { useEffect, useRef, useState, forwardRef } from 'react';

interface VideoWithTheoraProps {
  src: string;
  onLoadedData?: () => void;
  onTimeUpdate?: (time: number) => void;
  onError?: (e: any) => void;
  onPlay?: () => void;
  className?: string;
}

// This component is specifically optimized for Ogg Theora videos
const VideoWithTheora = forwardRef<HTMLVideoElement, VideoWithTheoraProps>(
  (props, ref) => {
    const {
      src,
      onLoadedData,
      onTimeUpdate,
      onError,
      onPlay,
      className
    } = props;

    const localVideoRef = useRef<HTMLVideoElement>(null);
    // Use the passed ref if available, otherwise use local ref
    const videoRef = (ref as React.RefObject<HTMLVideoElement>) || localVideoRef;
    const [isLoaded, setIsLoaded] = useState(false);

    // Add Theora-specific handling
    useEffect(() => {
      if (!videoRef.current) return;

      // Apply specific attributes that may help with Theora
      const video = videoRef.current;
      video.setAttribute('preload', 'auto');

      // Some browsers may need codec hints
      const sourceElement = document.createElement('source');
      sourceElement.src = src;
      sourceElement.type = 'video/ogg; codecs="theora, vorbis"';

      // Remove any existing source elements
      while (video.firstChild) {
        video.removeChild(video.firstChild);
      }

      // Add the source with proper codec information
      video.appendChild(sourceElement);

      // Force load
      video.load();

      return () => {
        // Clean up
        while (video.firstChild) {
          video.removeChild(video.firstChild);
        }
      };
    }, [src]);

    const handleTimeUpdate = () => {
      if (videoRef.current && onTimeUpdate) {
        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    const handleLoadedData = () => {
      setIsLoaded(true);
      if (onLoadedData) {
        onLoadedData();
      }
    };

    return (
      <video
        ref={videoRef}
        className={className || "w-full h-full max-h-full"}
        controls
        playsInline
        autoPlay
        onLoadedData={handleLoadedData}
        onTimeUpdate={handleTimeUpdate}
        onError={onError}
        onPlay={onPlay}
      />
    );
  }
);

export default VideoWithTheora;
