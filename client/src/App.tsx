import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { GameProvider, useGame } from './lib/GameContext.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LeaderboardPage } from './pages/LeaderboardPage.tsx';
import { RoomPage } from './pages/RoomPage.tsx';

export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter future={ROUTER_FUTURE}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/room/:code" element={<RoomPage />} />
            <Route path="/topplista" element={<LeaderboardPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </GameProvider>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { connected } = useGame();
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="logo">
          Quiz<span>Live</span>
        </Link>
        <nav>
          <Link to="/topplista">Topplista</Link>
          <span className={`conn ${connected ? 'on' : 'off'}`} title={connected ? 'Ansluten' : 'Inte ansluten'}>
            {connected ? 'Ansluten' : 'Ansluter…'}
          </span>
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
