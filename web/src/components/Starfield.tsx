"use client";

import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  z: number; // depth 0..1
  r: number;
  twinkleSeed: number;
};

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let stars: Star[] = [];
    let animationId = 0;
    let width = 0;
    let height = 0;
    let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    const seed = (count: number) => {
      stars = [];
      for (let i = 0; i < count; i++) {
        const z = Math.pow(Math.random(), 1.6); // bias toward distant
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.3 + (1 - z) * 1.5,
          twinkleSeed: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = Math.min(360, Math.floor((width * height) / 6000));
      seed(density);
    };

    resize();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    let lastT = performance.now();
    const render = (t: number) => {
      const dt = (t - lastT) / 1000;
      lastT = t;
      ctx.clearRect(0, 0, width, height);

      // Faint nebula wash
      const grd = ctx.createRadialGradient(
        width * 0.2,
        height * 0.05,
        20,
        width * 0.2,
        height * 0.05,
        Math.max(width, height) * 0.7
      );
      grd.addColorStop(0, "rgba(200, 16, 46, 0.08)");
      grd.addColorStop(0.4, "rgba(200, 16, 46, 0.02)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, width, height);

      for (const s of stars) {
        // Slow parallax drift
        s.x -= dt * (8 + (1 - s.z) * 16) * 0.05;
        if (s.x < -2) s.x = width + 2;
        s.twinkleSeed += dt * (0.6 + s.z * 1.2);

        const tw = 0.55 + 0.45 * Math.sin(s.twinkleSeed);
        const alpha = (0.35 + 0.65 * (1 - s.z)) * tw;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(231, 230, 221, ${alpha.toFixed(3)})`;
        ctx.fill();

        // Occasional warm star
        if (s.r > 1.2 && Math.sin(s.twinkleSeed * 0.3) > 0.92) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 168, 87, ${(alpha * 0.4).toFixed(3)})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
