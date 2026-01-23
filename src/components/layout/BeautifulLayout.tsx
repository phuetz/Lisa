/**
 * BeautifulLayout.tsx
 * 
 * Layout principal avec sidebar et fond animé
 */

import React from 'react';
import { BeautifulSidebar } from './BeautifulSidebar';
import { AuroraBackground } from '../ui/AnimatedBackground';

interface BeautifulLayoutProps {
  children: React.ReactNode;
  showBackground?: boolean;
}

export const BeautifulLayout: React.FC<BeautifulLayoutProps> = ({
  children,
  showBackground = true,
}) => {
  return (
    <div className="min-h-screen">
      {/* Animated Background */}
      {showBackground && <AuroraBackground intensity="subtle" />}

      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <BeautifulSidebar />
      </div>

      {/* Main Content - responsive margin */}
      <main className="ml-0 md:ml-72 min-h-screen transition-all duration-300">
        <div className="relative z-10 p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default BeautifulLayout;
