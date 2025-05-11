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

  if (isVTT) {
    return parseVTT(content);
  }

  // Default to SRT parsing
  return parseSRT(content);
}

export default {
  parseSubtitles,
  parseSRT,
  parseVTT,
  timeToSeconds
};
