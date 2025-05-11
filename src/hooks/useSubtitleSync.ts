import { useState, useEffect } from 'react';
import { parseSubtitles } from '@/utils/subtitleParser';

interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Custom hook for synchronizing subtitles with video playback
 *
 * @param subtitleFile - The subtitle file
 * @param currentTime - Current playback time in seconds
 * @returns The current subtitle text that should be displayed
 */
export default function useSubtitleSync(subtitleFile: File | null, currentTime: number) {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

  // Parse subtitle file when it changes
  useEffect(() => {
    if (!subtitleFile) {
      setSubtitles([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const parsedSubtitles = parseSubtitles(content, subtitleFile.name);
          setSubtitles(parsedSubtitles);
        } catch (error) {
          console.error('Failed to parse subtitle file:', error);
          setSubtitles([]);
        }
      }
    };

    reader.readAsText(subtitleFile);
  }, [subtitleFile]);

  // Update current subtitle when time changes
  useEffect(() => {
    const subtitle = subtitles.find(
      sub => currentTime >= sub.start && currentTime <= sub.end
    );

    setCurrentSubtitle(subtitle?.text || '');
  }, [currentTime, subtitles]);

  return currentSubtitle;
}
