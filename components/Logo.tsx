
import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-12 h-12" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      aria-label="Tarhana AI Logo"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" /> {/* chef-400 */}
          <stop offset="100%" stopColor="#c2410c" /> {/* chef-700 */}
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2"/>
        </filter>
      </defs>
      
      {/* Background Container */}
      <rect x="5" y="5" width="90" height="90" rx="22" fill="url(#logoGradient)" />
      
      {/* Bowl Shape */}
      <path 
        d="M25 50 C25 75 35 85 50 85 C65 85 75 75 75 50 L80 40 L20 40 L25 50Z" 
        fill="white" 
      />
      
      {/* Food Mound */}
      <path d="M30 40 Q50 25 70 40" fill="#fff7ed" />
      
      {/* Tech Circuit Nodes (Right Side) */}
      <g stroke="white" strokeWidth="3" strokeLinecap="round">
        {/* Top Node */}
        <path d="M75 50 L85 50 L90 45" />
        <circle cx="90" cy="45" r="3" fill="white" stroke="none" />
        
        {/* Middle Node */}
        <path d="M73 60 L88 60" />
        <circle cx="88" cy="60" r="3" fill="white" stroke="none" />
        
        {/* Bottom Node */}
        <path d="M65 75 L75 85 L85 85" />
        <circle cx="85" cy="85" r="3" fill="white" stroke="none" />
      </g>
      
      {/* Steam Dots (Top) */}
      <circle cx="50" cy="20" r="4" fill="white" className="animate-pulse" />
      <circle cx="35" cy="28" r="3" fill="white" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
      <circle cx="65" cy="28" r="3" fill="white" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
    </svg>
  );
};

export default Logo;
