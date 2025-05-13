import { useState, useEffect, useRef } from 'react';
import { parseSubtitles } from '@/utils/subtitleParser';
import { preprocessSubtitles } from '@/utils/subtitleSynchronizer';

interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface UseSubtitleSyncResult {
  currentSubtitle: string;
  detectedLanguage?: string;
  subtitles: Subtitle[]; // Expose subtitles for debugging or advanced controls
}

/**
 * Custom hook for synchronizing subtitles with video playback
 * This version uses a precision-focused approach with enhanced sync for Japanese
 * and supports manual offset adjustment
 *
 * @param subtitleFile - The subtitle file
 * @param currentTime - Current playback time in seconds
 * @param manualOffset - Manual offset in seconds (positive = delay, negative = advance)
 * @returns Object containing current subtitle text, detected language, and subtitles array
 */
export default function useSubtitleSync(
  subtitleFile: File | null,
  currentTime: number,
  manualOffset: number = 0
): UseSubtitleSyncResult {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>(undefined);
  const lastSubtitleRef = useRef<{ id: number, text: string, end: number } | null>(null);
  const timeOffsetRef = useRef<number>(0); // Dynamic time offset for fine-tuning

  // Store the original subtitle content
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [originalLanguage, setOriginalLanguage] = useState<string>('en');

  // Parse subtitle file when it changes
  useEffect(() => {
    // Reset state when subtitle file changes
    setCurrentSubtitle('');
    lastSubtitleRef.current = null;
    timeOffsetRef.current = 0;
    setOriginalContent(null);
    setOriginalLanguage('en');

    if (!subtitleFile) {
      setSubtitles([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          // Store the original content for later reprocessing
          setOriginalContent(content);

          // Parse the subtitles
          const parsedSubtitles = parseSubtitles(content, subtitleFile.name);

          // Detect language
          const language = detectLanguage(parsedSubtitles);
          setDetectedLanguage(language);
          setOriginalLanguage(language);

          // Apply precision timing adjustments
          const adjustedSubtitles = adjustSubtitleTiming(parsedSubtitles, language);

          // Set initial time offset based on language
          timeOffsetRef.current = language === 'ja' ? -0.4 : -0.2;

          // Use the subtitle library for frame-perfect synchronization
          // This will preprocess the subtitles with more precise timing
          try {
            // Convert manual offset from seconds to milliseconds
            const globalOffsetMs = manualOffset * 1000;

            // Preprocess the subtitles with the subtitle library
            const processedContent = await preprocessSubtitles(content, globalOffsetMs, language);

            // Parse the processed subtitles
            const processedSubtitles = parseSubtitles(processedContent, subtitleFile.name);

            // Use the processed subtitles if available
            if (processedSubtitles.length > 0) {
              console.log(`Using frame-perfect processed subtitles: ${processedSubtitles.length} cues`);
              setSubtitles(processedSubtitles);
            } else {
              // Fallback to the original adjusted subtitles
              console.log(`Falling back to standard subtitle processing: ${adjustedSubtitles.length} cues`);
              setSubtitles(adjustedSubtitles);
            }
          } catch (processingError) {
            console.error('Error in frame-perfect subtitle processing:', processingError);
            // Fallback to the original adjusted subtitles
            setSubtitles(adjustedSubtitles);
          }

          console.log(`Loaded subtitles, language: ${language}`);
        } catch (error) {
          console.error('Failed to parse subtitle file:', error);
          setSubtitles([]);
        }
      }
    };

    reader.readAsText(subtitleFile);
  }, [subtitleFile]);

  // Reprocess subtitles when manual offset changes
  useEffect(() => {
    // Skip if no original content or if this is the initial load
    if (!originalContent || !subtitleFile) {
      return;
    }

    const processSubtitlesWithOffset = async () => {
      try {
        console.log(`Reprocessing subtitles with manual offset: ${manualOffset}s`);

        // Convert manual offset from seconds to milliseconds
        const globalOffsetMs = manualOffset * 1000;

        // Preprocess the subtitles with the subtitle library using the new offset
        const processedContent = await preprocessSubtitles(originalContent, globalOffsetMs, originalLanguage);

        // Parse the processed subtitles
        const processedSubtitles = parseSubtitles(processedContent, subtitleFile.name);

        // Update the subtitles with the new processed version
        if (processedSubtitles.length > 0) {
          console.log(`Updated frame-perfect processed subtitles: ${processedSubtitles.length} cues`);
          setSubtitles(processedSubtitles);
        }
      } catch (error) {
        console.error('Error reprocessing subtitles with new offset:', error);
        // We don't need to fallback here since we already have subtitles loaded
      }
    };

    processSubtitlesWithOffset();
  }, [manualOffset, originalContent, subtitleFile, originalLanguage]);

  // Update current subtitle when time changes
  useEffect(() => {
    if (subtitles.length === 0) {
      setCurrentSubtitle('');
      return;
    }

    // Apply both the dynamic time offset and manual offset to the current time for better sync
    // Note: manualOffset is positive for delay, negative for advance
    const adjustedTime = currentTime + timeOffsetRef.current - manualOffset;

    // Find the subtitle that matches the adjusted time
    const currentSub = subtitles.find(
      sub => adjustedTime >= sub.start && adjustedTime <= sub.end
    );

    // Check for scene transitions
    const isSceneTransition = detectSceneTransition(adjustedTime, subtitles, lastSubtitleRef.current);

    // If we're at a scene transition, clear subtitles immediately
    if (isSceneTransition) {
      setCurrentSubtitle('');
      lastSubtitleRef.current = null;
      return;
    }

    // If we found a subtitle for the current time
    if (currentSub) {
      // Only update if it's different from what we're already showing
      if (!lastSubtitleRef.current || lastSubtitleRef.current.id !== currentSub.id) {
        // Update subtitle directly - the SubtitleDisplay component will handle smooth transitions
        setCurrentSubtitle(currentSub.text);
        lastSubtitleRef.current = {
          id: currentSub.id,
          text: currentSub.text,
          end: currentSub.end
        };

        // Adaptive timing: adjust offset based on subtitle transitions
        // If we're showing a new subtitle very early in its time window,
        // slightly increase the offset to show subtitles earlier
        const positionInSubtitle = (adjustedTime - currentSub.start) / (currentSub.end - currentSub.start);
        if (positionInSubtitle < 0.1) {
          // We're showing this subtitle very early in its window, adjust offset slightly
          timeOffsetRef.current -= 0.05; // Show subtitles 50ms earlier next time
        } else if (positionInSubtitle > 0.9) {
          // We're showing this subtitle very late in its window, adjust offset slightly
          timeOffsetRef.current += 0.05; // Show subtitles 50ms later next time
        }

        // Clamp the offset to reasonable values
        timeOffsetRef.current = Math.max(-0.8, Math.min(-0.1, timeOffsetRef.current));
      }
    }
    // If no subtitle should be shown at this time
    else {
      // Check if we're in a gap between subtitles
      const nextSub = subtitles.find(sub => adjustedTime < sub.start);

      // If we're very close to the next subtitle, show it early for better perception
      // BUT only if it's not a scene transition
      const isJapanese = detectedLanguage === 'ja';
      const lookAheadTime = isJapanese ? 0.2 : 0.1; // Reduced lookahead (200ms for Japanese, 100ms for others)

      const isNextSubtitleCloseEnough = nextSub && (nextSub.start - adjustedTime) <= lookAheadTime;
      const isProbablyNotSceneTransition = lastSubtitleRef.current && nextSub &&
        (nextSub.id - lastSubtitleRef.current.id <= 2) &&
        (nextSub.start - lastSubtitleRef.current.end <= 1.5);

      if (isNextSubtitleCloseEnough && isProbablyNotSceneTransition) {
        // We're very close to the next subtitle and it's probably not a scene transition
        setCurrentSubtitle(nextSub.text);
        lastSubtitleRef.current = {
          id: nextSub.id,
          text: nextSub.text,
          end: nextSub.end
        };
      } else {
        // Clear the current subtitle
        setCurrentSubtitle('');

        // But keep track of the last subtitle we showed
        if (lastSubtitleRef.current && adjustedTime > lastSubtitleRef.current.end) {
          // We've moved past it, so clear our reference
          lastSubtitleRef.current = null;
        }
      }
    }
  }, [currentTime, subtitles, detectedLanguage, manualOffset]);

  /**
   * Detect if we're at a scene transition point
   * @param currentTime - Current playback time
   * @param subtitles - All subtitles
   * @param lastSubtitle - The last subtitle we displayed
   * @returns True if we're at a scene transition
   */
  function detectSceneTransition(
    currentTime: number,
    subtitles: Subtitle[],
    lastSubtitle: { id: number, text: string, end: number } | null
  ): boolean {
    if (!lastSubtitle) return false;

    // Check if we've moved significantly forward in time
    const timeSinceLastSubtitle = currentTime - lastSubtitle.end;
    if (timeSinceLastSubtitle > 3.0) {
      return true; // More than 3 seconds since last subtitle ended
    }

    // Find the next subtitle after the last one we showed
    const nextSubtitleIndex = subtitles.findIndex(sub => sub.id > lastSubtitle.id);
    if (nextSubtitleIndex === -1) return false;

    const nextSubtitle = subtitles[nextSubtitleIndex];

    // Check for large gaps in subtitle IDs (missing numbers indicate potential scene changes)
    if (nextSubtitle.id - lastSubtitle.id > 3) {
      return true;
    }

    // Check for large time gaps between subtitles
    if (nextSubtitle.start - lastSubtitle.end > 2.0) {
      return true;
    }

    // Check for content discontinuity in Japanese text
    // This is a simplified approach - in a real system you might use more sophisticated NLP
    const isJapaneseContent = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(lastSubtitle.text);
    if (isJapaneseContent) {
      // Check if last subtitle ends with a sentence ending and next starts with a new topic
      const lastEndsWithSentenceEnding = /[。！？]$|(?:です|ます)$/.test(lastSubtitle.text);

      if (lastEndsWithSentenceEnding && nextSubtitle) {
        // If the next subtitle starts with a question or greeting, it's likely a new scene
        const nextStartsNewTopic = /^[いこそど何誰]|^(?:おはよう|こんにちは|こんばんは)/.test(nextSubtitle.text);
        if (nextStartsNewTopic) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Apply precision timing adjustments to subtitles
   * @param subtitles - The parsed subtitles
   * @param language - Detected language
   * @returns Adjusted subtitles
   */
  function adjustSubtitleTiming(subtitles: Subtitle[], language: string): Subtitle[] {
    if (subtitles.length === 0) return subtitles;

    const isJapanese = language === 'ja';
    const adjusted = [...subtitles];

    // Apply a small base offset to improve synchronization
    // Japanese needs a slightly different offset
    const baseOffset = isJapanese ? -0.25 : -0.15; // 250ms for Japanese, 150ms for others

    // First pass: apply base offset and ensure no negative start times
    adjusted.forEach(subtitle => {
      subtitle.start += baseOffset;
      subtitle.end += baseOffset;

      // Ensure no negative start times
      if (subtitle.start < 0) {
        subtitle.end -= subtitle.start; // Maintain duration
        subtitle.start = 0;
      }
    });

    // Second pass: analyze subtitle density and adjust timing accordingly
    // For dense subtitle sequences (many subtitles in a short time),
    // we need different timing than for sparse sequences
    const totalDuration = adjusted[adjusted.length - 1].end - adjusted[0].start;
    const subtitleDensity = adjusted.length / totalDuration; // subtitles per second

    // Apply density-based adjustments
    const isDenseSequence = subtitleDensity > 0.5; // More than 1 subtitle every 2 seconds

    if (isDenseSequence) {
      // For dense sequences, we need shorter durations and tighter timing
      const densityFactor = Math.min(1.5, subtitleDensity); // Cap at 1.5

      adjusted.forEach(subtitle => {
        // Compress duration slightly for dense sequences
        const duration = subtitle.end - subtitle.start;
        const compressedDuration = duration * (1 - (0.1 * densityFactor));
        subtitle.end = subtitle.start + compressedDuration;
      });
    }

    // Third pass: ensure minimum display duration based on text length
    adjusted.forEach(subtitle => {
      const textLength = subtitle.text.length;
      // Calculate reading time: Japanese needs slightly more time per character
      const charsPerSecond = isJapanese ? 10 : 15; // 10 chars/sec for Japanese, 15 for others
      const readingTime = textLength / charsPerSecond;

      // Minimum duration is reading time plus a small buffer
      const minDuration = Math.max(
        isJapanese ? 0.6 : 0.7, // Absolute minimum (600ms for Japanese, 700ms for others)
        readingTime + 0.3 // Reading time plus 300ms buffer
      );

      const duration = subtitle.end - subtitle.start;
      if (duration < minDuration) {
        subtitle.end = subtitle.start + minDuration;
      }
    });

    // Fourth pass: prevent overlaps with intelligent gap handling
    for (let i = 0; i < adjusted.length - 1; i++) {
      if (adjusted[i].end > adjusted[i + 1].start) {
        // Calculate how much text is in each subtitle to determine the best split point
        const currentTextLength = adjusted[i].text.length;
        const nextTextLength = adjusted[i + 1].text.length;

        // Split the overlap proportionally based on text length
        const totalTextLength = currentTextLength + nextTextLength;
        const overlapTime = adjusted[i].end - adjusted[i + 1].start;

        // Calculate the split point weighted by text length
        const splitRatio = currentTextLength / totalTextLength;
        const splitPoint = adjusted[i + 1].start + (overlapTime * splitRatio);

        adjusted[i].end = splitPoint;
        adjusted[i + 1].start = splitPoint;
      } else if ((adjusted[i + 1].start - adjusted[i].end) < 0.1) {
        // If there's a very small gap (less than 100ms), eliminate it
        // This prevents flickering between subtitles
        const midpoint = (adjusted[i].end + adjusted[i + 1].start) / 2;
        adjusted[i].end = midpoint;
        adjusted[i + 1].start = midpoint;
      }
    }

    return adjusted;
  }

  /**
   * Detect the language of subtitles
   * @param subtitles - The parsed subtitles
   * @returns Detected language code (ISO 639-1)
   */
  function detectLanguage(subtitles: Subtitle[]): string {
    if (subtitles.length === 0) return 'en';

    // Sample a few subtitles to detect language
    const sampleSize = Math.min(10, subtitles.length);
    const samples: string[] = [];

    // Get evenly distributed samples
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * (subtitles.length / sampleSize));
      if (subtitles[index] && subtitles[index].text) {
        samples.push(subtitles[index].text);
      }
    }

    const sampleText = samples.join(' ');

    // Check for Japanese characters (Hiragana, Katakana, Kanji ranges)
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japaneseRegex.test(sampleText)) {
      return 'ja';
    }

    // Default to English if not Japanese
    return 'en';
  }

  return {
    currentSubtitle,
    detectedLanguage,
    subtitles
  };
}
