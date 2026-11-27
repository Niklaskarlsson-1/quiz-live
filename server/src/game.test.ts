import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES, MAX_PLAYERS } from '@quiz/shared';
import {
  addPlayer,
  advance,
  allAnswered,
  backToLobby,
  calcPoints,
  createRoom,
  generateCode,
  normalizeName,
  removePlayer,
  reveal,
  shuffleOptions,
  startGame,
  submitAnswer,
  toPublicState,
  updateSettings,
  type Room,
} from './game.ts';
import { makeQuestions, seededRng } from './test/helpers.ts';

const T0 = 1_000_000;

function roomWithPlayers(...names: string[]): Room {
  const room = createRoom('ABCD', 'p0', names[0] ?? 'Värd');
  names.slice(1).forEach((n, i) => addPlayer(room, `p${i + 1}`, n));
  return room;
}

function startedRoom(players = 2, questions = 3): Room {
  const room = roomWithPlayers(...Array.from({ length: players }, (_, i) => `Spelare${i}`));
  startGame(room, makeQuestions(questions), T0);
  return room;
}

describe('normalizeName', () => {
  it('tar bort extra mellanslag', () => {
    expect(normalizeName('  Anna   Berg ')).toBe('Anna Berg');
  });

  it('avvisar tomma, för långa och felaktiga namn', () => {
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('x'.repeat(17))).toBeNull();
    expect(normalizeName(42)).toBeNull();
  });
});

describe('generateCode', () => {
  it('ger fyra versaler utan I och O', () => {
    const code = generateCode(new Set());
    expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
  });

  it('ger aldrig en kod som redan används', () => {
    const rng = seededRng(7);
    const first = generateCode(new Set(), seededRng(7));
    expect(generateCode(new Set([first]), rng)).not.toBe(first);
  });
});

describe('calcPoints', () => {
  it('ger 0 för fel svar', () => {
    expect(calcPoints(false, 0, 10_000, 0)).toBe(0);
  });

  it('ger 1000 för ett blixtsnabbt svar och 500 i sista stund', () => {
    expect(calcPoints(true, 0, 10_000, 1)).toBe(1000);
    expect(calcPoints(true, 10_000, 10_000, 1)).toBe(500);
    expect(calcPoints(true, 5_000, 10_000, 1)).toBe(750);
  });

  it('ger bonus för rätt svar i rad, max 300', () => {
    expect(calcPoints(true, 10_000, 10_000, 2)).toBe(600);
    expect(calcPoints(true, 10_000, 10_000, 4)).toBe(800);
    expect(calcPoints(true, 10_000, 10_000, 9)).toBe(800);
  });

  it('klarar svar som kommer efter tidsgränsen (inom marginalen)', () => {
    expect(calcPoints(true, 10_400, 10_000, 1)).toBe(500);
  });
});

describe('shuffleOptions', () => {
  it('blandar alternativen men pekar fortfarande på rätt svar', () => {
    const q = makeQuestions(1)[0];
    for (let seed = 1; seed < 20; seed++) {
      const shuffled = shuffleOptions(q, seededRng(seed));
      expect(shuffled.options).toHaveLength(4);
      expect(shuffled.options[shuffled.correctIndex]).toBe('Rätt');
    }
  });
});

describe('addPlayer', () => {
  it('lägger till spelare i lobbyn', () => {
    const room = roomWithPlayers('Anna', 'Bo');
    expect(room.players.map((p) => p.name)).toEqual(['Anna', 'Bo']);
    expect(room.players[0].isHost).toBe(true);
    expect(room.players[1].isHost).toBe(false);
  });

  it('nekar namn som redan finns, oavsett versaler', () => {
    const room = roomWithPlayers('Anna');
    expect(addPlayer(room, 'x', 'ANNA')).toEqual({ ok: false, error: 'Namnet är redan taget i det här rummet.' });
  });

  it('nekar när rummet är fullt', () => {
    const room = roomWithPlayers(...Array.from({ length: MAX_PLAYERS }, (_, i) => `S${i}`));
    expect(addPlayer(room, 'extra', 'Extra').ok).toBe(false);
  });

  it('nekar när spelet har börjat', () => {
    const room = startedRoom();
    expect(addPlayer(room, 'sen', 'Sen').ok).toBe(false);
  });
});

describe('removePlayer', () => {
  it('ger värdskapet till nästa spelare när värden lämnar', () => {
    const room = roomWithPlayers('Anna', 'Bo');
    removePlayer(room, 'p0');
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ name: 'Bo', isHost: true });
  });

  it('behåller spelaren som frånkopplad under spelet, så att poängen finns kvar', () => {
    const room = startedRoom();
    removePlayer(room, 'p1');
    expect(room.players).toHaveLength(2);
    expect(room.players[1].connected).toBe(false);
  });

  it('säger till när sista spelaren har lämnat', () => {
    const room = roomWithPlayers('Anna', 'Bo');
    expect(removePlayer(room, 'p0')).toBe(false);
    expect(removePlayer(room, 'p1')).toBe(true);
  });
});

describe('updateSettings', () => {
  const categories = ['Geografi', 'Historia'];

  it('låter värden ändra giltiga inställningar', () => {
    const room = roomWithPlayers('Anna');
    const res = updateSettings(room, 'p0', { category: 'Historia', questionCount: 5 }, categories);
    expect(res.ok).toBe(true);
    expect(room.settings).toMatchObject({ category: 'Historia', questionCount: 5 });
  });

  it('godtar "Alla" som kategori', () => {
    const room = roomWithPlayers('Anna');
    expect(updateSettings(room, 'p0', { category: ALL_CATEGORIES }, categories).ok).toBe(true);
  });

  it('nekar andra spelare än värden', () => {
    const room = roomWithPlayers('Anna', 'Bo');
    expect(updateSettings(room, 'p1', { questionCount: 5 }, categories).ok).toBe(false);
  });

  it('nekar ogiltiga värden och ändrar då ingenting', () => {
    const room = roomWithPlayers('Anna');
    expect(updateSettings(room, 'p0', { questionCount: 5, secondsPerQuestion: 3 }, categories).ok).toBe(false);
    expect(updateSettings(room, 'p0', { category: 'Matematik' }, categories).ok).toBe(false);
    expect(room.settings.questionCount).toBe(10);
  });
});

describe('spelets gång', () => {
  it('startar på första frågan och nollställer poängen', () => {
    const room = startedRoom();
    expect(room.phase).toBe('question');
    expect(room.current).toBe(0);
    expect(room.players.every((p) => p.score === 0)).toBe(true);
  });

  it('kan inte starta utan frågor', () => {
    const room = roomWithPlayers('Anna');
    expect(startGame(room, [], T0)).toEqual({ ok: false, error: 'Hittade inga frågor i den kategorin.' });
  });

  it('godtar bara det första svaret', () => {
    const room = startedRoom();
    expect(submitAnswer(room, 'p0', 0, 1, T0 + 100)).toBe(true);
    expect(submitAnswer(room, 'p0', 0, 0, T0 + 200)).toBe(false);
    expect(room.players[0].answers.get(0)?.option).toBe(1);
  });

  it('nekar svar på fel fråga, ogiltiga alternativ och för sena svar', () => {
    const room = startedRoom();
    expect(submitAnswer(room, 'p0', 1, 0, T0)).toBe(false);
    expect(submitAnswer(room, 'p0', 0, 4, T0)).toBe(false);
    expect(submitAnswer(room, 'p0', 0, 1.5, T0)).toBe(false);
    expect(submitAnswer(room, 'p0', 0, 0, T0 + 15_000 + 501)).toBe(false);
  });

  it('vet när alla anslutna har svarat', () => {
    const room = startedRoom(3);
    submitAnswer(room, 'p0', 0, 0, T0);
    submitAnswer(room, 'p1', 0, 0, T0);
    expect(allAnswered(room)).toBe(false);
    removePlayer(room, 'p2');
    expect(allAnswered(room)).toBe(true);
  });

  it('räknar poäng vid reveal: snabbt rätt svar ger mest', () => {
    const room = startedRoom(3);
    submitAnswer(room, 'p0', 0, 0, T0); // direkt, rätt
    submitAnswer(room, 'p1', 0, 0, T0 + 7_500); // halva tiden, rätt
    submitAnswer(room, 'p2', 0, 2, T0 + 100); // fel

    reveal(room, T0 + 8_000);

    expect(room.phase).toBe('reveal');
    expect(room.players.map((p) => p.score)).toEqual([1000, 750, 0]);
    expect(room.lastResults).toEqual({
      p0: { answer: 0, points: 1000 },
      p1: { answer: 0, points: 750 },
      p2: { answer: 2, points: 0 },
    });
  });

  it('ger streak-bonus för flera rätt i rad och nollställer vid fel', () => {
    const room = startedRoom(1, 3);
    for (let q = 0; q < 2; q++) {
      submitAnswer(room, 'p0', q, 0, T0 + 15_000);
      reveal(room, T0);
      advance(room, T0);
    }
    expect(room.players[0].streak).toBe(2);
    expect(room.players[0].score).toBe(500 + 600);

    submitAnswer(room, 'p0', 2, 1, T0);
    reveal(room, T0);
    expect(room.players[0].streak).toBe(0);
  });

  it('avslutar spelet efter sista frågan', () => {
    const room = startedRoom(1, 2);
    reveal(room, T0);
    advance(room, T0 + 1);
    expect(room).toMatchObject({ phase: 'question', current: 1, questionStartedAt: T0 + 1 });
    reveal(room, T0 + 2);
    advance(room, T0 + 3);
    expect(room.phase).toBe('finished');
  });

  it('går tillbaka till lobbyn med nollställda poäng, men bara på värdens begäran', () => {
    const room = startedRoom(2, 1);
    submitAnswer(room, 'p0', 0, 0, T0);
    reveal(room, T0);
    advance(room, T0);

    expect(backToLobby(room, 'p1').ok).toBe(false);
    expect(backToLobby(room, 'p0').ok).toBe(true);
    expect(room.phase).toBe('lobby');
    expect(room.players[0].score).toBe(0);
  });
});

describe('toPublicState', () => {
  it('avslöjar inte rätt svar medan frågan pågår', () => {
    const room = startedRoom();
    const state = toPublicState(room, T0 + 5_000);

    expect(state.question).toMatchObject({ index: 0, total: 3, remainingMs: 10_000 });
    expect(state.reveal).toBeNull();
    expect(JSON.stringify(state)).not.toContain('correctIndex');
  });

  it('visar vem som har svarat, men inte vad', () => {
    const room = startedRoom();
    submitAnswer(room, 'p1', 0, 2, T0);
    const state = toPublicState(room, T0);

    expect(state.players.map((p) => p.hasAnswered)).toEqual([false, true]);
    expect(JSON.stringify(state)).not.toContain('"answer"');
  });

  it('visar rätt svar och allas svar efter att frågan är slut', () => {
    const room = startedRoom();
    submitAnswer(room, 'p1', 0, 2, T0);
    reveal(room, T0 + 1_000);
    const state = toPublicState(room, T0 + 2_000);

    expect(state.reveal).toMatchObject({ correctIndex: 0, nextInMs: 4_000 });
    expect(state.reveal?.results.p1).toEqual({ answer: 2, points: 0 });
  });

  it('visar ingen fråga i lobbyn eller när spelet är slut', () => {
    expect(toPublicState(roomWithPlayers('Anna'), T0).question).toBeNull();
  });
});
