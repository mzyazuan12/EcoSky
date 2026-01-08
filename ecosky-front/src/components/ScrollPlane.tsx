// components/ScrollPlane.tsx
'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
export const ScrollPlane = () => {
  const planeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!planeRef.current) return;
      
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Calculate scroll progress (0 to 1)
      const scrollProgress = scrollY / (documentHeight - windowHeight);
      
      // Calculate position transformations
      const xPos = Math.sin(scrollProgress * Math.PI * 2) * 100;
      const yPos = scrollProgress * 100;
      const rotation = scrollProgress * 360;
      const scale = 0.5 + Math.abs(Math.sin(scrollProgress * Math.PI * 2)) * 0.5;

      planeRef.current.style.transform = `
        translate(${xPos}vw, ${yPos}vh)
        rotate(${rotation}deg)
        scale(${scale})
      `;
    };

    const throttledScroll = throttle(handleScroll, 16);
    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  return (
    <Box
      ref={planeRef}
      position="fixed"
      top="0"
      left="0"
      zIndex="15"
      w="100px"
      h="100px"
      transition="transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
      pointerEvents="none"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
          color: '#3182ce',
        }}
      >
        <path d="M21 16v-2l-8-5V3.5c0-.29-.22-.5-.5-.5s-.5.21-.5.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
      </svg>
    </Box>
  );
};

function throttle(fn: (...args: any[]) => void, delay: number) {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) return;
    lastCall = now;
    fn(...args);
  };
}