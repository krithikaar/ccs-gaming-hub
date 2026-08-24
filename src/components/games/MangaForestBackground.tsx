import React, { useEffect, useRef } from 'react';

interface MangaForestBackgroundProps {
  intensity?: number;
  showSunbeams?: boolean;
}

export const MangaForestBackground: React.FC<MangaForestBackgroundProps> = ({
  intensity = 1,
  showSunbeams = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 1000);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Manga forest ambient floating Sakura petals & spirit motes
    const particles = Array.from({ length: 36 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 3 + Math.random() * 5,
      speedX: 0.3 + Math.random() * 0.8,
      speedY: 0.4 + Math.random() * 0.9,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      color: Math.random() > 0.4 ? '#fbcfe8' : '#a7f3d0', // pink Sakura or mint spirit
      alpha: 0.3 + Math.random() * 0.5,
      swayOffset: Math.random() * Math.PI * 2,
    }));

    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Manga Forest Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#0a2318'); // Deep pine canopy top
      skyGrad.addColorStop(0.35, '#0d3b2e'); // Emerald mid-canopy
      skyGrad.addColorStop(0.7, '#134e3a'); // Vibrant forest clearing
      skyGrad.addColorStop(1, '#062016'); // Ground mulch & moss
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Anime Sunbeams (Crepuscular Rays)
      if (showSunbeams) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5; i++) {
          const rayAngle = -0.35 + i * 0.18 + Math.sin(t * 0.5 + i) * 0.02;
          const rayGrad = ctx.createLinearGradient(
            width * 0.2 + i * 140,
            0,
            width * 0.4 + i * 180,
            height
          );
          rayGrad.addColorStop(0, `rgba(254, 240, 138, ${0.18 * intensity})`);
          rayGrad.addColorStop(0.5, `rgba(167, 243, 208, ${0.08 * intensity})`);
          rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(width * 0.15 + i * 150, 0);
          ctx.lineTo(width * 0.25 + i * 150 + 70, 0);
          ctx.lineTo(width * 0.45 + i * 190 + 130, height);
          ctx.lineTo(width * 0.35 + i * 190, height);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Manga Distant Canopy Silhouettes
      ctx.fillStyle = 'rgba(6, 44, 32, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      for (let x = 0; x <= width; x += 40) {
        const treeY = height * 0.4 + Math.sin(x * 0.015) * 35 + Math.cos(x * 0.035) * 20;
        ctx.lineTo(x, treeY);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // 4. Midground Vibrant Manga Trees & Tree Trunks
      const treePositions = [0.08, 0.25, 0.75, 0.92];
      treePositions.forEach((pos, idx) => {
        const rootX = width * pos;
        const trunkGrad = ctx.createLinearGradient(rootX - 25, 0, rootX + 25, 0);
        trunkGrad.addColorStop(0, '#1c1917');
        trunkGrad.addColorStop(0.5, '#44403c');
        trunkGrad.addColorStop(1, '#292524');
        ctx.fillStyle = trunkGrad;

        // Tree Trunk
        ctx.beginPath();
        ctx.moveTo(rootX - 16, 0);
        ctx.lineTo(rootX + 16, 0);
        ctx.lineTo(rootX + 32, height);
        ctx.lineTo(rootX - 32, height);
        ctx.closePath();
        ctx.fill();

        // Anime leafy clusters
        ctx.fillStyle = idx % 2 === 0 ? '#15803d' : '#166534';
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          ctx.arc(rootX + (j - 1) * 30, height * 0.2 + j * 40, 45 + j * 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 5. Foreground Forest Floor, Lush Bushes & Manga Flowers
      // Ground curve
      const groundGrad = ctx.createLinearGradient(0, height * 0.8, 0, height);
      groundGrad.addColorStop(0, '#064e3b');
      groundGrad.addColorStop(1, '#022c22');
      ctx.fillStyle = groundGrad;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.85);
      ctx.quadraticCurveTo(width * 0.5, height * 0.8, width, height * 0.85);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Bush puffs on corners
      const drawBush = (cx: number, cy: number, r: number, color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx - r * 0.6, cy + r * 0.2, r * 0.8, 0, Math.PI * 2);
        ctx.arc(cx + r * 0.6, cy + r * 0.2, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      };

      drawBush(50, height - 20, 55, '#16a34a');
      drawBush(width - 50, height - 20, 60, '#15803d');
      drawBush(width * 0.5, height + 10, 70, '#166534');

      // Cute Manga Flowers
      const flowers = [
        { x: 70, y: height - 40, c: '#f43f5e' },
        { x: 120, y: height - 25, c: '#fbbf24' },
        { x: width - 80, y: height - 45, c: '#a855f7' },
        { x: width - 140, y: height - 30, c: '#38bdf8' },
      ];
      flowers.forEach((f) => {
        ctx.fillStyle = f.c;
        for (let p = 0; p < 5; p++) {
          const ang = (p * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(f.x + Math.cos(ang) * 6, f.y + Math.sin(ang) * 6, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Floating Sakura Petals & Spirit Orbs
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY + Math.sin(t + p.swayOffset) * 0.4;
        p.rotation += p.rotSpeed;

        if (p.x > width + 20) p.x = -20;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        // Draw petal shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, showSunbeams]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl"
      style={{ zIndex: 0 }}
    />
  );
};
