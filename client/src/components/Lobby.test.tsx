import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeGame, renderWithGame } from '../test/fakeGame.tsx';
import { Lobby } from './Lobby.tsx';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(['Geografi', 'Historia']))));
});

describe('Lobby', () => {
  it('visar rumskoden och spelarna', () => {
    renderWithGame(<Lobby />, fakeGame());

    expect(screen.getByText('ABCD')).toBeInTheDocument();
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Bo')).toBeInTheDocument();
    expect(screen.getByText('2 / 8')).toBeInTheDocument();
  });

  it('låter värden ändra inställningar och starta', async () => {
    const game = fakeGame();
    renderWithGame(<Lobby />, game);

    await userEvent.click(screen.getByRole('radio', { name: '5' }));
    expect(game.updateSettings).toHaveBeenCalledWith({ questionCount: 5 });

    await screen.findByRole('option', { name: 'Historia' });
    await userEvent.selectOptions(screen.getByLabelText('Kategori'), 'Historia');
    expect(game.updateSettings).toHaveBeenCalledWith({ category: 'Historia' });

    await userEvent.click(screen.getByRole('button', { name: 'Starta spelet' }));
    expect(game.startGame).toHaveBeenCalled();
  });

  it('visar fel från servern', async () => {
    const game = fakeGame({ startGame: vi.fn(async () => ({ ok: false as const, error: 'Hittade inga frågor i den kategorin.' })) });
    renderWithGame(<Lobby />, game);

    await userEvent.click(screen.getByRole('button', { name: 'Starta spelet' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Hittade inga frågor i den kategorin.');
  });

  it('låter inte gäster ändra något eller starta', () => {
    renderWithGame(<Lobby />, fakeGame({ myId: 'p2' }));

    expect(screen.queryByRole('button', { name: 'Starta spelet' })).not.toBeInTheDocument();
    expect(screen.getByText('Väntar på att Anna startar spelet…')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategori')).toBeDisabled();
    expect(screen.getByRole('radio', { name: '5' })).toBeDisabled();
  });
});
