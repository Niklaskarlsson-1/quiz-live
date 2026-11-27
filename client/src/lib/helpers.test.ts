import { describe, expect, it } from 'vitest';
import { player } from '../test/fakeGame.tsx';
import { ranked } from './helpers.ts';

describe('ranked', () => {
  it('sorterar efter poäng, högst först', () => {
    const result = ranked([
      player({ id: '1', name: 'Anna', score: 500 }),
      player({ id: '2', name: 'Bo', score: 1500 }),
      player({ id: '3', name: 'Cia', score: 1000 }),
    ]);
    expect(result.map((p) => [p.name, p.place])).toEqual([
      ['Bo', 1],
      ['Cia', 2],
      ['Anna', 3],
    ]);
  });

  it('ger samma placering vid lika poäng och hoppar över nästa', () => {
    const result = ranked([
      player({ id: '1', name: 'Cia', score: 800 }),
      player({ id: '2', name: 'Anna', score: 800 }),
      player({ id: '3', name: 'Bo', score: 200 }),
    ]);
    expect(result.map((p) => [p.name, p.place])).toEqual([
      ['Anna', 1],
      ['Cia', 1],
      ['Bo', 3],
    ]);
  });
});
