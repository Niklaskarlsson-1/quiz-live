// Håller reda på alla rum och styr spelets tidtagning med timers.
// Reglerna finns i game.ts; den här filen bestämmer *när* de körs.
import type { Ack, GameSettings, JoinResult } from '@quiz/shared';
import {
  addPlayer,
  advance,
  allAnswered,
  backToLobby,
  canStart,
  createRoom,
  generateCode,
  normalizeName,
  removePlayer,
  reveal,
  REVEAL_MS,
  shuffleOptions,
  startGame,
  submitAnswer,
  updateSettings,
  type Question,
  type Room,
} from './game.ts';

export interface RoomDeps {
  loadQuestions: (settings: GameSettings) => Promise<Question[]>;
  saveResults: (room: Room) => Promise<void>;
  categories: () => Promise<string[]>;
  /** Anropas varje gång ett rum ändras, så att klienterna kan uppdateras. */
  onChange: (room: Room) => void;
  now?: () => number;
  rng?: () => number;
  revealMs?: number;
}

const okAck = <T>(data: T): Ack<T> => ({ ok: true, data });
const errAck = <T>(error: string): Ack<T> => ({ ok: false, error });

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoom = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private now: () => number;
  private rng: () => number;
  private revealMs: number;

  constructor(private deps: RoomDeps) {
    this.now = deps.now ?? Date.now;
    this.rng = deps.rng ?? Math.random;
    this.revealMs = deps.revealMs ?? REVEAL_MS;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  roomOf(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  create(playerId: string, rawName: unknown): Ack<JoinResult> {
    const name = normalizeName(rawName);
    if (!name) return errAck('Skriv ett namn på 1–16 tecken.');
    this.leave(playerId);

    const code = generateCode(new Set(this.rooms.keys()), this.rng);
    const room = createRoom(code, playerId, name);
    this.rooms.set(code, room);
    this.playerRoom.set(playerId, code);
    this.deps.onChange(room);
    return okAck({ code, playerId });
  }

  join(playerId: string, rawCode: unknown, rawName: unknown): Ack<JoinResult> {
    const name = normalizeName(rawName);
    if (!name) return errAck('Skriv ett namn på 1–16 tecken.');
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const room = this.rooms.get(code);
    if (!room) return errAck('Hittade inget rum med den koden.');
    if (this.playerRoom.get(playerId) === code) return okAck({ code, playerId });

    this.leave(playerId);
    const result = addPlayer(room, playerId, name);
    if (!result.ok) return errAck(result.error);
    this.playerRoom.set(playerId, code);
    this.deps.onChange(room);
    return okAck({ code, playerId });
  }

  leave(playerId: string): void {
    const room = this.roomOf(playerId);
    this.playerRoom.delete(playerId);
    if (!room) return;

    const empty = removePlayer(room, playerId);
    if (empty) {
      this.clearTimer(room.code);
      this.rooms.delete(room.code);
      return;
    }
    // Om den som lämnade var den sista som inte hade svarat kan frågan avslutas direkt.
    if (room.phase === 'question' && allAnswered(room)) {
      this.endQuestion(room);
      return;
    }
    this.deps.onChange(room);
  }

  async updateSettings(playerId: string, changes: unknown): Promise<Ack<null>> {
    const room = this.roomOf(playerId);
    if (!room) return errAck('Du är inte med i något rum.');
    if (typeof changes !== 'object' || changes === null) return errAck('Ogiltiga inställningar.');

    const result = updateSettings(room, playerId, changes as Partial<GameSettings>, await this.deps.categories());
    if (!result.ok) return errAck(result.error);
    this.deps.onChange(room);
    return okAck(null);
  }

  async start(playerId: string): Promise<Ack<null>> {
    const room = this.roomOf(playerId);
    if (!room) return errAck('Du är inte med i något rum.');
    const allowed = canStart(room, playerId);
    if (!allowed.ok) return errAck(allowed.error);

    const questions = (await this.deps.loadQuestions(room.settings)).map((q) => shuffleOptions(q, this.rng));
    // Rummet kan ha ändrats medan frågorna hämtades.
    if (this.rooms.get(room.code) !== room || room.phase !== 'lobby') return errAck('Rummet finns inte längre.');

    const result = startGame(room, questions, this.now());
    if (!result.ok) return errAck(result.error);
    this.scheduleQuestionEnd(room);
    this.deps.onChange(room);
    return okAck(null);
  }

  answer(playerId: string, questionIndex: unknown, option: unknown): void {
    const room = this.roomOf(playerId);
    if (!room || typeof questionIndex !== 'number' || typeof option !== 'number') return;
    if (!submitAnswer(room, playerId, questionIndex, option, this.now())) return;

    if (allAnswered(room)) this.endQuestion(room);
    else this.deps.onChange(room);
  }

  playAgain(playerId: string): Ack<null> {
    const room = this.roomOf(playerId);
    if (!room) return errAck('Du är inte med i något rum.');
    const result = backToLobby(room, playerId);
    if (!result.ok) return errAck(result.error);
    this.deps.onChange(room);
    return okAck(null);
  }

  /** Stoppar alla timers, t.ex. när servern stängs eller i tester. */
  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  // ---------- Tidtagning ----------

  private scheduleQuestionEnd(room: Room): void {
    const index = room.current;
    this.setTimer(room.code, room.settings.secondsPerQuestion * 1000, () => {
      if (room.phase === 'question' && room.current === index) this.endQuestion(room);
    });
  }

  private endQuestion(room: Room): void {
    reveal(room, this.now());
    this.deps.onChange(room);
    this.setTimer(room.code, this.revealMs, () => this.nextQuestion(room));
  }

  private nextQuestion(room: Room): void {
    advance(room, this.now());
    if (room.phase === 'finished') {
      this.clearTimer(room.code);
      this.deps.saveResults(room).catch((err) => console.error('Kunde inte spara resultat:', err));
    } else {
      this.scheduleQuestionEnd(room);
    }
    this.deps.onChange(room);
  }

  private setTimer(code: string, ms: number, fn: () => void): void {
    this.clearTimer(code);
    this.timers.set(code, setTimeout(fn, ms));
  }

  private clearTimer(code: string): void {
    const timer = this.timers.get(code);
    if (timer) clearTimeout(timer);
    this.timers.delete(code);
  }
}
