/**
 * Subtitle Storage Utility
 *
 * This module provides an abstraction layer for storing and retrieving subtitles.
 * It currently uses localStorage but is designed to be easily adaptable to use
 * Firebase or other storage solutions in the future.
 */

// Types for subtitle storage
export interface SubtitleStorageItem {
  fileName: string;
  fileSize: number;
  dateGenerated: string;
  subtitles: string;
}

export interface SubtitleStorageInfo {
  key: string;
  fileName: string;
  fileSize: number;
  dateGenerated: string;
}

// Storage provider interface
interface StorageProvider {
  storeItem(key: string, item: SubtitleStorageItem): void;
  getItem(key: string): SubtitleStorageItem | null;
  removeItem(key: string): void;
  getAllItems(): SubtitleStorageInfo[];
}

/**
 * LocalStorage implementation of the storage provider
 */
class LocalStorageProvider implements StorageProvider {
  private prefix: string = 'giimaku-subtitles:';

  storeItem(key: string, item: SubtitleStorageItem): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Failed to store item in localStorage:', error);
      throw error;
    }
  }

  getItem(key: string): SubtitleStorageItem | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;
      return JSON.parse(item) as SubtitleStorageItem;
    } catch (error) {
      console.error('Failed to retrieve item from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Failed to remove item from localStorage:', error);
      throw error;
    }
  }

  getAllItems(): SubtitleStorageInfo[] {
    const result: SubtitleStorageInfo[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(this.prefix)) {
          const key = fullKey.substring(this.prefix.length);
          const item = this.getItem(key);
          if (item) {
            result.push({
              key,
              fileName: item.fileName,
              fileSize: item.fileSize,
              dateGenerated: item.dateGenerated
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all items from localStorage:', error);
    }
    return result;
  }
}

/**
 * Firebase storage provider (placeholder for future implementation)
 * This will be implemented when Firebase is integrated
 */
// class FirebaseStorageProvider implements StorageProvider {
//   storeItem(key: string, item: SubtitleStorageItem): void {
//     // Firebase implementation
//   }
//
//   getItem(key: string): SubtitleStorageItem | null {
//     // Firebase implementation
//     return null;
//   }
//
//   removeItem(key: string): void {
//     // Firebase implementation
//   }
//
//   getAllItems(): SubtitleStorageInfo[] {
//     // Firebase implementation
//     return [];
//   }
// }

// Create the storage provider instance
// This can be easily switched to use Firebase in the future
const storageProvider: StorageProvider = new LocalStorageProvider();

/**
 * Generate a unique key for a video file
 * @param videoFile - The video file
 * @returns A unique identifier for the video
 */
export const getVideoKey = (videoFile: File): string => {
  // Use a combination of file name, size, and last modified date as a unique identifier
  return `${videoFile.name}-${videoFile.size}-${videoFile.lastModified}`;
};

/**
 * Store subtitles for a video file
 * @param videoFile - The video file
 * @param subtitles - The SRT content to store
 */
export const storeSubtitles = (videoFile: File, subtitles: string): void => {
  try {
    const key = getVideoKey(videoFile);
    const storageItem: SubtitleStorageItem = {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      dateGenerated: new Date().toISOString(),
      subtitles
    };

    storageProvider.storeItem(key, storageItem);
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
    const storageItem = storageProvider.getItem(key);

    if (!storageItem) {
      return null;
    }

    console.log(`Retrieved stored subtitles for ${videoFile.name}`);
    return storageItem.subtitles;
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
    storageProvider.removeItem(key);
    console.log(`Deleted stored subtitles for ${videoFile.name}`);
  } catch (error) {
    console.error('Failed to delete stored subtitles:', error);
  }
};

/**
 * Get a list of all videos with stored subtitles
 * @returns Array of stored subtitle information
 */
export const getAllStoredSubtitles = (): SubtitleStorageInfo[] => {
  return storageProvider.getAllItems();
};
