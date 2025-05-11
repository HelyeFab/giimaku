/**
 * Utility for storing and retrieving generated subtitles locally
 */

// Key prefix for localStorage
const SUBTITLE_STORAGE_PREFIX = 'video-subtitle-player:subtitle:';

/**
 * Generate a unique key for a video file
 * @param videoFile - The video file
 * @returns A unique identifier for the video
 */
export const getVideoKey = (videoFile: File): string => {
  // Use a combination of file name, size, and last modified date as a unique identifier
  const fileInfo = `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
  return SUBTITLE_STORAGE_PREFIX + fileInfo;
};

/**
 * Store subtitles for a video file
 * @param videoFile - The video file
 * @param subtitles - The SRT content to store
 */
export const storeSubtitles = (videoFile: File, subtitles: string): void => {
  try {
    const key = getVideoKey(videoFile);
    const storageItem = {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      dateGenerated: new Date().toISOString(),
      subtitles
    };

    localStorage.setItem(key, JSON.stringify(storageItem));
    console.log(`Subtitles stored for ${videoFile.name}`);
  } catch (error) {
    console.error('Failed to store subtitles:', error);
  }
};

/**
 * Retrieve stored subtitles for a video file
 * @param videoFile - The video file
 * @returns The stored SRT content or null if not found
 */
export const getStoredSubtitles = (videoFile: File): string | null => {
  try {
    const key = getVideoKey(videoFile);
    const storedItem = localStorage.getItem(key);

    if (!storedItem) {
      return null;
    }

    const parsedItem = JSON.parse(storedItem);
    console.log(`Retrieved stored subtitles for ${videoFile.name}`);
    return parsedItem.subtitles;
  } catch (error) {
    console.error('Failed to retrieve stored subtitles:', error);
    return null;
  }
};

/**
 * Check if subtitles exist for a video file
 * @param videoFile - The video file
 * @returns Boolean indicating if subtitles exist
 */
export const hasStoredSubtitles = (videoFile: File): boolean => {
  return getStoredSubtitles(videoFile) !== null;
};

/**
 * Delete stored subtitles for a video file
 * @param videoFile - The video file
 */
export const deleteStoredSubtitles = (videoFile: File): void => {
  try {
    const key = getVideoKey(videoFile);
    localStorage.removeItem(key);
    console.log(`Deleted stored subtitles for ${videoFile.name}`);
  } catch (error) {
    console.error('Failed to delete stored subtitles:', error);
  }
};

/**
 * Get a list of all videos with stored subtitles
 * @returns Array of stored subtitle information
 */
export const getAllStoredSubtitles = (): Array<{
  key: string;
  fileName: string;
  fileSize: number;
  dateGenerated: string;
}> => {
  const result = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key && key.startsWith(SUBTITLE_STORAGE_PREFIX)) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        result.push({
          key,
          fileName: item.fileName,
          fileSize: item.fileSize,
          dateGenerated: item.dateGenerated
        });
      } catch (error) {
        console.error('Error parsing stored subtitle item:', error);
      }
    }
  }

  return result;
};
