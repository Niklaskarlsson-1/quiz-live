import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PublicQuestion } from '@quiz/shared';
import { fakeGame, player, renderWithGame, roomState } from '../test/fakeGame.tsx';
import { QuestionView } from './QuestionView.tsx';

const question: PublicQuestion = {
  index: 2,
  total: 10,
  category: 'Geografi',
  text: 'Vad heter Islands huvudstad?',
  options: ['Akureyri', 'Reykjavik', 'Nuuk', 'Tórshavn'],
  durationMs: 15_000,
  remainingMs: 12_000,
};

describe('QuestionView under frågan', () => {
  it('visar frågan, alternativen och tiden kvar', () => {
    renderWithGame(<QuestionView />, fakeGame({ room: roomState({ phase: 'question', question }) }));

    expect(screen.getByRole('heading', { name: 'Vad heter Islands huvudstad?' })).toBeInTheDocument();
    expect(screen.getByText('Fråga 3 / 10')).toBeInTheDocument();
    expect(screen.getByLabelText('Sekunder kvar')).toHaveTextContent('12');
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('skickar svaret när man klickar på ett alternativ', async () => {
    const game = fakeGame({ room: roomState({ phase: 'question', question }) });
    renderWithGame(<QuestionView />, game);

    await userEvent.click(screen.getByRole('button', { name: /Reykjavik/ }));

    expect(game.answer).toHaveBeenCalledWith(1);
  });

  it('låser knapparna efter att man har svarat och visar hur många som svarat', () => {
    const players = [
      player({ id: 'me', name: 'Anna', hasAnswered: true }),
      player({ id: 'p2', name: 'Bo' }),
      player({ id: 'p3', name: 'Cia', connected: false }),
    ];
    renderWithGame(
      <QuestionView />,
      fakeGame({ myAnswer: 1, room: roomState({ phase: 'question', question, players }) })
    );

    expect(screen.getByRole('button', { name: /Reykjavik/ })).toHaveAttribute('aria-pressed', 'true');
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
    // Spelare som har lämnat räknas inte.
    expect(screen.getByRole('status')).toHaveTextContent('Svar inskickat! 1 av 2 har svarat');
  });
});

describe('QuestionView efter frågan', () => {
  const revealRoom = (myAnswer: number | null, points: number) =>
    roomState({
      phase: 'reveal',
      question: { ...question, remainingMs: 0 },
      players: [
        player({ id: 'me', name: 'Anna', score: points }),
        player({ id: 'p2', name: 'Bo', score: 2400, streak: 3 }),
      ],
      reveal: {
        correctIndex: 1,
        nextInMs: 4000,
        results: { me: { answer: myAnswer, points }, p2: { answer: 1, points: 900 } },
      },
    });

  it('markerar rätt svar och visar poängen man fick', () => {
    renderWithGame(<QuestionView />, fakeGame({ room: revealRoom(1, 850) }));

    expect(screen.getByLabelText('Rätt svar')).toBeInTheDocument();
    expect(screen.getByText('Rätt! +850 poäng')).toBeInTheDocument();
  });

  it('markerar ett felaktigt val', () => {
    renderWithGame(<QuestionView />, fakeGame({ room: revealRoom(3, 0) }));

    expect(screen.getByText('Fel svar')).toBeInTheDocument();
    expect(screen.getByLabelText('Ditt svar, fel')).toBeInTheDocument();
  });

  it('säger till om man inte hann svara', () => {
    renderWithGame(<QuestionView />, fakeGame({ room: revealRoom(null, 0) }));

    expect(screen.getByText('Du hann inte svara')).toBeInTheDocument();
  });

  it('visar ställningen sorterad, med poäng för frågan och svit', () => {
    renderWithGame(<QuestionView />, fakeGame({ room: revealRoom(1, 850) }));

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Bo');
    expect(rows[0]).toHaveTextContent('+900');
    expect(rows[0]).toHaveTextContent('🔥 3');
    expect(rows[1]).toHaveTextContent('Anna');
  });
});
