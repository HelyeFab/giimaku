interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Converts SRT timestamp format (HH:MM:SS,MMM) to seconds
 * @param timestamp - SRT format timestamp
 * @returns Time in seconds
 */
export function timeToSeconds(timestamp: string): number {
  const match = timestamp.match(/(\d+):(\d+):(\d+),(\d+)/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Parse SRT subtitle format
 * @param content - SRT file content as string
 * @returns Array of parsed subtitles
 */
export function parseSRT(content: string): Subtitle[] {
  // Remove BOM and replace Windows line breaks with Unix line breaks
  content = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  // Split content into subtitle blocks
  const blocks = content.trim().split('\n\n');

  const subtitles: Subtitle[] = [];

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length < 3) return;

    // First line is the subtitle id
    const id = parseInt(lines[0].trim(), 10);

    // Second line contains the timestamps
    const timestampLine = lines[1];
    const timestamps = timestampLine.split(' --> ');
    if (timestamps.length !== 2) return;

    const start = timeToSeconds(timestamps[0]);
    const end = timeToSeconds(timestamps[1]);

    // Remaining lines are the subtitle text
    const text = lines.slice(2).join('\n');

    subtitles.push({
      id,
      start,
      end,
      text
    });
  });

  return subtitles;
}

/**
 * Parse WebVTT subtitle format
 * @param content - WebVTT file content as string
 * @returns Array of parsed subtitles
 */
export function parseVTT(content: string): Subtitle[] {
  // Remove BOM and the WEBVTT header
  content = content.replace(/^\uFEFF/, '').replace(/^WEBVTT\s*\n/, '');

  // Split content into subtitle blocks (similar to SRT but with different timestamp format)
  const blocks = content.trim().split(/\n\s*\n/);

  const subtitles: Subtitle[] = [];
  let id = 1;

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length < 2) return;

    let startLine = 0;

    // If first line is a number or contains --> then it's a timestamp line
    // Otherwise, it's an optional cue identifier
    if (lines[0].includes('-->')) {
      startLine = 0;
    } else {
      startLine = 1;
    }

    // Parse timestamp line
    const timestampLine = lines[startLine];
    const timestamps = timestampLine.split(' --> ');
    if (timestamps.length !== 2) return;

    // Convert timestamp to seconds (VTT format: HH:MM:SS.mmm)
    const start = convertVTTTimeToSeconds(timestamps[0]);
    const end = convertVTTTimeToSeconds(timestamps[1]);

    // Remaining lines are the subtitle text
    const text = lines.slice(startLine + 1).join('\n');

    subtitles.push({
      id: id++,
      start,
      end,
      text
    });
  });

  return subtitles;
}

/**
 * Converts WebVTT timestamp format (HH:MM:SS.mmm) to seconds
 * @param timestamp - WebVTT format timestamp
 * @returns Time in seconds
 */
function convertVTTTimeToSeconds(timestamp: string): number {
  // Clean up timestamp by removing any settings that might follow
  timestamp = timestamp.trim().split(' ')[0];

  const match = timestamp.match(/(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return 0;

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * Detect and parse subtitle file
 * @param content - Subtitle file content as string
 * @param fileName - Optional file name to help determine format
 * @returns Array of parsed subtitles
 */
export function parseSubtitles(content: string, fileName?: string): Subtitle[] {
  // Detect format based on content and/or file extension
  const isVTT = fileName?.toLowerCase().endsWith('.vtt') || content.trim().startsWith('WEBVTT');

  let subtitles: Subtitle[];
  if (isVTT) {
    subtitles = parseVTT(content);
  } else {
    // Default to SRT parsing
    subtitles = parseSRT(content);
  }

  // Post-process subtitles to detect and handle scene transitions
  return detectSceneTransitions(subtitles);
}

/**
 * Detect scene transitions and ensure subtitles from different scenes don't overlap
 * @param subtitles - Array of parsed subtitles
 * @returns Processed subtitles with scene transitions handled
 */
function detectSceneTransitions(subtitles: Subtitle[]): Subtitle[] {
  if (subtitles.length <= 1) return subtitles;

  const processed = [...subtitles];

  // Look for potential scene transitions by analyzing time gaps and content
  for (let i = 0; i < processed.length - 1; i++) {
    const current = processed[i];
    const next = processed[i + 1];

    // Calculate time gap between subtitles
    const timeGap = next.start - current.end;

    // Check for potential scene transition indicators:
    // 1. Larger time gap (more than 2 seconds)
    // 2. Significant content change (no shared words/phrases)
    const isLargeTimeGap = timeGap > 2.0;

    // Check for content discontinuity (simplified approach)
    // For Japanese, we look for common sentence endings followed by new content
    const japaneseTransitionPattern = /([。！？]|(?:です|ます))\s*[^\s]/;
    const hasContentDiscontinuity = japaneseTransitionPattern.test(current.text);

    // If we detect a likely scene transition, ensure there's a clear separation
    if (isLargeTimeGap || hasContentDiscontinuity) {
      // Ensure there's at least a small gap between the subtitles
      if (current.end >= next.start) {
        // Force a small gap (200ms) between scene transitions
        current.end = next.start - 0.2;
      }

      // If the current subtitle contains text that might belong to the next scene,
      // try to split it at a logical point
      if (hasContentDiscontinuity) {
        const match = current.text.match(japaneseTransitionPattern);
        if (match && match.index !== undefined) {
          // Split the text at the transition point
          const splitIndex = match.index + match[1].length;
          const firstPart = current.text.substring(0, splitIndex);
          const secondPart = current.text.substring(splitIndex).trim();

          // Update the current subtitle with just the first part
          current.text = firstPart;

          // If there's significant content in the second part, create a new subtitle
          if (secondPart.length > 5) { // Only if it's substantial content
            // Create a new subtitle for the second part
            const newSubtitle: Subtitle = {
              id: current.id + 0.5, // Use a half-id to maintain order
              start: current.end - 0.5, // Start slightly before current ends
              end: next.start - 0.1, // End just before next starts
              text: secondPart
            };

            // Insert the new subtitle
            processed.splice(i + 1, 0, newSubtitle);
            i++; // Skip the newly inserted subtitle in the next iteration
          }
        }
      }
    }
  }

  // Ensure IDs are sequential integers
  return processed.map((sub, index) => ({
    ...sub,
    id: index + 1
  }));
}

export default {
  parseSubtitles,
  parseSRT,
  parseVTT,
  timeToSeconds
};
