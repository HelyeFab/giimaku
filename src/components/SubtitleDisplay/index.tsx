"use client";

import React, { useEffect, useState } from 'react';

interface SubtitleDisplayProps {
  text: string;
  furigana?: string;
}

// Helper function to split Japanese text into sentences
const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  
  // Split by common Japanese sentence ending punctuation
  // This includes: 。(period), ！(exclamation), ？(question mark), and line breaks
  const sentences = text.split(/([。！？\n]+)/g);
  
  // Rejoin the sentences with their punctuation
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    // If there's a punctuation mark following this text segment, include it
    if (i + 1 < sentences.length) {
      result.push(sentences[i] + sentences[i + 1]);
    } else if (sentences[i]) {
      // Add the last segment if it exists and has no punctuation
      result.push(sentences[i]);
    }
  }
  
  // Filter out empty strings
  return result.filter(sentence => sentence.trim().length > 0);
}

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ text, furigana }) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [displayFurigana, setDisplayFurigana] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [prevText, setPrevText] = useState<string>('');
  const [prevFurigana, setPrevFurigana] = useState<string>('');
  const [sentences, setSentences] = useState<string[]>([]);
  const [prevSentences, setPrevSentences] = useState<string[]>([]);

  // Handle text changes with a smooth transition and extended display time
  useEffect(() => {
    if (text) {
      // If there's new text, make it visible with the new content
      setDisplayText(text);
      setDisplayFurigana(furigana || '');
      setIsVisible(true);
      // Store the current text for persistence
      setPrevText(text);
      setPrevFurigana(furigana || '');
      
      // Split text into sentences for visual separation
      const textSentences = splitIntoSentences(text);
      setSentences(textSentences);
      setPrevSentences(textSentences);
    } else {
      // If text is empty, don't immediately hide it
      // Instead, keep it visible for a bit longer before fading out
      const fadeOutDelay = setTimeout(() => {
        setIsVisible(false);
      }, 1500); // Keep subtitle visible for 1.5 seconds after it should end

      // Clean up timeout if component unmounts or text changes
      return () => clearTimeout(fadeOutDelay);
    }
  }, [text, furigana]);

  // Handle the case when no text is provided
  if (!text && !prevText) {
    return null;
  }

  return (
    <div className="w-full text-center">
      <div
        className={`
          inline-block
          px-8 py-4
          bg-black/80
          rounded-lg
          border-2 border-gray-600
          max-w-[90%]
          transition-all duration-700 ease-in-out
          ${isVisible
            ? 'opacity-100 transform translate-y-0'
            : 'opacity-0 transform translate-y-2'
          }
        `}
      >
        {(isVisible ? displayFurigana : prevFurigana) && (
          <p className="text-cyan-300 text-sm mb-1 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {isVisible ? displayFurigana : prevFurigana}
          </p>
        )}
        
        {/* Display sentences with visual separation */}
        <div className="text-white text-2xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {(isVisible ? sentences : prevSentences).length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-center">
              {(isVisible ? sentences : prevSentences).map((sentence, index) => (
                <span 
                  key={index} 
                  className={`inline-block px-2 py-1 rounded ${index % 2 === 0 ? 'bg-black/40' : 'bg-black/60'}`}
                >
                  {sentence}
                </span>
              ))}
            </div>
          ) : (
            <p>{isVisible ? displayText : prevText}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubtitleDisplay;
