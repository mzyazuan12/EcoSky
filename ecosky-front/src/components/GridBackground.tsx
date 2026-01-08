'use client';

import { useEffect, useRef } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import throttle from 'lodash/throttle';

const GridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosition = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const gridSize = 30; // Tighter grid spacing
  const maxDistance = 200; // Increased effect radius
  const { colorMode } = useColorMode();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = throttle((e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    }, 30);

    const drawGrid = () => {
      if (!ctx) return;
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      // Create a gradient background that matches the theme
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      if (colorMode === 'light') {
        gradient.addColorStop(0, 'rgba(240,240,240,0.95)');
        gradient.addColorStop(1, 'rgba(255,255,255,0.95)');
      } else {
        gradient.addColorStop(0, 'rgba(18,18,18,0.95)');
        gradient.addColorStop(1, 'rgba(25,25,25,0.95)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Set grid line properties based on theme
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = colorMode === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)';

      // Draw vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw an interactive glow effect at the mouse position
      if (mousePosition.current.x && mousePosition.current.y) {
        const glowGradient = ctx.createRadialGradient(
          mousePosition.current.x,
          mousePosition.current.y,
          0,
          mousePosition.current.x,
          mousePosition.current.y,
          maxDistance
        );
        if (colorMode === 'light') {
          glowGradient.addColorStop(0, 'rgba(150,200,255,0.15)');
        } else {
          glowGradient.addColorStop(0, 'rgba(100,200,255,0.15)');
        }
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.fillRect(
          mousePosition.current.x - maxDistance,
          mousePosition.current.y - maxDistance,
          maxDistance * 2,
          maxDistance * 2
        );
      }
    };

    const animate = () => {
      drawGrid();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorMode]); // Redraw when the theme changes

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      width="100%"
      height="100%"
      zIndex={-1}
      pointerEvents="none"
      css={{
        '& > canvas': {
          transition: 'opacity 0.3s ease-in-out',
        },
      }}
    >
      <canvas ref={canvasRef} />
    </Box>
  );
};

export default GridBackground;
