import React from 'react';

interface PharmacyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function PharmacyLogo({ size = 'md', className = '', showText = false }: PharmacyLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const iconSizes = {
    sm: 18,
    md: 24,
    lg: 32,
    xl: 44,
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white shrink-0 relative overflow-hidden border border-emerald-400/30`}>
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-white/10 rounded-2xl pointer-events-none" />
        
        {/* Custom Medical Cross + Pill Emblem */}
        <svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          {/* Medical Cross */}
          <rect x="13" y="5" width="6" height="22" rx="3" fill="white" />
          <rect x="5" y="13" width="22" height="6" rx="3" fill="white" />
          
          {/* Pill accent in center */}
          <circle cx="16" cy="16" r="3.5" fill="#059669" />
          <circle cx="16" cy="16" r="1.5" fill="white" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className="font-black text-sm uppercase tracking-wider text-emerald-400">SUSSEX PHARMCY</span>
          <span className="text-[10px] text-gray-400 font-semibold tracking-tighter">Freetown, Sierra Leone</span>
        </div>
      )}
    </div>
  );
}
