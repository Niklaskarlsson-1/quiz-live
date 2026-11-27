// Spelets regler som rena funktioner: inga timers, ingen nätverkskod.
// Tiden skickas in som `now`, så att testerna kan styra klockan.
import {
  ALL_CATEGORIES,
  DEFAULT_SETTINGS,
  MAX_PLAYERS,
  NAME_MAX_LENGTH,
  SETTINGS_LIMITS,
  type GameSettings,
  type Phase,
  type RoomState,
} from '@quiz/shared';

export interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  streak: number;
  correctCount: number;
  /** Svar per frågeindex: valt alternativ och när det kom in. */
  answers: Map<number, { option: number; at: number }>;
}

export interface Room {
  code: string;
  phase: Phase;
  players: Player[];
  settings: GameSettings;
  questions: Question[];
  current: number;
  questionStartedAt: number;
  revealStartedAt: number;
  lastResults: Record<string, { answer: number | null; points: number }> | null;
}

export type Result = { ok: true } | { ok: false; error: string };
const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

export const REVEAL_MS = 5000;
/** Svar som kommer lite efter tidsgränsen godtas, för att täcka nätverksfördröjning. */
export const ANSWER_GRACE_MS = 500;
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // utan I och O, som lätt förväxlas

// ---------- Hjälpfunktioner ----------

export function generateCode(taken: Set<string>, rng: () => number = Math.random): string {
  for (;;) {
    const code = Array.from({ length: 4 }, () => CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)]).join('');
    if (!taken.has(code)) return code;
  }
}

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > NAME_MAX_LENGTH) return null;
  return name;
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Blandar svarsalternativen och håller reda på var rätt svar hamnar. */
export function shuffleOptions(q: Question, rng: () => number = Math.random): Question {
  const order = shuffle(q.options.map((_, i) => i), rng);
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    correctIndex: order.indexOf(q.correctIndex),
  };
}

/**
 * Poäng för ett svar: 500–1000 för rätt svar beroende på hur snabbt det kom,
 * plus 100 per fråga i en svit av rätt svar (från andra i rad, max 300).
 */
export function calcPoints(correct: boolean, elapsedMs: number, durationMs: number, streak: number): number {
  if (!correct) return 0;
  const speed = Math.min(1, Math.max(0, 1 - elapsedMs / durationMs));
  const base = Math.round(500 + 500 * speed);
  const bonus = streak >= 2 ? Math.min(streak - 1, 3) * 100 : 0;
  return base + bonus;
}

function durationMs(room: Room): number {
  return room.settings.secondsPerQuestion * 1000;
}

function findPlayer(room: Room, id: string): Player | undefined {
  return room.players.find((p) => p.id === id);
}

function newPlayer(id: string, name: string, isHost: boolean): Player {
  return { id, name, score: 0, isHost, connected: true, streak: 0, correctCount: 0, answers: new Map() };
}

// ---------- Rum och spelare ----------

export function createRoom(code: string, hostId: string, hostName: string): Room {
  return {
    code,
    phase: 'lobby',
    players: [newPlayer(hostId, hostName, true)],
    settings: { ...DEFAULT_SETTINGS },
    questions: [],
    current: 0,
    questionStartedAt: 0,
    revealStartedAt: 0,
    lastResults: null,
  };
}

export function addPlayer(room: Room, id: string, name: string): Result {
  if (room.phase !== 'lobby') return fail('Spelet har redan börjat.');
  if (room.players.length >= MAX_PLAYERS) return fail(`Rummet är fullt (max ${MAX_PLAYERS} spelare).`);
  if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return fail('Namnet är redan taget i det här rummet.');
  }
  room.players.push(newPlayer(id, name, false));
  return ok;
}

/**
 * Tar bort en spelare. Under ett pågående spel markeras spelaren som frånkopplad
 * i stället, så att poängen finns kvar i resultatet.
 * Returnerar true om rummet inte längre har några anslutna spelare.
 */
export function removePlayer(room: Room, id: string): boolean {
  const player = findPlayer(room, id);
  if (!player) return room.players.every((p) => !p.connected);

  if (room.phase === 'lobby' || room.phase === 'finished') {
    room.players = room.players.filter((p) => p.id !== id);
  } else {
    player.connected = false;
  }

  // Lämnar värden går rollen vidare till nästa anslutna spelare.
  if (player.isHost) {
    player.isHost = false;
    const next = room.players.find((p) => p.connected);
    if (next) next.isHost = true;
  }
  return room.players.every((p) => !p.connected);
}

export function updateSettings(
  room: Room,
  playerId: string,
  changes: Partial<GameSettings>,
  categories: string[]
): Result {
  if (!findPlayer(room, playerId)?.isHost) return fail('Bara värden kan ändra inställningarna.');
  if (room.phase !== 'lobby') return fail('Inställningarna kan bara ändras i lobbyn.');

  const next = { ...room.settings };
  if (changes.category !== undefined) {
    if (changes.category !== ALL_CATEGORIES && !categories.includes(changes.category)) {
      return fail('Okänd kategori.');
    }
    next.category = changes.category;
  }
  if (changes.questionCount !== undefined) {
    if (!(SETTINGS_LIMITS.questionCount as readonly number[]).includes(changes.questionCount)) {
      return fail('Ogiltigt antal frågor.');
    }
    next.questionCount = changes.questionCount;
  }
  if (changes.secondsPerQuestion !== undefined) {
    if (!(SETTINGS_LIMITS.secondsPerQuestion as readonly number[]).includes(changes.secondsPerQuestion)) {
      return fail('Ogiltig tid per fråga.');
    }
    next.secondsPerQuestion = changes.secondsPerQuestion;
  }
  room.settings = next;
  return ok;
}

// ---------- Spelets gång ----------

export function canStart(room: Room, playerId: string): Result {
  if (!findPlayer(room, playerId)?.isHost) return fail('Bara värden kan starta spelet.');
  if (room.phase !== 'lobby') return fail('Spelet har redan börjat.');
  return ok;
}

export function startGame(room: Room, questions: Question[], now: number): Result {
  if (questions.length === 0) return fail('Hittade inga frågor i den kategorin.');
  room.questions = questions;
  room.current = 0;
  room.lastResults = null;
  room.players = room.players.filter((p) => p.connected);
  for (const p of room.players) {
    p.score = 0;
    p.streak = 0;
    p.correctCount = 0;
    p.answers = new Map();
  }
  room.phase = 'question';
  room.questionStartedAt = now;
  return ok;
}

export function submitAnswer(room: Room, playerId: string, questionIndex: number, option: number, now: number): boolean {
  const player = findPlayer(room, playerId);
  const question = room.questions[room.current];
  if (!player || !player.connected || !question) return false;
  if (room.phase !== 'question' || questionIndex !== room.current) return false;
  if (player.answers.has(room.current)) return false; // bara första svaret räknas
  if (!Number.isInteger(option) || option < 0 || option >= question.options.length) return false;
  if (now > room.questionStartedAt + durationMs(room) + ANSWER_GRACE_MS) return false;

  player.answers.set(room.current, { option, at: now });
  return true;
}

export function allAnswered(room: Room): boolean {
  const active = room.players.filter((p) => p.connected);
  return active.length > 0 && active.every((p) => p.answers.has(room.current));
}

/** Avslutar aktuell fråga: räknar poäng och visar rätt svar. */
export function reveal(room: Room, now: number): void {
  if (room.phase !== 'question') return;
  const question = room.questions[room.current];
  const results: NonNullable<Room['lastResults']> = {};

  for (const p of room.players) {
    const answer = p.answers.get(room.current);
    const correct = answer?.option === question.correctIndex;
    p.streak = correct ? p.streak + 1 : 0;
    const points = answer
      ? calcPoints(correct, answer.at - room.questionStartedAt, durationMs(room), p.streak)
      : 0;
    if (correct) p.correctCount++;
    p.score += points;
    results[p.id] = { answer: answer?.option ?? null, points };
  }

  room.lastResults = results;
  room.phase = 'reveal';
  room.revealStartedAt = now;
}

/** Går vidare till nästa fråga, eller avslutar spelet efter sista frågan. */
export function advance(room: Room, now: number): void {
  if (room.phase !== 'reveal') return;
  if (room.current + 1 < room.questions.length) {
    room.current++;
    room.phase = 'question';
    room.questionStartedAt = now;
  } else {
    room.phase = 'finished';
  }
}

export function backToLobby(room: Room, playerId: string): Result {
  if (!findPlayer(room, playerId)?.isHost) return fail('Bara värden kan starta ett nytt spel.');
  if (room.phase !== 'finished') return fail('Spelet är inte slut än.');
  room.phase = 'lobby';
  room.questions = [];
  room.lastResults = null;
  room.players = room.players.filter((p) => p.connected);
  for (const p of room.players) {
    p.score = 0;
    p.streak = 0;
    p.correctCount = 0;
    p.answers = new Map();
  }
  return ok;
}

// ---------- Det klienterna får se ----------

/** Tillståndet som skickas till klienterna. Rätt svar ingår bara efter att frågan är slut. */
export function toPublicState(room: Room, now: number): RoomState {
  const q = room.questions[room.current];
  const showQuestion = q && (room.phase === 'question' || room.phase === 'reveal');

  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
      hasAnswered: p.answers.has(room.current) && room.phase === 'question',
      streak: p.streak,
      correctCount: p.correctCount,
    })),
    question: showQuestion
      ? {
          index: room.current,
          total: room.questions.length,
          category: q.category,
          text: q.text,
          options: q.options,
          durationMs: durationMs(room),
          remainingMs:
            room.phase === 'question'
              ? Math.max(0, room.questionStartedAt + durationMs(room) - now)
              : 0,
        }
      : null,
    reveal:
      room.phase === 'reveal' && room.lastResults
        ? {
            correctIndex: q.correctIndex,
            results: room.lastResults,
            nextInMs: Math.max(0, room.revealStartedAt + REVEAL_MS - now),
          }
        : null,
  };
}
