import type { Question } from '../game.ts';

export function makeQuestions(count: number, category = 'Test'): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    category,
    text: `Fråga ${i + 1}?`,
    options: ['Rätt', 'Fel 1', 'Fel 2', 'Fel 3'],
    correctIndex: 0,
  }));
}

/** Slumpgenerator som alltid ger samma följd, så att testerna blir förutsägbara. */
export function seededRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
