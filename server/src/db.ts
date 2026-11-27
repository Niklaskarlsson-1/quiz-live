import { PrismaClient } from '@prisma/client';
import { ALL_CATEGORIES, type GameSettings, type LeaderboardEntry } from '@quiz/shared';
import { shuffle, type Question, type Room } from './game.ts';

export const prisma = new PrismaClient();

export async function getCategories(): Promise<string[]> {
  const rows = await prisma.question.findMany({ distinct: ['category'], select: { category: true } });
  return rows.map((r) => r.category).sort((a, b) => a.localeCompare(b, 'sv'));
}

/** Hämtar slumpmässiga frågor för valda inställningar. */
export async function loadQuestions(settings: GameSettings): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    where: settings.category === ALL_CATEGORIES ? undefined : { category: settings.category },
  });
  // Frågebanken är liten, så det räcker att blanda i minnet.
  return shuffle(rows)
    .slice(0, settings.questionCount)
    .map((r) => ({
      id: r.id,
      category: r.category,
      text: r.text,
      options: JSON.parse(r.options) as string[],
      correctIndex: r.correctIndex,
    }));
}

export async function saveResults(room: Room): Promise<void> {
  await prisma.gameResult.createMany({
    data: room.players.map((p) => ({
      playerName: p.name,
      score: p.score,
      correctCount: p.correctCount,
      questionCount: room.questions.length,
      category: room.settings.category,
    })),
  });
}

export async function getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const rows = await prisma.gameResult.findMany({
    orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
    take: limit,
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
