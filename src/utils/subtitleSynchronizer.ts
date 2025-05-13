// Simple subtitle processing utilities for frame-perfect synchronization

/**
 * Interface for subtitle cue with timing information
 */
export interface SubtitleCue {
  id: number;
  start: number;
  end: number;
  text: string;
}

/**
 * Preprocess subtitles with precise timing adjustments
 *
 * @param srtContent - The SRT content as a string
 * @param globalOffset - Global offset to apply to all subtitles (in milliseconds)
 * @param language - Language of the subtitles (for language-specific adjustments)
 * @returns Processed subtitles with adjusted timing
 */
export async function preprocessSubtitles(
  srtContent: string,
  globalOffset: number = 0,
  language?: string
): Promise<string> {
  try {
    // Parse the SRT content
    const subtitles = parseSRT(srtContent);

    // Apply global offset (convert to milliseconds)
    const offsetMs = globalOffset;
    const offsetSubtitles = subtitles.map(sub => ({
      ...sub,
      start: sub.start + offsetMs,
      end: sub.end + offsetMs
    }));

    // Apply frame-perfect adjustments
    const adjustedSubtitles = applyFramePerfectAdjustments(offsetSubtitles, language);

    // Convert to WebVTT format
    return convertToWebVTT(adjustedSubtitles);
  } catch (error) {
    console.error('Error preprocessing subtitles:', error);
    return srtContent; // Return original content on error
  }
}

/**
 * Apply frame-perfect and language-specific adjustments to subtitles
 */
function applyFramePerfectAdjustments(subtitles: SubtitleCue[], language?: string): SubtitleCue[] {
  return subtitles.map(subtitle => {
    // Create a copy to avoid mutating the original
    const adjusted = { ...subtitle };

    // Apply language-specific adjustments
    if (language === 'ja') {
      // Japanese subtitles often need more time to read
      // Extend duration by 10% for Japanese
      const duration = adjusted.end - adjusted.start;
      const extension = duration * 0.1;
      adjusted.end += extension;
    }

    // Apply frame-perfect adjustments
    // Ensure subtitle boundaries align with frame boundaries for smoother rendering
    // Assuming 24fps, each frame is ~41.67ms
    const frameMs = 41.67;

    // Round start and end times to nearest frame boundary
    adjusted.start = Math.round(adjusted.start / frameMs) * frameMs;
    adjusted.end = Math.round(adjusted.end / frameMs) * frameMs;

    // Ensure minimum duration (at least 2 frames)
    if (adjusted.end - adjusted.start < frameMs * 2) {
      adjusted.end = adjusted.start + frameMs * 2;
    }

    return adjusted;
  });
}

/**
 * Convert SRT content to WebVTT format
 *
 * @param srtContent - The SRT content as a string
 * @returns WebVTT formatted content
 */
export async function convertSrtToVtt(srtContent: string): Promise<string> {
  try {
    // Parse the SRT content
    const subtitles = parseSRT(srtContent);

    // Convert to WebVTT format
    return convertToWebVTT(subtitles);
  } catch (error) {
    console.error('Error converting SRT to VTT:', error);

    // Fallback manual conversion if the library fails
    return manualSrtToVtt(srtContent);
  }
}

/**
 * Parse SRT content into subtitle cues
 */
function parseSRT(srtContent: string): SubtitleCue[] {
  const subtitles: SubtitleCue[] = [];

  // Remove BOM and normalize line endings
  const content = srtContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  // Split content into subtitle blocks
  const blocks = content.trim().split('\n\n');

  blocks.forEach((block, index) => {
    const lines = block.split('\n');
    if (lines.length < 3) return;

    // First line is the subtitle id
    const id = parseInt(lines[0].trim(), 10) || index + 1;

    // Second line contains the timestamps
    const timestampLine = lines[1];
    const timestamps = timestampLine.split(' --> ');
    if (timestamps.length !== 2) return;

    const start = timeToMilliseconds(timestamps[0]);
    const end = timeToMilliseconds(timestamps[1]);

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
 * Convert time string (HH:MM:SS,mmm) to milliseconds
 */
function timeToMilliseconds(timeString: string): number {
  const match = timeString.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
}

/**
 * Convert milliseconds to WebVTT time format (HH:MM:SS.mmm)
 */
function millisecondsToWebVTTTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Convert subtitle cues to WebVTT format
 */
function convertToWebVTT(subtitles: SubtitleCue[]): string {
  let vtt = 'WEBVTT\n\n';

  subtitles.forEach(subtitle => {
    vtt += `${subtitle.id}\n`;
    vtt += `${millisecondsToWebVTTTime(subtitle.start)} --> ${millisecondsToWebVTTTime(subtitle.end)}\n`;
    vtt += `${subtitle.text}\n\n`;
  });

  return vtt;
}

/**
 * Manual conversion from SRT to WebVTT format as a fallback
 *
 * @param srtContent - The SRT content as a string
 * @returns WebVTT formatted content
 */
function manualSrtToVtt(srtContent: string): string {
  // Add WebVTT header
  let vttContent = 'WEBVTT\n\n';

  // Replace SRT timestamps (00:00:00,000) with WebVTT format (00:00:00.000)
  vttContent += srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');

  return vttContent;
}
