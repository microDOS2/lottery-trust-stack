import { lazy, Suspense } from 'react';

const Skyline = lazy(() => import('./Skyline3D'));

interface PillarScenario { letter: string; color: string; values: number[] }

export default function Lazy3D({ scenarios, milestones }: { scenarios: PillarScenario[]; milestones?: string[] }) {
  return (
    <Suspense fallback={<div className="h-[340px] animate-pulse rounded-lg bg-secondary" />}>
      <Skyline scenarios={scenarios} milestones={milestones} />
    </Suspense>
  );
}
