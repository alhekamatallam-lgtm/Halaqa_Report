import React from 'react';

interface ProgressBarProps {
  value: number; // should be between 0 and 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value }) => {
  const percentage = Math.min(Math.max(value * 100, 0), 100);

  const getBarColor = () => {
    if (percentage <= 50) {
      return 'bg-red-500';
    }
    if (percentage <= 80) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  return (
    <div className="w-full bg-stone-300 rounded-full h-2.5 dark:bg-stone-700 overflow-hidden">
      <div
        className={`${getBarColor()} h-2.5 rounded-full transition-colors duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};