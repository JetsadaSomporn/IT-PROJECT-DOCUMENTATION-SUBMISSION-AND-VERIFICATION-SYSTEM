'use client';

import React from 'react';

interface TabTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
}

const TabTransition: React.FC<TabTransitionProps> = ({ children, isVisible }) => {
  if (!isVisible) return null;
  
  return (
    <div className="transition-all duration-300 ease-in-out">
      {children}
    </div>
  );
};

export default TabTransition;
