import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { loadFFmpeg } from '@/utils/videoTranscoder';

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
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
    updateProgress(0.01);
    console.log('Starting audio extraction from video...');

    // Loading FFmpeg: 0-10% progress
    console.log('Loading FFmpeg...');
    updateProgress(0.05);
    const ff = await loadFFmpeg();
    console.log('FFmpeg loaded successfully');
    updateProgress(0.1);

    const inputFileName = 'input_video';
    const outputFileName = 'output_audio.mp3';

    // Writing video to virtual filesystem: 10-20% progress
    console.log('Writing video file to FFmpeg virtual filesystem...');
    updateProgress(0.15);
    await ff.writeFile(inputFileName, await fetchFile(videoFile));
    updateProgress(0.2);

    // Set up progress tracking for FFmpeg processing: 20-80% progress
    ff.on('progress', (event: any) => {
      if (typeof event === 'object' && 'ratio' in event) {
        // Scale FFmpeg's 0-1 progress to our 0.2-0.8 range
        const scaledProgress = 0.2 + (event.ratio as number) * 0.6;
        updateProgress(scaledProgress);
      }
    });

    console.log('Starting audio extraction with FFmpeg...');
    // Extract audio using FFmpeg with more compression
    await ff.exec([
      '-i', inputFileName,
      '-vn', // No video
      '-acodec', 'libmp3lame',
      '-ac', '1', // Mono audio
      '-ab', '32k', // Lower bitrate
      '-ar', '16000', // Lower sample rate
      '-map_metadata', '-1', // Remove metadata
      '-f', 'mp3', // Force MP3 format
      outputFileName
    ]);

    // Reading and potentially compressing output: 80-100% progress
    updateProgress(0.8);

    // Check file size
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB in bytes
    let audioData = await ff.readFile(outputFileName);
    console.log('Initial audio file size:', audioData.length, 'bytes');
    updateProgress(0.9);

    if (audioData.length > MAX_SIZE) {
      console.log('Audio file too large, attempting further compression...');
      // Try even more aggressive compression
      await ff.exec([
        '-i', outputFileName,
        '-acodec', 'libmp3lame',
        '-ac', '1',
        '-ab', '16k', // Even lower bitrate
        '-ar', '16000',
        '-map_metadata', '-1',
        '-f', 'mp3',
        'compressed_' + outputFileName
      ]);
      audioData = await ff.readFile('compressed_' + outputFileName);
      console.log('Compressed audio file size:', audioData.length, 'bytes');
    }

    // Finalize progress
    updateProgress(1.0);
    console.log('Audio extraction complete');
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    console.log('Audio extraction successful, blob size:', audioBlob.size, 'bytes');
    return audioBlob;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error('Failed to extract audio from video');
  }
};
