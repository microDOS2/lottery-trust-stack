import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { computeStack, fmtCompact, type Assumptions, type Inputs } from '../lib/calc';

interface Marker {
  letter: string;
  dial: number;
  stackEnd: number;
  best?: boolean;
}

interface Props {
  inputs: Inputs;
  asm: Assumptions;
  markers: Marker[];
}

/**
 * "3D-lite" net-worth terrain: X = income↔growth dial, Z = time (25 yrs), Y = net worth.
 * Scenario markers sit on the surface; the best fit gets a pulsing beacon.
 */
export default function Terrain3D({ inputs, asm, markers }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Precompute the surface grid once per inputs/assumptions.
  const grid = useMemo(() => {
    const dials = 21;
    const years = 26;
    const h: number[][] = [];
    for (let di = 0; di < dials; di++) {
      const dial = (di / (dials - 1)) * 100;
      const r = computeStack({ ...inputs, mode: 'balanced', dial }, asm);
      const col: number[] = [];
      for (let y = 0; y < years; y++) {
        col.push(y === 0 ? r.core : r.projection[y - 1].end);
      }
      h.push(col);
    }
    return h;
  }, [inputs, asm]);

  const maxH = useMemo(() => Math.max(1, ...grid.flat()), [grid]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const W = mount.clientWidth;
    const H = 420;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FAF7F1');
    scene.fog = new THREE.Fog('#FAF7F1', 60, 140);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 500);
    camera.position.set(30, 27, 38);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 18;
    controls.maxDistance = 90;
    controls.target.set(0, 2, 0);
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight('#FFF6EC', 1.1));
    const sun = new THREE.DirectionalLight('#FFE8D6', 1.6);
    sun.position.set(20, 30, 10);
    scene.add(sun);

    // ---- Terrain surface with height-based vertex colors ----
    const dials = grid.length;
    const years = grid[0].length;
    const geo = new THREE.PlaneGeometry(44, 30, dials - 1, years - 1);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cLow = new THREE.Color('#F6F1EA');
    const cMid = new THREE.Color('#E8B39A');
    const cHigh = new THREE.Color('#E5604A');
    const yOf = (dial: number, year: number) => {
      const di = Math.round((dial / 100) * (dials - 1));
      return (grid[di][Math.min(year, years - 1)] / maxH) * 16;
    };
    for (let i = 0; i < pos.count; i++) {
      const xi = pos.getX(i);           // -22..22 across dials
      const zi = pos.getZ(i);           // -15..15 across years
      const di = Math.round(((xi + 22) / 44) * (dials - 1));
      const yi = Math.round(((zi + 15) / 30) * (years - 1));
      const y = (grid[di][yi] / maxH) * 16;
      pos.setY(i, y);
      const t = y / 16;
      const col = t < 0.5 ? cLow.clone().lerp(cMid, t * 2) : cMid.clone().lerp(cHigh, (t - 0.5) * 2);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const surf = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 })
    );
    scene.add(surf);
    const wire = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({ wireframe: true, color: '#7B6556', transparent: true, opacity: 0.08 })
    );
    wire.position.y = 0.01;
    scene.add(wire);

    // Axis labels as sprites
    const label = (text: string, x: number, y: number, z: number, size = 13) => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 96;
      const ctx = c.getContext('2d')!;
      ctx.font = `600 ${size * 3}px "Instrument Sans", sans-serif`;
      ctx.fillStyle = '#4A3B2E';
      ctx.textAlign = 'center';
      ctx.fillText(text, 256, 60);
      const tex = new THREE.CanvasTexture(c);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      spr.scale.set(10, 1.9, 1);
      spr.position.set(x, y, z);
      scene.add(spr);
    };
    label('more growth', -24, 0.6, 0);
    label('more income', 24, 0.6, 0);
    label('25 years', 0, 0.6, 16.2);

    // ---- Scenario markers ----
    const markerObjs: THREE.Object3D[] = [];
    for (const m of markers) {
      const x = (m.dial / 100) * 44 - 22;
      const y = yOf(m.dial, 25);
      const color = m.best ? '#4C7A3F' : '#2A1A0E';
      const sph = new THREE.Mesh(
        new THREE.SphereGeometry(m.best ? 0.55 : 0.4, 24, 24),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
      );
      sph.position.set(x, y + 0.4, 14.4);
      scene.add(sph);
      markerObjs.push(sph);
      const c = document.createElement('canvas');
      c.width = 256; c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.font = '700 52px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.fillText(m.letter, 128, 55);
      ctx.font = '500 34px "IBM Plex Mono", monospace';
      ctx.fillStyle = '#6B6359';
      ctx.fillText(fmtCompact(m.stackEnd), 128, 100);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
      spr.scale.set(5, 2.5, 1);
      spr.position.set(x, y + 2.6, 14.4);
      scene.add(spr);
      markerObjs.push(spr);
    }

    // Beacon on the best fit
    let beacon: THREE.Mesh | null = null;
    const best = markers.find((m) => m.best);
    if (best) {
      const x = (best.dial / 100) * 44 - 22;
      const y = yOf(best.dial, 25);
      beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 7, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: '#4C7A3F', transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      beacon.position.set(x, y + 3.5, 14.4);
      scene.add(beacon);
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = (performance.now() - t0) / 1000;
      if (beacon) {
        const m = beacon.material as THREE.MeshBasicMaterial;
        m.opacity = 0.22 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.2));
      }
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      const w2 = mount.clientWidth;
      camera.aspect = w2 / H;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, H);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      geo.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [grid, maxH, markers]);

  if (failed) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground">
        3D view unavailable in this browser — the charts above show the same comparison.
      </div>
    );
  }
  return (
    <div>
      <div ref={mountRef} className="h-[420px] w-full overflow-hidden rounded-lg border border-border" />
      <p className="mt-2 text-xs text-muted-foreground">
        The terrain is every dial position across 25 years — higher ground means more net worth. Drag to orbit.
        Letters mark your saved scenarios at year 25; the green beacon is your best fit.
      </p>
    </div>
  );
}
