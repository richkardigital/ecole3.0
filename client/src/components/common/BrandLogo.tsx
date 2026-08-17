import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useSystemSettings, formatAssetUrl } from '@/contexts/SystemSettingsContext';

export interface BrandLogoProps {
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show the text label alongside the icon */
  showText?: boolean;
  /** Text theme variant (dark text for light bg, light text for dark bg like footer) */
  theme?: 'dark' | 'light';
  /** Optional custom redirect URL (default: none if not wrapped, or provided) */
  to?: string;
  /** Optional custom class */
  className?: string;
  /** Subtitle text under the brand name (default: 'SEEEC') */
  subtitle?: string;
  /** Custom logo override if any */
  logoUrl?: string | null;
  /** Custom platform name override if any */
  platformName?: string;
  /** Click handler if any */
  onClick?: () => void;
}

const SIZE_CONFIG = {
  xs: {
    iconSize: 'w-6 h-6',
    imgSize: 'h-6 w-auto max-h-6 max-w-[28px]',
    titleSize: 'text-sm font-black',
    subSize: 'text-[8px] tracking-[0.14em]',
    sparkleSize: 'w-2 h-2',
    gap: 'gap-2',
  },
  sm: {
    iconSize: 'w-8 h-8',
    imgSize: 'h-8 w-auto max-h-8 max-w-[36px]',
    titleSize: 'text-base font-black',
    subSize: 'text-[9px] tracking-[0.16em]',
    sparkleSize: 'w-2.5 h-2.5',
    gap: 'gap-2.5',
  },
  md: {
    iconSize: 'w-10 h-10',
    imgSize: 'h-10 w-auto max-h-10 max-w-[46px]',
    titleSize: 'text-xl font-black',
    subSize: 'text-[10px] tracking-[0.18em]',
    sparkleSize: 'w-3 h-3',
    gap: 'gap-3',
  },
  lg: {
    iconSize: 'w-14 h-14',
    imgSize: 'h-14 w-auto max-h-14 max-w-[64px]',
    titleSize: 'text-2xl sm:text-3xl font-black',
    subSize: 'text-[11px] tracking-[0.2em]',
    sparkleSize: 'w-3.5 h-3.5',
    gap: 'gap-3.5',
  },
  xl: {
    iconSize: 'w-16 h-16',
    imgSize: 'h-16 w-auto max-h-16 max-w-[76px]',
    titleSize: 'text-3xl sm:text-4xl font-black',
    subSize: 'text-xs tracking-[0.22em]',
    sparkleSize: 'w-4 h-4',
    gap: 'gap-4',
  },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  theme = 'dark',
  to,
  className = '',
  subtitle = 'SEEEC',
  logoUrl: propLogoUrl,
  platformName: propPlatformName,
  onClick,
}) => {
  const { settings } = useSystemSettings();
  const [imageError, setImageError] = useState(false);
  const conf = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const isLight = theme === 'light';

  // Determine active logo and title
  const activeRawLogo = propLogoUrl !== undefined ? propLogoUrl : settings?.logoUrl;
  const activeName = propPlatformName || settings?.platformName || 'ÉCOLE 3.0';

  const logoSrc = imageError || !activeRawLogo ? '/logo.png' : formatAssetUrl(activeRawLogo);

  const content = (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${conf.gap} group select-none ${
        to ? 'cursor-pointer transition-transform duration-200 hover:scale-[1.02]' : ''
      } ${className}`}
    >
      {/* ── LOGO ICON IMAGE ── */}
      <div className="relative shrink-0 flex items-center justify-center">
        <img
          src={logoSrc}
          alt={activeName}
          onError={() => setImageError(true)}
          className={`${conf.imgSize} object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105 rounded-sm`}
          loading="eager"
        />
      </div>

      {/* ── TEXT LABEL ── */}
      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`${conf.titleSize} tracking-tight leading-none uppercase ${
                isLight ? 'text-white' : 'text-slate-900'
              }`}
            >
              {activeName}
            </span>
          </div>
          {subtitle && (
            <span
              className={`${conf.subSize} font-black uppercase flex items-center gap-1 mt-1 ${
                isLight ? 'text-[#38bdf8]' : 'text-[#189CD8]'
              }`}
            >
              <Sparkles className={`${conf.sparkleSize} shrink-0 ${isLight ? 'text-[#38bdf8]' : 'text-[#189CD8]'}`} />
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center w-fit no-underline">
        {content}
      </Link>
    );
  }

  return content;
};

export default BrandLogo;
