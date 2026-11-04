import { createContext, useContext } from 'react';

/** Open the Explanations page, optionally scrolled to a section id. */
export const ExplainNav = createContext<(id?: string) => void>(() => {});

export function useExplain() {
  return useContext(ExplainNav);
}

/** `#explain` or `#explain-trade`. Null when the hash is something else. */
export function explainSectionFromHash(hash = location.hash): string | null {
  const h = hash.replace(/^#/, '');
  if (h === 'explain') return '';
  if (h.startsWith('explain-')) return h.slice('explain-'.length);
  return null;
}

export function openExplainTab(id?: string) {
  const url = new URL(window.location.href);
  url.hash = id ? `explain-${id}` : 'explain';
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}
