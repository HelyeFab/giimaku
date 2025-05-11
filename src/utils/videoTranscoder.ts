import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

// Create a singleton instance of FFmpeg
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<FFmpeg> | null = null;

// Load FFmpeg only once and cache the promise
export const loadFFmpeg = async (): Promise<FFmpeg> => {
  // If already loading, return the existing promise
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  // If already loaded, return the instance
  if (ffmpegInstance) return ffmpegInstance;

  // Create a new loading promise
  ffmpegLoadingPromise = (async () => {
    try {
      const ffmpeg = new FFmpeg();
      const baseURL = '/ffmpeg';

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: ''
      });

      console.log('FFmpeg loaded successfully');
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      ffmpegLoadingPromise = null; // Reset so we can try loading again
      throw error;
    }
  })();

  return ffmpegLoadingPromise;
};

export interface TranscodingProgress {
  ratio: number;
  time: number;
}

export const transcodeOgvToMp4 = async (
  videoFile: File,
  onProgress?: (progress: TranscodingProgress) => void
): Promise<string> => {
  try {
    // For non-OGV files, just return the URL directly
    if (!videoFile.name.toLowerCase().endsWith('.ogv') &&
      !videoFile.type.includes('ogg')) {
      return URL.createObjectURL(videoFile);
    }

    console.log('Starting transcoding process for OGV file');

    // Enable transcoding for OGV files
    const ff = await loadFFmpeg();
    const inputFileName = 'input.ogv';
    const outputFileName = 'output.mp4';
    await ff.writeFile(inputFileName, await fetchFile(videoFile));
    ff.on('progress', (event: any) => {
      if (onProgress && typeof event === 'object' && 'ratio' in event && 'time' in event) {
        onProgress({
          ratio: event.ratio as number,
          time: event.time as number
        });
      }
    });
    await ff.exec([
      '-i', inputFileName,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-strict', 'experimental',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      outputFileName
    ]);
    const data = await ff.readFile(outputFileName);
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    console.log('Transcoding complete, created URL:', url);
    return url;
  } catch (error) {
    console.error('Transcoding error:', error);
    // Return the original file URL if transcoding fails
    return URL.createObjectURL(videoFile);
  }
};
