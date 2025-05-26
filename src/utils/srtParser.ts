interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
  furigana?: string;
}

const timeToSeconds = (timeString: string): number => {
  const [hours, minutes, seconds] = timeString.split(':');
  const [secs, ms] = seconds.split(',');

  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(secs) +
    parseInt(ms) / 1000
  );
};

// Function to extract furigana from text
// Format: Main text {furigana}
const extractFurigana = (text: string): { mainText: string; furigana: string | undefined } => {
  // Check if the text contains furigana markers
  const furiganaRegex = /\{([^}]+)\}/;
  const match = text.match(furiganaRegex);

  if (match) {
    // Extract furigana text
    const furigana = match[1];
    // Remove furigana markers from main text
    const mainText = text.replace(furiganaRegex, '').trim();

    return { mainText, furigana };
  }

  // No furigana found
  return { mainText: text, furigana: undefined };
};

export const parseSRT = (srtContent: string): Subtitle[] => {
  // Split the content into subtitle blocks
  const blocks = srtContent
    .trim()
    .split('\n\n')
    .filter(block => block.trim().length > 0);

  return blocks.map(block => {
    const lines = block.split('\n');

    // Get the ID
    const id = parseInt(lines[0]);

    // Parse the timestamp line
    const times = lines[1].split(' --> ');
    const start = timeToSeconds(times[0].trim());
    const end = timeToSeconds(times[1].trim());

    // Get the text (might be multiple lines)
    const rawText = lines.slice(2).join('\n').trim();

    // Extract furigana if present
    const { mainText, furigana } = extractFurigana(rawText);

    return { id, start, end, text: mainText, furigana };
  });
};
