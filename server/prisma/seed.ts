// Fyller databasen med frågorna i questions.ts.
// Kan köras flera gånger: befintliga frågor uppdateras i stället för att dubbleras.
import { PrismaClient } from '@prisma/client';
import { QUESTIONS } from './questions.ts';

const prisma = new PrismaClient();

async function main() {
  for (const q of QUESTIONS) {
    const data = {
      category: q.category,
      options: JSON.stringify([q.answer, ...q.wrong]),
      correctIndex: 0,
    };
    await prisma.question.upsert({
      where: { text: q.text },
      update: data,
      create: { text: q.text, ...data },
    });
  }
  const count = await prisma.question.count();
  console.log(`Databasen innehåller ${count} frågor.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
