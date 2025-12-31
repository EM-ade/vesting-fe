/**
 * Hook to determine animation direction based on navigation
 * Provides directional animations for better UX
 */

import { useState, useEffect } from 'react';

type TabOrder = 'overview' | 'pools' | 'claims' | 'treasury' | 'settings';

const tabOrderMap: Record<TabOrder, number> = {
  overview: 0,
  pools: 1,
  claims: 2,
  treasury: 3,
  settings: 4,
};

interface AnimationDirection {
  direction: 'forward' | 'backward' | 'none';
  previousTab: TabOrder | null;
  currentTab: TabOrder | null;
}

/**
 * Hook to track tab navigation direction
 * Returns animation direction for smart transitions
 */
export function useAnimationDirection(currentTab: TabOrder): AnimationDirection {
  const [previousTab, setPreviousTab] = useState<TabOrder | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward' | 'none'>('none');

  useEffect(() => {
    if (previousTab && currentTab) {
      const prevIndex = tabOrderMap[previousTab];
      const currentIndex = tabOrderMap[currentTab];
      
      if (currentIndex > prevIndex) {
        setDirection('forward');
      } else if (currentIndex < prevIndex) {
        setDirection('backward');
      } else {
        setDirection('none');
      }
    }
    
    setPreviousTab(currentTab);
  }, [currentTab, previousTab]);

  return {
    direction,
    previousTab,
    currentTab,
  };
}

/**
 * Get directional variants based on navigation direction
 */
export function getDirectionalVariants(direction: 'forward' | 'backward' | 'none') {
  if (direction === 'forward') {
    return {
      hidden: { opacity: 0, x: 60 },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -60 },
    };
  }
  
  if (direction === 'backward') {
    return {
      hidden: { opacity: 0, x: -60 },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 60 },
    };
  }
  
  return {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };
}
