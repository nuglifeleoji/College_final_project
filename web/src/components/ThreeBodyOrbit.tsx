"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  THREE_BODY_BOUNDS,
  THREE_BODY_STEPS_PER_FRAME,
  advanceThreeBody,
  createSimulationBodies,
} from "@/lib/three-body-physics";

type Props = {
  size?: number;
  className?: string;
};

const CAMERA_Z = 2.75;

export default function ThreeBodyOrbit({ size = 360, className = "" }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const bodies = createSimulationBodies();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0.35, CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.domElement.style.width = `${size}px`;
    renderer.domElement.style.height = `${size}px`;
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.x = -0.45;
    root.rotation.y = 0.35;
    scene.add(root);

    const ambient = new THREE.AmbientLight(0xe7e6dd, 0.42);
    const key = new THREE.PointLight(0xffe0b0, 2.1, 6);
    key.position.set(1.2, 1.4, 1.8);
    scene.add(ambient, key);

    const grid = new THREE.GridHelper(2.6, 12, 0x3a3849, 0x2a2837);
    grid.material.transparent = true;
    grid.material.opacity = 0.32;
    root.add(grid);

    const boundsFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(
          THREE_BODY_BOUNDS * 2,
          THREE_BODY_BOUNDS * 2,
          THREE_BODY_BOUNDS * 2
        )
      ),
      new THREE.LineBasicMaterial({
        color: 0x3a3849,
        transparent: true,
        opacity: 0.28,
      })
    );
    root.add(boundsFrame);

    const bodyMeshes = bodies.map((body) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(body.radius, 32, 18),
        new THREE.MeshStandardMaterial({
          color: body.color,
          emissive: body.glow,
          emissiveIntensity: 0.45,
          roughness: 0.34,
          metalness: 0.08,
        })
      );
      const glow = new THREE.PointLight(body.color, 0.8, 1.4);
      mesh.add(glow);
      root.add(mesh);
      return mesh;
    });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      root.rotation.y += (event.clientX - lastX) * 0.008;
      root.rotation.x += (event.clientY - lastY) * 0.008;
      root.rotation.x = Math.max(-1.25, Math.min(1.25, root.rotation.x));
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    let animationId = 0;
    const render = () => {
      const steps = reduceMotion.matches ? 1 : THREE_BODY_STEPS_PER_FRAME;
      for (let i = 0; i < steps; i++) advanceThreeBody(bodies);

      bodies.forEach((body, i) => {
        bodyMeshes[i].position.set(...body.position);
      });

      if (!dragging && !reduceMotion.matches) {
        root.rotation.y += 0.0017;
      }
      renderer.render(scene, camera);
      if (!reduceMotion.matches) animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      bodyMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      boundsFrame.geometry.dispose();
      if (Array.isArray(boundsFrame.material)) {
        boundsFrame.material.forEach((material) => material.dispose());
      } else {
        boundsFrame.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      className={`relative cursor-grab active:cursor-grabbing ${className}`}
      style={{ width: size, height: size }}
      aria-label="Interactive 3D Newtonian three-body simulation"
    />
  );
}
