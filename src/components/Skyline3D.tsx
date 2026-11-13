import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fmtCompact } from '../lib/calc';

interface PillarScenario {
  letter: string;
  color: string;
  values: number[]; // [year1, year10, year25/30 end]
}

interface Props {
  scenarios: PillarScenario[];
  milestones?: string[];
}

/**
 * 3D-lite skyline: one pillar per scenario per milestone year. Taller = more money.
 * Falls back to a plain SVG bar view when WebGL is unavailable — never a blank canvas.
 */

function SkylineSVG({ scenarios }: Props) {
  const maxV = Math.max(1, ...scenarios.flatMap((s) => s.values));
  return (
    <svg viewBox="0 0 720 260" className="w-full" role="img" aria-label="Scenario skyline, taller bars mean more money">
      {scenarios.map((s, si) => {
        const x = 60 + si * 140;
        return s.values.map((v, yi) => {
          const h = Math.max(3, (v / maxV) * 150);
          const y = 210 - h;
          return (
            <g key={`${si}-${yi}`}>
              <rect x={x + yi * 36} y={y} width={30} height={h} rx={3} fill={s.color} opacity={0.9} />
              <text x={x + yi * 36 + 15} y={y - 6} textAnchor="middle" fontSize={10} fill="#4A3B2E">{fmtCompact(v)}</text>
              {yi === 2 && <text x={x + yi * 36 + 15} y={228} textAnchor="middle" fontSize={12} fontWeight={600} fill="#4A3B2E">{s.letter}</text>}
            </g>
          );
        });
      })}
      {[0, 1, 2].map((yi) => (
        <text key={yi} x={40 + yi * 250} y={248} fontSize={11} fill="#6B6359">{['Year 1', 'Year 10', 'Year 30'][yi]}</text>
      ))}
      <line x1="20" y1="210" x2="700" y2="210" stroke="#E6DFD3" strokeWidth={1.5} />
    </svg>
  );
}
export default function Skyline3D({ scenarios, milestones = ['Year 1', 'Year 10', 'Year 30'] }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || scenarios.length === 0) return;
    // Pre-check WebGL so unsupported browsers go straight to the fallback without console noise.
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      if (!gl) { setFailed(true); return; }
    } catch { setFailed(true); return; }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    const W = mount.clientWidth;
    const H = 340;
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FAF7F1');
    scene.fog = new THREE.Fog('#FAF7F1', 60, 140);

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 300);
    camera.position.set(14, 16, 26);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 14;
    controls.maxDistance = 70;
    controls.target.set(0, 4, 0);
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight('#FFF6EC', 1.2));
    const sun = new THREE.DirectionalLight('#FFE8D6', 1.5);
    sun.position.set(10, 25, 12);
    scene.add(sun);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 60),
      new THREE.MeshStandardMaterial({ color: '#F6F1EA', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    const gridHelper = new THREE.GridHelper(60, 30, '#E6DFD3', '#EFEAE0');
    scene.add(gridHelper);

    const maxV = Math.max(1, ...scenarios.flatMap((s) => s.values));
    const yearLabels = milestones;
    const textSprite = (text: string, x: number, y: number, z: number, color = '#4A3B2E', big = false) => {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 96;
      const ctx = c.getContext('2d')!;
      ctx.font = `600 ${big ? 44 : 36}px "Instrument Sans", sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 58);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
      spr.scale.set(big ? 6.5 : 4.5, big ? 2.4 : 1.7, 1);
      spr.position.set(x, y, z);
      scene.add(spr);
    };

    scenarios.forEach((s, si) => {
      const x = (si - (scenarios.length - 1) / 2) * 6;
      s.values.forEach((v, yi) => {
        const z = (yi - 1) * 7;
        const h = Math.max(0.15, (v / maxV) * 12);
        const geo = new THREE.BoxGeometry(2.6, h, 2.6);
        const mat = new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.55, metalness: 0.08 });
        const pillar = new THREE.Mesh(geo, mat);
        pillar.position.set(x, h / 2, z);
        scene.add(pillar);
        // cap
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(2.7, 0.18, 2.7),
          new THREE.MeshStandardMaterial({ color: '#2A1A0E', roughness: 0.6 })
        );
        cap.position.set(x, h + 0.09, z);
        scene.add(cap);
        textSprite(fmtCompact(v), x, h + 1.6, z, s.color, true);
        textSprite(s.letter, x, 0.7, z + 2.1, '#4A3B2E');
        if (yearLabels[yi]) textSprite(yearLabels[yi], x, 0.5, z + 4.4, '#6B6359');
      });
      // year labels on the back of the last scenario row for years 10 and 30
      if (si === scenarios.length - 1) {
        textSprite('Year 10', 0, 0.5, 0, '#6B6359');
        textSprite('Year 30', 0, 0.5, -7, '#6B6359');
      }
    });

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
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
      mount.removeChild(renderer.domElement);
    };
  }, [scenarios]);

  if (failed) return <SkylineSVG scenarios={scenarios} />;
  return (
    <div>
      <div ref={mountRef} className="h-[340px] w-full overflow-hidden rounded-lg border border-border" />
      <p className="mt-2 text-sm text-muted-foreground">
        One pillar per setup per milestone year — <strong>taller means more money</strong> at that point. Drag to spin.
      </p>
    </div>
  );
}
