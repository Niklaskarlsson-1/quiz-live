import { createApp } from './app.ts';
import { getCategories, getLeaderboard, loadQuestions, prisma, saveResults } from './db.ts';

const PORT = Number(process.env.PORT) || 3001;

const { httpServer, close } = createApp({
  loadQuestions,
  saveResults,
  categories: getCategories,
  getLeaderboard,
});

httpServer.listen(PORT, () => {
  console.log(`Quiz-servern lyssnar på http://localhost:${PORT}`);
});

// Stäng snyggt vid Ctrl+C så att databasanslutningen släpps.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await close();
    await prisma.$disconnect();
    process.exit(0);
  });
}
