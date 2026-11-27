import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@quiz/shared';
import { formatScore } from '../lib/helpers.ts';
import { Avatar } from '../components/PlayerChip.tsx';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; entries: LeaderboardEntry[] };

export function LeaderboardPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetch('/api/leaderboard?limit=20')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LeaderboardEntry[]>;
      })
      .then((entries) => active && setState({ status: 'success', entries }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="leaderboard">
      <h1>Topplista</h1>
      <p className="lead">De 20 högsta poängen genom tiderna.</p>

      {state.status === 'loading' && <p className="muted" role="status">Hämtar topplistan…</p>}
      {state.status === 'error' && <p className="error" role="alert">Kunde inte hämta topplistan.</p>}
      {state.status === 'success' && state.entries.length === 0 && (
        <p className="muted">Inga resultat än. Spela en omgång så hamnar du här!</p>
      )}
      {state.status === 'success' && state.entries.length > 0 && (
        <div className="card">
          <table className="lb-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Spelare</th>
                <th>Kategori</th>
                <th className="num">Rätt</th>
                <th className="num">Poäng</th>
                <th className="num">Datum</th>
              </tr>
            </thead>
            <tbody>
              {state.entries.map((e, i) => (
                <tr key={e.id}>
                  <td className="num place">{i + 1}</td>
                  <td>
                    <span className="lb-player">
                      <Avatar name={e.playerName} size={26} />
                      {e.playerName}
                    </span>
                  </td>
                  <td className="muted">{e.category}</td>
                  <td className="num">{e.correctCount}/{e.questionCount}</td>
                  <td className="num strong">{formatScore(e.score)}</td>
                  <td className="num muted">
                    {new Date(e.createdAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
