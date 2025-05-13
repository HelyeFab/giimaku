import OpenAI from 'openai';

interface WhisperResponse {
  text: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

interface Segment {
  index: number;
  start: number;
  end: number;
  text: string;
  charCount: number;
  sceneId?: number;
}

export const generateSubtitles = async (
  audioBlob: Blob,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Helper function to safely update progress
    const updateProgress = (value: number) => {
      if (onProgress) {
        // Ensure progress is between 0 and 1
        const clampedValue = Math.max(0, Math.min(1, value));
        onProgress(clampedValue);
      }
    };

    // Start with initial progress
    updateProgress(0.05);
    console.log('Starting subtitle generation process...');

    // Initialize OpenAI client with the provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Allow usage in browser environment
    });

    // Preparing audio file: 5-10% progress
    console.log('Preparing audio file for Whisper API...');
    updateProgress(0.1);

    // Convert Blob to File object for OpenAI SDK
    const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
    console.log('Audio file size:', audioBlob.size, 'bytes');
    updateProgress(0.15);

    // This is the longest part of the process, so we'll update progress periodically
    // to show that something is happening
    let currentProgress = 0.15;
    const apiProgressInterval = setInterval(() => {
      // Gradually increase progress from 15% to 45% while waiting for API
      currentProgress = Math.min(0.45, currentProgress + 0.01);
      updateProgress(currentProgress);
    }, 1000); // Update every second

    // Use the OpenAI SDK to transcribe the audio
    let result: WhisperResponse;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json'
      });

      // Clear the interval once we get a response
      clearInterval(apiProgressInterval);
      updateProgress(0.5);

      console.log('Received response from Whisper API');

      // Parse the response
      updateProgress(0.55);
      result = transcription as unknown as WhisperResponse;
      console.log('Successfully parsed Whisper API response, segments:', result.segments.length);
      updateProgress(0.6);
    } catch (error) {
      // Clear the interval if there's an error
      clearInterval(apiProgressInterval);

      // Handle rate limiting error specifically
      if (error instanceof Error && error.message.includes('rate limit')) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later or use a different API key.');
      } else {
        throw error;
      }
    }

    // Converting to SRT format: 60-100% progress
    console.log('Converting response to SRT format...');
    updateProgress(0.65);
    // Convert the response to SRT format with adjusted timing
    let srtContent = '';
    const BASE_MIN_DURATION = 6.0; // Base minimum duration in seconds
    const OVERLAP = 2.0; // Increased overlap between segments in seconds
    const CHARS_PER_SECOND = 10; // Reading speed: characters per second
    const EXTRA_TIME = 2.0; // Extra time added to all subtitles

    // First pass: calculate extended durations and detect scene transitions
    updateProgress(0.7);
    const processedSegments: Segment[] = [];
    let currentSceneId = 1;
    let lastSpeechEnd = 0;

    // Process each segment from the API response
    for (let index = 0; index < result.segments.length; index++) {
      const segment = result.segments[index];
      const text = segment.text.trim();
      const charCount = text.length;

      // Skip empty segments
      if (charCount === 0) continue;

      // Calculate reading time based on character count
      const readingTime = charCount / CHARS_PER_SECOND;

      // Calculate minimum duration based on reading time
      const minDuration = Math.max(BASE_MIN_DURATION, readingTime + EXTRA_TIME);

      // Calculate actual duration
      const actualDuration = segment.end - segment.start;

      // Ensure each subtitle stays visible for at least the calculated minimum duration
      const extendedDuration = Math.max(actualDuration, minDuration);

      // Calculate start and end times
      const start = segment.start;
      let end = Math.max(segment.end, segment.start + extendedDuration);

      // Detect if this is likely a new scene
      const isNewScene = index > 0 && (
        // Large time gap indicates scene change
        (segment.start - lastSpeechEnd > 3.0) ||

        // Check for Japanese scene transition indicators
        (
          /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && // Contains Japanese text
          // Starts with common scene transition phrases
          /^(いつ|どこ|なぜ|どうして|おはよう|こんにちは|こんばんは|ねえ|ちょっと|あの|それ|これ)/.test(text)
        )
      );

      if (isNewScene) {
        // Increment scene ID to group subtitles by scene
        currentSceneId++;

        // Ensure there's a gap before the new scene starts
        if (processedSegments.length > 0) {
          const lastSegment = processedSegments[processedSegments.length - 1];
          if (lastSegment.end > segment.start - 0.5) {
            lastSegment.end = segment.start - 0.5;
          }
        }
      }

      // If this isn't the last segment, consider the next segment's start time
      if (index < result.segments.length - 1) {
        const nextSegment = result.segments[index + 1];
        const nextStart = nextSegment.start;

        // Check if next segment is likely part of the same scene
        const isSameScene = (nextStart - segment.end < 2.0) &&
                           !(/^(いつ|どこ|なぜ|どうして|おはよう|こんにちは|こんばんは)/.test(nextSegment.text.trim()));

        if (isSameScene) {
          // If there's a gap between this segment and the next, extend this segment
          if (end + OVERLAP < nextStart) {
            end = end + OVERLAP;
          }
          // If the next segment starts before this one would end with calculated minimum duration,
          // extend this segment to overlap with the next one
          else if (nextStart < start + minDuration) {
            // Make this subtitle stay visible until halfway through the next subtitle
            const nextEnd = nextSegment.end;
            const midpoint = nextStart + ((nextEnd - nextStart) * 0.5); // Extend to midpoint of next subtitle
            end = Math.min(midpoint, nextStart + 0.5); // But no more than 500ms into next subtitle
          }
        } else {
          // Different scene coming up, don't extend into it
          end = Math.min(end, nextStart - 0.5);
        }
      } else {
        // For the last segment, add extra time to ensure it stays visible
        end += 3.0;
      }

      // Update the last speech end time for scene detection
      lastSpeechEnd = end;

      processedSegments.push({
        index: processedSegments.length + 1,
        start,
        end,
        text,
        charCount,
        sceneId: currentSceneId // Track which scene this belongs to
      });
    }

    // Second pass: ensure no subtitle disappears too quickly and merge very short segments
    // Also split very long segments into smaller chunks
    updateProgress(0.8);
    let finalSegments: Segment[] = [];

    const MAX_CHARS_PER_SUBTITLE = 60; // Maximum characters per subtitle line
    const MAX_LINES_PER_SUBTITLE = 2; // Maximum number of lines per subtitle

    // Group segments by scene for better processing
    const sceneGroups: Record<number, Segment[]> = {};
    processedSegments.forEach(segment => {
      const sceneId = segment.sceneId || 1;
      if (!sceneGroups[sceneId]) {
        sceneGroups[sceneId] = [];
      }
      sceneGroups[sceneId].push(segment);
    });

    // Process each scene separately
    Object.values(sceneGroups).forEach((sceneSegments: Segment[]) => {
      // Process segments within each scene
      for (let i = 0; i < sceneSegments.length; i++) {
        const segment = sceneSegments[i];

        // If this isn't the first segment in the scene, check if the previous segment ends too soon
        if (i > 0) {
          const prevSegment = sceneSegments[i - 1];
          // If the previous segment ends before this one starts + half of BASE_MIN_DURATION,
          // extend the previous segment
          if (prevSegment.end < segment.start + (BASE_MIN_DURATION / 2)) {
            prevSegment.end = segment.start + (BASE_MIN_DURATION / 2);
          }
        }

        // If this isn't the last segment in the scene, check if we should merge with the next segment
        if (i < sceneSegments.length - 1) {
          const nextSegment = sceneSegments[i + 1];
          const timeBetween = nextSegment.start - segment.end;

          // If segments are very close together and combined text isn't too long, merge them
          // But only if the combined text won't exceed our maximum length
          if (timeBetween < 1.0 && (segment.charCount + nextSegment.charCount) < MAX_CHARS_PER_SUBTITLE) {
            segment.text = segment.text + " " + nextSegment.text;
            segment.end = nextSegment.end;
            segment.charCount = segment.text.length;

            // Remove the next segment as it's now merged
            sceneSegments.splice(i + 1, 1);
            // Stay at the same index to process the next segment
            i--;
            continue;
          }
        }

        // Split long segments into smaller chunks
        if (segment.charCount > MAX_CHARS_PER_SUBTITLE) {
          // Try to split by sentences first
          const sentences = segment.text.split(/(?<=[.!?])\s+/);

          if (sentences.length > 1) {
            // We have multiple sentences, split them up
            let currentText = '';
            let currentStart = segment.start;
            const duration = segment.end - segment.start;

            sentences.forEach((sentence: string, idx: number) => {
              // If adding this sentence would make the subtitle too long, create a new segment
              if ((currentText.length + sentence.length) > MAX_CHARS_PER_SUBTITLE ||
                  currentText.split('\n').length >= MAX_LINES_PER_SUBTITLE) {

                // Calculate proportional end time based on text length
                const proportion = currentText.length / segment.charCount;
                const segmentDuration = duration * proportion;
                const segmentEnd = currentStart + segmentDuration;

                finalSegments.push({
                  index: finalSegments.length + 1,
                  start: currentStart,
                  end: segmentEnd,
                  text: currentText,
                  charCount: currentText.length,
                  sceneId: segment.sceneId
                });

                // Start a new segment
                currentStart = segmentEnd;
                currentText = sentence;
              } else {
                // Add this sentence to the current text
                if (currentText) {
                  currentText += ' ' + sentence;
                } else {
                  currentText = sentence;
                }
              }

              // If this is the last sentence, add the remaining text as a segment
              if (idx === sentences.length - 1 && currentText) {
                finalSegments.push({
                  index: finalSegments.length + 1,
                  start: currentStart,
                  end: segment.end,
                  text: currentText,
                  charCount: currentText.length,
                  sceneId: segment.sceneId
                });
              }
            });
          } else {
            // No sentence breaks, split by length and try to break at natural points
            const words = segment.text.split(' ');
            let currentLine = '';
            let currentText = '';
            let lineCount = 0;
            let currentStart = segment.start;
            const duration = segment.end - segment.start;

            words.forEach((word: string, idx: number) => {
              // Check if adding this word would exceed the line length
              if ((currentLine.length + word.length + 1) > MAX_CHARS_PER_SUBTITLE) {
                // Start a new line
                if (lineCount < MAX_LINES_PER_SUBTITLE - 1) {
                  // We can add another line to this subtitle
                  currentText += currentLine + '\n';
                  currentLine = word;
                  lineCount++;
                } else {
                  // We need to start a new subtitle
                  currentText += currentLine;

                  // Calculate proportional end time based on text length
                  const proportion = currentText.length / segment.charCount;
                  const segmentDuration = duration * proportion;
                  const segmentEnd = currentStart + segmentDuration;

                  finalSegments.push({
                    index: finalSegments.length + 1,
                    start: currentStart,
                    end: segmentEnd,
                    text: currentText,
                    charCount: currentText.length,
                    sceneId: segment.sceneId
                  });

                  // Start a new segment
                  currentStart = segmentEnd;
                  currentText = '';
                  currentLine = word;
                  lineCount = 0;
                }
              } else {
                // Add this word to the current line
                if (currentLine) {
                  currentLine += ' ' + word;
                } else {
                  currentLine = word;
                }
              }

              // If this is the last word, add the remaining text as a segment
              if (idx === words.length - 1) {
                if (currentLine) {
                  if (currentText) {
                    currentText += '\n' + currentLine;
                  } else {
                    currentText = currentLine;
                  }
                }

                if (currentText) {
                  finalSegments.push({
                    index: finalSegments.length + 1,
                    start: currentStart,
                    end: segment.end,
                    text: currentText,
                    charCount: currentText.length,
                    sceneId: segment.sceneId
                  });
                }
              }
            });
          }
        } else {
          // This segment is already a good length, just add it
          finalSegments.push({
            index: finalSegments.length + 1,
            start: segment.start,
            end: segment.end,
            text: segment.text,
            charCount: segment.charCount,
            sceneId: segment.sceneId
          });
        }
      }
    });

    // Format and add all segments to SRT content
    updateProgress(0.9);
    finalSegments.forEach(segment => {
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);

      srtContent += `${segment.index}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    });

    console.log('Subtitle generation complete, SRT length:', srtContent.length);
    updateProgress(1.0);
    return srtContent;
  } catch (error) {
    console.error('Subtitle generation error:', error);
    // Propagate the specific error message instead of a generic one
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to generate subtitles');
    }
  }
};

// Helper function to format timestamps in SRT format (00:00:00,000)
const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const secs = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');

  return `${hours}:${minutes}:${secs},${ms}`;
};
