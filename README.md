# Video Subtitle Player

A Next.js application that allows users to select and play local video files with synchronized subtitles.

## Features

- Local video file selection
- Video playback in a dedicated UI component
- Subtitle extraction and synchronization with video content
- Subtitle display below the video player
- Furigana support for Japanese subtitles

## Tech Stack

- **Next.js** - React framework with server-side rendering capabilities
- **React** - UI component library
- **TypeScript** - For type safety and better developer experience
- **Tailwind CSS** - For styling the UI components
- **react-player** - For enhanced video player functionality
- **subtitle** - Library for parsing subtitle files (.srt, .vtt, etc.)
- **ffmpeg.wasm** - For client-side video processing and subtitle extraction

## Project Structure

```
video-subtitle-player/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Main layout component
│   │   ├── page.tsx      # Home page with video player
│   ├── components/
│   │   ├── VideoPlayer/  # Video player component
│   │   ├── SubtitleDisplay/ # Subtitle display component
│   │   ├── FileSelector/ # File selection component
│   ├── hooks/            # Custom React hooks
│   │   ├── useSubtitleSync.ts
│   │   ├── useVideoProcessing.ts
│   ├── utils/            # Utility functions
│   │   ├── subtitleParser.ts
│   │   ├── videoProcessor.ts
├── public/               # Static files
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Click on the "Select Video" button to choose a video file from your device
2. If your video already has embedded subtitles, they will be automatically extracted
3. Alternatively, you can select a separate subtitle file (.srt, .vtt, etc.)
4. The video will play in the main view area with synchronized subtitles displayed at the bottom

## How It Works

- The application uses the browser's File API to access local video files
- react-player is used to create a customizable video player
- subtitle library parses various subtitle formats
- ffmpeg.wasm provides in-browser video processing capabilities
- Subtitles are synchronized with the video using timestamp information

## Furigana Support

The application supports displaying furigana (reading aids) above Japanese text in subtitles. This feature is particularly useful for Japanese language learners who need pronunciation guidance for kanji characters.

### How to Use Furigana

To add furigana to your subtitles, use the following format in your SRT or VTT files:

```
Main Japanese text {furigana text}
```

For example:
```
こんにちは、世界 {Konnichiwa, Sekai}
```

The main Japanese text will be displayed normally, while the text in curly braces will appear as smaller furigana text above it.

A sample subtitle file with furigana is included at `public/videos/sample_japanese_with_furigana.srt`.

## Future Enhancements

- Support for multiple subtitle tracks
- Additional custom subtitle styling options
- Ability to edit and save subtitles
- Offline functionality with PWA features
- Advanced furigana formatting options
