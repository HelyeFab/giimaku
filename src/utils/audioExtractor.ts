import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { loadFFmpeg } from '@/utils/videoTranscoder';

export const extractAudioFromVideo = async (
  videoFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  try {
    console.log('Starting audio extraction from video...');
    console.log('Loading FFmpeg...');
    const ff = await loadFFmpeg();
    console.log('FFmpeg loaded successfully');
    const inputFileName = 'input_video';
    const outputFileName = 'output_audio.mp3';

    console.log('Writing video file to FFmpeg virtual filesystem...');
    // Write the video file to FFmpeg's virtual filesystem
    await ff.writeFile(inputFileName, await fetchFile(videoFile));

    // Set up progress tracking
    ff.on('progress', (event: any) => {
      if (onProgress && typeof event === 'object' && 'ratio' in event) {
        onProgress(event.ratio as number);
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

    // Check file size
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB in bytes
    let audioData = await ff.readFile(outputFileName);
    console.log('Initial audio file size:', audioData.length, 'bytes');

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

    console.log('Audio extraction complete');
    const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
    console.log('Audio extraction successful, blob size:', audioBlob.size, 'bytes');
    return audioBlob;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error('Failed to extract audio from video');
  }
};
