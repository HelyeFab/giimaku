interface WhisperResponse {
  text: string;
  segments: {
    start: number;
    end: number;
    text: string;
  }[];
}

export const generateSubtitles = async (
  audioBlob: Blob,
  apiKey: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('Starting subtitle generation process...');
    console.log('Preparing audio file for Whisper API...');
    // Create form data with the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    console.log('Sending request to Whisper API...');
    // Call Whisper API
    console.log('Audio file size:', audioBlob.size, 'bytes');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    console.log('Received response from Whisper API, status:', response.status);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result: WhisperResponse = await response.json();
    console.log('Successfully parsed Whisper API response, segments:', result.segments.length);

    console.log('Converting response to SRT format...');
    // Convert the response to SRT format with adjusted timing
    let srtContent = '';
    const BASE_MIN_DURATION = 6.0; // Base minimum duration in seconds
    const OVERLAP = 2.0; // Increased overlap between segments in seconds
    const CHARS_PER_SECOND = 10; // Reading speed: characters per second
    const EXTRA_TIME = 2.0; // Extra time added to all subtitles

    // First pass: calculate extended durations for all segments
    const processedSegments = result.segments.map((segment, index) => {
      const text = segment.text.trim();
      const charCount = text.length;

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

      // If this isn't the last segment, consider the next segment's start time
      if (index < result.segments.length - 1) {
        const nextStart = result.segments[index + 1].start;

        // If there's a gap between this segment and the next, extend this segment
        if (end + OVERLAP < nextStart) {
          end = end + OVERLAP;
        }
        // If the next segment starts before this one would end with calculated minimum duration,
        // extend this segment to overlap with the next one
        else if (nextStart < start + minDuration) {
          // Make this subtitle stay visible until halfway through the next subtitle
          const nextEnd = result.segments[index + 1].end;
          const midpoint = nextStart + ((nextEnd - nextStart) * 0.7); // Extend further into next subtitle
          end = midpoint;
        }
      } else {
        // For the last segment, add extra time to ensure it stays visible
        end += 3.0;
      }

      return {
        index: index + 1,
        start,
        end,
        text,
        charCount
      };
    });

    // Second pass: ensure no subtitle disappears too quickly and merge very short segments
    for (let i = 0; i < processedSegments.length; i++) {
      const segment = processedSegments[i];

      // If this isn't the first segment, check if the previous segment ends too soon
      if (i > 0) {
        const prevSegment = processedSegments[i - 1];
        // If the previous segment ends before this one starts + half of BASE_MIN_DURATION,
        // extend the previous segment
        if (prevSegment.end < segment.start + (BASE_MIN_DURATION / 2)) {
          prevSegment.end = segment.start + (BASE_MIN_DURATION / 2);
        }
      }

      // If this isn't the last segment, check if we should merge with the next segment
      if (i < processedSegments.length - 1) {
        const nextSegment = processedSegments[i + 1];
        const timeBetween = nextSegment.start - segment.end;

        // If segments are very close together and combined text isn't too long, merge them
        if (timeBetween < 1.0 && (segment.charCount + nextSegment.charCount) < 100) {
          segment.text = segment.text + " " + nextSegment.text;
          segment.end = nextSegment.end;
          segment.charCount = segment.text.length;

          // Remove the next segment as it's now merged
          processedSegments.splice(i + 1, 1);
          // Stay at the same index to process the next segment
          i--;
          continue;
        }
      }

      // Format and add to SRT content
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);

      srtContent += `${segment.index}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text}\n\n`;
    }

    console.log('Subtitle generation complete, SRT length:', srtContent.length);
    return srtContent;
  } catch (error) {
    console.error('Subtitle generation error:', error);
    throw new Error('Failed to generate subtitles');
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
