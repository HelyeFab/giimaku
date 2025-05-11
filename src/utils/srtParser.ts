interface Subtitle {
  id: number;
  start: number;
  end: number;
  text: string;
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
    const text = lines.slice(2).join('\n').trim();
    
    return { id, start, end, text };
  });
};
