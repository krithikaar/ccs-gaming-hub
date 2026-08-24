import React, { useEffect, useRef } from 'react';

interface Fish {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  depth: number;
  direction: 1 | -1;
  wiggleOffset: number;
}

interface Crab {
  x: number;
  y: number;
  speed: number;
  direction: 1 | -1;
  clawWiggle: number;
}

interface Bubble {
  x: number;
  y: number;
  speed: number;
  radius: number;
  alpha: number;
  wobble: number;
  wobbleSpeed: number;
}

interface Seaweed {
  x: number;
  height: number;
  color: string;
  segments: number;
  swaySpeed: number;
  phase: number;
}

export const DeepSeaBackground: React.FC<{
  emotionTheme?: 'joy' | 'anger' | 'fear' | 'sadness' | 'neutral';
}> = ({ emotionTheme = 'neutral' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate random swimming background fishes
    const fishes: Fish[] = Array.from({ length: 9 }, () => ({
      x: Math.random() * width,
      y: 60 + Math.random() * (height * 0.7),
      speed: (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1),
      size: Math.random() * 10 + 12,
      color: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6'][Math.floor(Math.random() * 5)],
      depth: Math.random() * 0.5 + 0.5,
      direction: 1,
      wiggleOffset: Math.random() * Math.PI * 2,
    }));

    // Crabs on the seabed
    const crabs: Crab[] = [
      { x: width * 0.18, y: height - 28, speed: 0.35, direction: 1, clawWiggle: 0 },
      { x: width * 0.78, y: height - 24, speed: -0.4, direction: -1, clawWiggle: 2 },
    ];

    // Ambient floating bubbles
    const bubbles: Bubble[] = Array.from({ length: 32 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: Math.random() * 0.8 + 0.5,
      radius: Math.random() * 5 + 2,
      alpha: Math.random() * 0.5 + 0.2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.03 + 0.015,
    }));

    // Seaweed forests
    const seaweeds: Seaweed[] = Array.from({ length: 14 }, (_, i) => ({
      x: (i / 13) * width * 0.95 + width * 0.025 + (Math.random() * 20 - 10),
      height: Math.random() * 90 + 70,
      color: i % 2 === 0 ? '#0d9488' : '#059669',
      segments: 6,
      swaySpeed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.02;

      // 1. Deep Ocean Base Gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      if (emotionTheme === 'anger') {
        grad.addColorStop(0, '#1e102d');
        grad.addColorStop(0.5, '#160d2e');
        grad.addColorStop(1, '#090514');
      } else if (emotionTheme === 'sadness') {
        grad.addColorStop(0, '#04162e');
        grad.addColorStop(0.5, '#031024');
        grad.addColorStop(1, '#020817');
      } else if (emotionTheme === 'fear') {
        grad.addColorStop(0, '#06202e');
        grad.addColorStop(0.5, '#041520');
        grad.addColorStop(1, '#020c14');
      } else {
        // Joy & Neutral deep rich cyan-blue
        grad.addColorStop(0, '#032644');
        grad.addColorStop(0.4, '#031b38');
        grad.addColorStop(1, '#020d20');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Underwater Sun Rays / Light Caustics from above
      ctx.save();
      for (let i = 0; i < 4; i++) {
        const rayX = width * (0.2 + i * 0.22) + Math.sin(time * 0.5 + i) * 35;
        const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 60, height * 0.85);
        rayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        rayGrad.addColorStop(0.6, 'rgba(6, 182, 212, 0.03)');
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayX - 30, 0);
        ctx.lineTo(rayX + 50, 0);
        ctx.lineTo(rayX + 160, height);
        ctx.lineTo(rayX + 30, height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 3. Draw Seaweed Forest at Seabed
      seaweeds.forEach((sw) => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sw.x, height - 12);

        const segLen = sw.height / sw.segments;
        for (let s = 1; s <= sw.segments; s++) {
          const sway = Math.sin(time * sw.swaySpeed * 60 + sw.phase + s * 0.4) * (s * 4);
          const py = height - 12 - s * segLen;
          const px = sw.x + sway;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      });

      // 4. Sandy Seabed & Coral Rocks
      ctx.save();
      const seabedGrad = ctx.createLinearGradient(0, height - 36, 0, height);
      seabedGrad.addColorStop(0, '#0f2942');
      seabedGrad.addColorStop(1, '#051324');
      ctx.fillStyle = seabedGrad;
      ctx.beginPath();
      ctx.moveTo(0, height - 26);
      ctx.bezierCurveTo(width * 0.3, height - 36, width * 0.7, height - 18, width, height - 28);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Rock details & Corals
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.arc(width * 0.12, height - 20, 18, 0, Math.PI * 2);
      ctx.arc(width * 0.16, height - 16, 12, 0, Math.PI * 2);
      ctx.arc(width * 0.86, height - 22, 22, 0, Math.PI * 2);
      ctx.arc(width * 0.90, height - 18, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Draw Crabs scuttling on Seabed
      crabs.forEach((c) => {
        c.x += c.speed;
        c.clawWiggle += 0.08;
        if (c.x < width * 0.08) {
          c.speed = Math.abs(c.speed);
          c.direction = 1;
        } else if (c.x > width * 0.9) {
          c.speed = -Math.abs(c.speed);
          c.direction = -1;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(c.direction, 1);

        // Crab Body
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crab Eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-3, -7, 2.5, 0, Math.PI * 2);
        ctx.arc(3, -7, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-3, -7, 1.2, 0, Math.PI * 2);
        ctx.arc(3, -7, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Crab Claws
        const clawAngle = Math.sin(c.clawWiggle) * 0.25;
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        // Left claw
        ctx.beginPath();
        ctx.arc(-10, -4, 4, Math.PI * 0.5 + clawAngle, Math.PI * 1.5 - clawAngle);
        ctx.stroke();
        // Right claw
        ctx.beginPath();
        ctx.arc(10, -4, 4, -Math.PI * 0.5 - clawAngle, Math.PI * 0.5 + clawAngle);
        ctx.stroke();

        ctx.restore();
      });

      // 6. Draw Swimming Small Fishes
      fishes.forEach((f) => {
        f.x += f.speed;
        f.wiggleOffset += 0.12;

        if (f.speed > 0 && f.x > width + 40) f.x = -40;
        else if (f.speed < 0 && f.x < -40) f.x = width + 40;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(f.speed > 0 ? 1 : -1, 1);
        ctx.globalAlpha = f.depth;

        // Fish Body
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.moveTo(f.size, 0);
        ctx.quadraticCurveTo(0, -f.size * 0.45, -f.size * 0.6, 0);
        ctx.quadraticCurveTo(0, f.size * 0.45, f.size, 0);
        ctx.fill();

        // Fish Tail with gentle wiggle
        const tailWiggle = Math.sin(f.wiggleOffset) * (f.size * 0.2);
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.6, 0);
        ctx.lineTo(-f.size * 1.0, -f.size * 0.35 + tailWiggle);
        ctx.lineTo(-f.size * 1.0, f.size * 0.35 + tailWiggle);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(f.size * 0.5, -f.size * 0.1, f.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(f.size * 0.55, -f.size * 0.1, f.size * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 7. Draw Rising Ambient Ocean Bubbles
      bubbles.forEach((b) => {
        b.y -= b.speed;
        b.wobble += b.wobbleSpeed;
        const wobbleX = b.x + Math.sin(b.wobble) * 8;

        if (b.y < -10) {
          b.y = height + 10;
          b.x = Math.random() * width;
        }

        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.beginPath();
        ctx.arc(wobbleX, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Highlight glint on bubble
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(wobbleX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [emotionTheme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-3xl"
    />
  );
};
