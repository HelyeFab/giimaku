import { useState, useEffect, useRef } from 'react';
import { getConfig, hasValidConfig } from '@/utils/config';
import { extractAudioFromVideo } from '@/utils/audioExtractor';
import { generateSubtitles } from '@/utils/subtitleGenerator';
import {
  hasStoredSubtitles,
  getStoredSubtitles,
  storeSubtitles,
  deleteStoredSubtitles
} from '@/utils/subtitleStorage';

interface SubtitleGeneratorProps {
  videoFile: File | null;
  onSubtitlesGenerated: (srtContent: string) => void;
  onSubtitlesCleared?: () => void; // Add callback for when subtitles are cleared
}

export default function SubtitleGenerator({
  videoFile,
  onSubtitlesGenerated,
  onSubtitlesCleared
}: SubtitleGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState(getConfig().openaiApiKey);
  const [isConfigValid, setIsConfigValid] = useState(hasValidConfig());
  const [error, setError] = useState<string | null>(null);
  const [hasStoredSubs, setHasStoredSubs] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Use a ref to track the current video file and prevent infinite loops
  const loadedVideoRef = useRef<string | null>(null);

  // Check if we have stored subtitles for this video and load them automatically
  useEffect(() => {
    if (!videoFile) {
      setHasStoredSubs(false);
      loadedVideoRef.current = null;
      return;
    }

    // Generate a unique identifier for the video
    const videoId = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
    console.log('Checking for stored subtitles with video ID:', videoId);

    // Debug: Log all localStorage keys
    console.log('All localStorage keys:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      console.log(`- ${key}`);
    }

    // If we've already loaded subtitles for this video, don't do it again
    if (loadedVideoRef.current === videoId) {
      console.log('Subtitles already loaded for this video, skipping check');
      return;
    }

    const hasStored = hasStoredSubtitles(videoFile);
    console.log('Has stored subtitles:', hasStored);
    setHasStoredSubs(hasStored);

    // If we have stored subtitles, load them automatically
    if (hasStored) {
      console.log('Found stored subtitles for this video, loading automatically');
      const storedSubtitles = getStoredSubtitles(videoFile);
      if (storedSubtitles) {
        // Mark this video as loaded to prevent infinite loops
        loadedVideoRef.current = videoId;
        console.log('Loaded subtitles length:', storedSubtitles.length);

        onSubtitlesGenerated(storedSubtitles);

        // Show notification
        setNotification('Loaded stored subtitles for this video');
        // Clear notification after 3 seconds
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      } else {
        console.log('Failed to get stored subtitles despite hasStoredSubtitles returning true');
      }
    } else {
      console.log('No stored subtitles found for this video');
    }
  }, [videoFile]); // Remove onSubtitlesGenerated from dependencies

  // Load stored subtitles
  const handleLoadStored = () => {
    if (!videoFile) return;

    try {
      const storedSubtitles = getStoredSubtitles(videoFile);
      if (storedSubtitles) {
        // Generate a unique identifier for the video
        const videoId = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
        // Mark this video as loaded to prevent infinite loops
        loadedVideoRef.current = videoId;

        onSubtitlesGenerated(storedSubtitles);
        console.log('Loaded stored subtitles');

        // Show notification
        setNotification('Loaded stored subtitles');
        // Clear notification after 3 seconds
        setTimeout(() => {
          setNotification(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to load stored subtitles:', error);
      setError('Failed to load stored subtitles');
    }
  };

  // Delete stored subtitles
  const handleDeleteStored = () => {
    if (!videoFile) return;

    try {
      deleteStoredSubtitles(videoFile);
      setHasStoredSubs(false);
      // Reset the loaded video ref to allow loading subtitles again
      loadedVideoRef.current = null;
      console.log('Deleted stored subtitles');

      // Notify parent component that subtitles were cleared
      if (onSubtitlesCleared) {
        onSubtitlesCleared();
      }

      // Show notification
      setNotification('Deleted stored subtitles');
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete stored subtitles:', error);
      setError('Failed to delete stored subtitles');
    }
  };

  const handleGenerate = async () => {
    if (!videoFile || !apiKey) {
      setError('Please provide both a video file and an API key');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);

      // Extract audio from video
      const audioBlob = await extractAudioFromVideo(videoFile, (progress) => {
        setProgress(progress * 0.5); // First 50% of progress
      });

      // Generate subtitles
      const subtitles = await generateSubtitles(audioBlob, apiKey, (progress) => {
        setProgress(0.5 + progress * 0.5); // Last 50% of progress
      });

      // Store the generated subtitles for future use
      storeSubtitles(videoFile, subtitles);
      setHasStoredSubs(true);

      // Generate a unique identifier for the video
      const videoId = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
      // Mark this video as loaded to prevent infinite loops
      loadedVideoRef.current = videoId;

      // Show notification
      setNotification('Subtitles generated and stored for future use');
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);

      onSubtitlesGenerated(subtitles);
    } catch (error) {
      // Handle rate limiting error with a more user-friendly message
      if (error instanceof Error && error.message.includes('rate limit exceeded')) {
        setError(
          'OpenAI API rate limit exceeded. This typically happens when you make too many requests in a short period. ' +
          'Please wait a few minutes and try again, or use a different API key.'
        );
      } else {
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Generate Subtitles</h2>

      {!isConfigValid && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            OpenAI API Key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </label>
          <p className="text-sm text-gray-400 mt-2">
            Please add your OpenAI API key to the .env.local file or enter it here.
          </p>
        </div>
      )}

      {hasStoredSubs && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleLoadStored}
            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium"
          >
            Load Stored Subtitles
          </button>
          <button
            onClick={handleDeleteStored}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium"
          >
            Delete
          </button>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !videoFile || !apiKey}
        className={`w-full py-2 px-4 rounded-md ${
          isGenerating
            ? 'bg-blue-500/50 cursor-not-allowed'
            : hasStoredSubs
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isGenerating
          ? 'Generating...'
          : hasStoredSubs
            ? 'Regenerate Subtitles'
            : 'Generate Subtitles'
        }
      </button>

      {isGenerating && (
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="text-sm text-center mt-2">
            {progress < 0.5
              ? 'Extracting audio...'
              : 'Generating subtitles...'}
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 text-red-500 text-sm">{error}</p>
      )}

      {notification && (
        <div className="mt-4 p-2 bg-green-600/20 border border-green-600 rounded-md">
          <p className="text-green-400 text-sm text-center">{notification}</p>
        </div>
      )}
    </div>
  );
}
