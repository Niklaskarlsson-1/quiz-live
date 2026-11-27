import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { DEFAULT_SETTINGS, type PublicPlayer, type RoomState } from '@quiz/shared';
import { ROUTER_FUTURE } from '../App.tsx';
import { GameContextProvider, type GameApi } from '../lib/GameContext.tsx';

export function player(overrides: Partial<PublicPlayer> & { id: string; name: string }): PublicPlayer {
  return {
    score: 0,
    isHost: false,
    connected: true,
    hasAnswered: false,
    streak: 0,
    correctCount: 0,
    ...overrides,
  };
}

export function roomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    code: 'ABCD',
    phase: 'lobby',
    settings: { ...DEFAULT_SETTINGS },
    players: [player({ id: 'me', name: 'Anna', isHost: true }), player({ id: 'p2', name: 'Bo' })],
    question: null,
    reveal: null,
    ...overrides,
  };
}

const okNull = { ok: true as const, data: null };

/** Ett påhittat GameApi där alla funktioner är spioner som testerna kan kontrollera. */
export function fakeGame(overrides: Partial<GameApi> = {}): GameApi {
  return {
    connected: true,
    myId: 'me',
    room: roomState(),
    myAnswer: null,
    notice: null,
    createRoom: vi.fn(async () => ({ ok: true as const, data: { code: 'ABCD', playerId: 'me' } })),
    joinRoom: vi.fn(async () => ({ ok: true as const, data: { code: 'ABCD', playerId: 'me' } })),
    leaveRoom: vi.fn(),
    updateSettings: vi.fn(async () => okNull),
    startGame: vi.fn(async () => okNull),
    answer: vi.fn(),
    playAgain: vi.fn(async () => okNull),
    clearNotice: vi.fn(),
    ...overrides,
  };
}

export function renderWithGame(ui: ReactNode, game: GameApi) {
  return render(
    <GameContextProvider value={game}>
      <MemoryRouter future={ROUTER_FUTURE}>{ui}</MemoryRouter>
    </GameContextProvider>
  );
}
