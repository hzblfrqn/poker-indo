import React from 'react';
import type { Card } from '@shared/types';
import { SUIT_NAMES, SUIT_SYMBOLS } from '@shared/constants';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
  className = '',
}) => {
  const isRed = card.suit === 'D' || card.suit === 'H';
  const symbol = SUIT_SYMBOLS[card.suit];

  const sizeClasses = {
    sm: 'w-10 h-14 text-xs rounded-md shadow-sm',
    md: 'w-14 h-20 text-sm rounded-lg shadow-card',
    lg: 'w-16 h-24 sm:w-20 sm:h-28 text-base rounded-xl shadow-card',
  };

  const suitColorClass = isRed ? 'text-red-600' : 'text-slate-900';

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative select-none flex flex-col justify-between p-1.5 transition-all duration-200
        card-face border border-slate-300
        ${sizeClasses[size]}
        ${selected ? 'card-selected z-30' : 'hover:z-20'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={`${card.rank} of ${SUIT_NAMES[card.suit]}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`flex flex-col items-center leading-none font-bold ${suitColorClass}`}>
        <span className="font-mono text-[13px] sm:text-[15px] tracking-tighter">{card.rank}</span>
        <span className="text-[12px] sm:text-[14px] -mt-0.5">{symbol}</span>
      </div>

      {/* Center Suit Watermark / Symbol */}
      <div className={`self-center font-bold text-center leading-none ${suitColorClass} ${size === 'sm' ? 'text-base' : 'text-2xl sm:text-3xl'} opacity-90`}>
        {symbol}
      </div>

      {/* Bottom Right Rank & Suit (Rotated 180) */}
      <div className={`flex flex-col items-center leading-none font-bold rotate-180 self-end ${suitColorClass}`}>
        <span className="font-mono text-[13px] sm:text-[15px] tracking-tighter">{card.rank}</span>
        <span className="text-[12px] sm:text-[14px] -mt-0.5">{symbol}</span>
      </div>

      {/* Highlight glow if selected */}
      {selected && (
        <div className="absolute inset-0 rounded-inherit ring-2 ring-gold pointer-events-none" />
      )}
    </div>
  );
};
