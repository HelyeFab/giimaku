"use client";

import React, { useEffect, useState } from 'react';

interface SubtitleDisplayProps {
  text: string;
}

const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({ text }) => {
  const [displayText, setDisplayText] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [prevText, setPrevText] = useState<string>('');

  // Handle text changes with a smooth transition and extended display time
  useEffect(() => {
    if (text) {
      // If there's new text, make it visible with the new content
      setDisplayText(text);
      setIsVisible(true);
      // Store the current text for persistence
      setPrevText(text);
    } else {
      // If text is empty, don't immediately hide it
      // Instead, keep it visible for a bit longer before fading out
      const fadeOutDelay = setTimeout(() => {
        setIsVisible(false);
      }, 1500); // Keep subtitle visible for 1.5 seconds after it should end

      // Clean up timeout if component unmounts or text changes
      return () => clearTimeout(fadeOutDelay);
    }
  }, [text]);

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
        <p className="text-white text-2xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {isVisible ? displayText : prevText}
        </p>
      </div>
    </div>
  );
};

export default SubtitleDisplay;
