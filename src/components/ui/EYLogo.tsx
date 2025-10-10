import React from 'react';
import { EY_COLORS } from '@features/gantt/constants';
import eyLogoIcon from '../../assets/ey_logo_icon_171166.ico';

interface EYLogoProps {
  size?: number;
}

export const EYLogo: React.FC<EYLogoProps> = ({ size = 80 }) => {
  return (
    <div className="flex flex-col items-center">
      <img src={eyLogoIcon} alt="EY Logo" width={size} height={size} className="mb-2" />
      <div className="text-center leading-tight">
        <div className="text-sm font-bold" style={{ color: EY_COLORS.black }}>
          Building a better
        </div>
        <div className="text-sm font-bold" style={{ color: EY_COLORS.black }}>
          working world
        </div>
      </div>
    </div>
  );
};
