import { useGame } from '../lib/GameContext.tsx';
import { formatScore, OPTION_LABELS, ranked, useCountdown } from '../lib/helpers.ts';
import { Avatar } from './PlayerChip.tsx';

/** Visar en fråga medan den pågår, och rätt svar plus ställning efteråt. */
export function QuestionView() {
  const { room, myId, myAnswer, answer } = useGame();
  const question = room?.question;
  const reveal = room?.reveal ?? null;
  const left = useCountdown(question?.remainingMs ?? 0, `${question?.index}-${room?.phase}`);
  const nextIn = useCountdown(reveal?.nextInMs ?? 0, `${question?.index}-${room?.phase}-next`);

  if (!room || !question) return null;

  const isReveal = room.phase === 'reveal' && reveal !== null;
  const connected = room.players.filter((p) => p.connected);
  const answeredCount = connected.filter((p) => p.hasAnswered).length;
  const myResult = myId && reveal ? reveal.results[myId] : undefined;
  const shownAnswer = isReveal ? (myResult?.answer ?? null) : myAnswer;
  const progress = Math.max(0, Math.min(1, left / question.durationMs));

  return (
    <section className="question-view">
      <div className="question-meta">
        <span className="pill">Fråga {question.index + 1} / {question.total}</span>
        <span className="pill muted">{question.category}</span>
        {!isReveal && <span className="timer-text" aria-label="Sekunder kvar">{Math.ceil(left / 1000)}</span>}
      </div>

      {!isReveal && (
        <div className="timer-track" aria-hidden>
          <div className={`timer-bar${progress < 0.25 ? ' low' : ''}`} style={{ transform: `scaleX(${progress})` }} />
        </div>
      )}

      <h1 className="question-text">{question.text}</h1>

      <div className="answers">
        {question.options.map((opt, i) => {
          const chosen = shownAnswer === i;
          const correct = isReveal && reveal.correctIndex === i;
          const wrongChoice = isReveal && chosen && !correct;
          const state = isReveal ? (correct ? 'correct' : wrongChoice ? 'wrong' : 'dim') : chosen ? 'chosen' : '';
          return (
            <button
              // Ny nyckel per fråga, så att knapparna inte "tonar tillbaka" från förra resultatet.
              key={`${question.index}-${i}`}
              className={`answer answer-${i} ${state}`}
              disabled={isReveal || myAnswer !== null}
              onClick={() => answer(i)}
              aria-pressed={chosen}
            >
              <span className="answer-label">{OPTION_LABELS[i]}</span>
              <span className="answer-text">{opt}</span>
              {correct && <span className="answer-mark" aria-label="Rätt svar">✓</span>}
              {wrongChoice && <span className="answer-mark" aria-label="Ditt svar, fel">✗</span>}
            </button>
          );
        })}
      </div>

      {!isReveal && (
        <p className="status-line" role="status">
          {myAnswer !== null ? 'Svar inskickat! ' : ''}
          {answeredCount} av {connected.length} har svarat
        </p>
      )}

      {isReveal && (
        <div className="reveal">
          <p className={`result-banner ${myResult && myResult.points > 0 ? 'good' : 'bad'}`} role="status">
            {myResult?.answer === null || myResult === undefined
              ? 'Du hann inte svara'
              : myResult.points > 0
                ? `Rätt! +${formatScore(myResult.points)} poäng`
                : 'Fel svar'}
          </p>

          <ol className="scoreboard">
            {ranked(room.players).map((p) => {
              const gained = reveal.results[p.id]?.points ?? 0;
              return (
                <li key={p.id} className={p.id === myId ? 'me' : ''}>
                  <span className="place">{p.place}</span>
                  <Avatar name={p.name} size={28} />
                  <span className="sb-name">
                    {p.name}
                    {p.streak >= 2 && <span className="streak" title={`${p.streak} rätt i rad`}>🔥 {p.streak}</span>}
                  </span>
                  {gained > 0 && <span className="gained">+{formatScore(gained)}</span>}
                  <span className="sb-score">{formatScore(p.score)}</span>
                </li>
              );
            })}
          </ol>

          <p className="muted center">
            {question.index + 1 < question.total ? `Nästa fråga om ${Math.ceil(nextIn / 1000)} s…` : 'Resultatet kommer strax…'}
          </p>
        </div>
      )}
    </section>
  );
}
