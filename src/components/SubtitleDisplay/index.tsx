"use client";

import React, { useEffect, useState } from 'react';

interface SubtitleDisplayProps {
  text: string;
  videoKey?: string | number; // Add a key prop to force reset when video changes
  language?: string; // Language of the subtitles (e.g., 'ja' for Japanese)
}

/**
 * Format subtitle text by adding line breaks after punctuation marks
 * with language-specific optimizations
 *
 * @param text - The subtitle text to format
 * @param language - The language of the text (ISO 639-1 code)
 * @returns Formatted text with line breaks
 */
const formatSubtitleText = (text: string, language?: string): string => {
  if (!text) return '';

  const isJapanese = language === 'ja';

  if (isJapanese) {
    // Japanese-specific formatting - simpler approach
    // Add breaks after sentence endings
    return text.replace(/([。！？])/g, '$1\n');
  } else {
    // Default formatting for other languages
    // Add breaks after periods, question marks, exclamation marks
    return text.replace(/([.!?]+\s)/g, '$1\n');
  }
};

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ text, videoKey, language }) => {
  const [displayText, setDisplayText] = useState<string>('');

  // Reset state when video changes
  useEffect(() => {
    setDisplayText('');
  }, [videoKey]);

  // Simple, direct update of display text when text prop changes
  useEffect(() => {
    if (text) {
      const formattedText = formatSubtitleText(text, language);
      setDisplayText(formattedText);
    } else {
      setDisplayText('');
    }
  }, [text, language]);

  // If there's no text to display, render nothing
  if (!displayText) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 w-full text-center">
      <div
        className="inline-block px-8 py-4 bg-black/80 rounded-lg border-2 border-gray-600 max-w-[90%] mb-2"
      >
        <div
          className={`
            text-white text-2xl font-bold
            drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]
            whitespace-pre-line
            ${language === 'ja'
              ? 'font-japanese tracking-wider leading-relaxed'
              : 'leading-normal'
            }
          `}
          style={{
            letterSpacing: language === 'ja' ? '0.05em' : 'normal',
            maxHeight: '5rem',
            overflowY: 'auto'
          }}
        >
          {displayText}
        </div>
      </div>
    </div>
  );
};

export default SubtitleDisplay;
