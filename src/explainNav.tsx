import { createContext, useContext } from 'react';

/** Open the Explanations page, optionally scrolled to a section id. */
export const ExplainNav = createContext<(id?: string) => void>(() => {});

export function useExplain() {
  return useContext(ExplainNav);
}
