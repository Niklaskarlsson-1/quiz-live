import { useEffect, useState } from 'react';
import type { PublicPlayer } from '@quiz/shared';

const NAME_KEY = 'quiz-live:name';

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Privat läge eller full lagring: namnet sparas bara inte.
  }
}

/** Spelare sorterade efter poäng, med placering. Lika poäng ger samma placering. */
export function ranked(players: PublicPlayer[]): (PublicPlayer & { place: number })[] {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'sv'));
  let place = 0;
  return sorted.map((p, i) => {
    if (i === 0 || p.score !== sorted[i - 1].score) place = i + 1;
    return { ...p, place };
  });
}

export function formatScore(n: number): string {
  return n.toLocaleString('sv-SE');
}

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

/**
 * Räknar ned till en deadline. Servern skickar "tid kvar" i stället för en klockslag,
 * så att det inte spelar någon roll om klientens klocka går fel.
 */
export function useCountdown(remainingMs: number, key: unknown): number {
  const [deadline, setDeadline] = useState(() => Date.now() + remainingMs);
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    // Ny deadline när en ny fråga (key) kommer.
    const d = Date.now() + remainingMs;
    setDeadline(d);
    setLeft(Math.max(0, d - Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, deadline - Date.now())), 100);
    return () => clearInterval(id);
  }, [deadline]);

  return left;
}
