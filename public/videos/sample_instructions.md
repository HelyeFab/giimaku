# Sample Video Formats

## Testing OGV Files

To properly test the OGV video support in this player:

1. Place your OGV test videos in this directory (`public/videos/`)
2. The player now has specialized support for the Ogg Theora format, which should display both video and audio

## Troubleshooting

If you experience issues with OGV video playback:

1. Make sure your OGV files are properly encoded with the Theora video codec
2. Verify the browser you're using has basic support for Ogg containers
3. Check the console for any error messages related to codec support

## Technical Notes

The player now implements:
- Special codec handling for OGV files
- A dedicated Theora-optimized video component
- Proper source element configuration with codec hints
