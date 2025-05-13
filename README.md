# Giimaku - Video Subtitle Player

A Next.js application that allows users to select and play local video files with synchronized subtitles. It can also generate subtitles automatically using OpenAI's Whisper API.

## Features

- Local video file selection
- Video playback in a dedicated UI component
- Subtitle extraction and synchronization with video content
- Subtitle display below the video player
- **Automatic subtitle generation** using OpenAI's Whisper API
- **Visual sentence separation** for better readability, especially for Japanese subtitles
- **Detailed progress reporting** during audio extraction and subtitle generation
- **Persistent subtitle storage** across browser sessions
- **Subtitle synchronization controls** to adjust timing

## Tech Stack

- **Next.js** - React framework with server-side rendering capabilities
- **React** - UI component library
- **TypeScript** - For type safety and better developer experience
- **Tailwind CSS** - For styling the UI components
- **react-player** - For enhanced video player functionality
- **subtitle** - Library for parsing subtitle files (.srt, .vtt, etc.)
- **ffmpeg.wasm** - For client-side video processing and audio extraction
- **OpenAI API** - For automatic subtitle generation using Whisper

## Project Structure

```
giimaku/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Main layout component
│   │   ├── page.tsx      # Home page with video player
│   ├── components/
│   │   ├── VideoPlayer/  # Video player component
│   │   ├── SubtitleDisplay/ # Subtitle display component
│   │   ├── FileSelector/ # File selection component
│   │   ├── SubtitleGenerator/ # Subtitle generation component
│   │   ├── SubtitleSyncControls/ # Subtitle timing controls
│   ├── hooks/            # Custom React hooks
│   │   ├── useSubtitleSync.ts
│   ├── utils/            # Utility functions
│   │   ├── subtitleParser.ts
│   │   ├── subtitleGenerator.ts
│   │   ├── audioExtractor.ts
│   │   ├── videoTranscoder.ts
│   │   ├── subtitleStorage.ts
│   │   ├── config.ts
├── public/               # Static files
│   ├── ffmpeg/           # FFmpeg WebAssembly files
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- OpenAI API key (for subtitle generation)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with your OpenAI API key:
```
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click on the "Select Video" button to choose a video file from your device
2. You can either:
   - Select a separate subtitle file (.srt, .vtt, etc.)
   - Generate subtitles automatically using the "Generate Subtitles" button
3. The video will play in the main view area with synchronized subtitles displayed at the bottom
4. Use the subtitle sync controls to adjust timing if needed
5. Generated subtitles are automatically stored for future use

## How It Works

- The application uses the browser's File API to access local video files
- react-player is used to create a customizable video player
- subtitle library parses various subtitle formats
- ffmpeg.wasm provides in-browser video processing capabilities
- Subtitles are synchronized with the video using timestamp information
- For subtitle generation:
  1. Audio is extracted from the video using FFmpeg
  2. The audio is sent to OpenAI's Whisper API for transcription
  3. The transcription is formatted into SRT format with appropriate timing
  4. The subtitles are stored locally for future use

## Firebase Integration Path

The application is designed to be easily integrated with Firebase in the future. The subtitle storage system uses an abstraction layer that can be switched to use Firebase with minimal changes:

1. **Current Implementation**: Uses localStorage with a StorageProvider interface
   ```typescript
   interface StorageProvider {
     storeItem(key: string, item: SubtitleStorageItem): void;
     getItem(key: string): SubtitleStorageItem | null;
     removeItem(key: string): void;
     getAllItems(): SubtitleStorageInfo[];
   }
   ```

2. **To Implement Firebase Storage**:
   - Install Firebase dependencies:
     ```bash
     npm install firebase
     ```
   - Create a Firebase project and get your configuration
   - Implement the FirebaseStorageProvider class in `src/utils/subtitleStorage.ts`
   - Switch the storage provider from LocalStorageProvider to FirebaseStorageProvider

3. **Benefits of Firebase Integration**:
   - Cloud storage for subtitles across devices
   - User authentication for personalized subtitle libraries
   - Real-time updates and sharing capabilities

## Future Enhancements

- Support for multiple subtitle tracks
- Custom subtitle styling options
- Ability to edit and save subtitles
- Offline functionality with PWA features
- User authentication with Firebase
- Cloud storage for subtitles with Firebase
- Collaborative subtitle editing
- Support for more video and subtitle formats
- Machine learning-based subtitle synchronization improvements
