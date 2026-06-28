import { PrismaClient, CefrLevel, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedWord = { word: string; translation: string; example?: string };
type SeedDeck = {
  id: string; // fixed uuid so re-seeding is idempotent (upsert by id)
  title: string;
  description: string;
  level: CefrLevel;
  words: SeedWord[];
};

// Curated, system-owned decks (createdById = null, isSystem = true). Each has a
// stable id so the seed can run repeatedly without creating duplicates.
const DECKS: SeedDeck[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'A1 Everyday Basics',
    description: 'The first hundred words every beginner needs.',
    level: CefrLevel.A1,
    words: [
      { word: 'apple', translation: 'olma', example: 'I eat an apple every day.' },
      { word: 'water', translation: 'suv', example: 'Can I have some water?' },
      { word: 'house', translation: 'uy', example: 'We bought a new house.' },
      { word: 'friend', translation: "do'st", example: 'She is my best friend.' },
      { word: 'book', translation: 'kitob', example: 'He is reading a book.' },
      { word: 'food', translation: 'ovqat', example: 'The food is delicious.' },
      { word: 'school', translation: 'maktab', example: 'The children go to school.' },
      { word: 'family', translation: 'oila', example: 'I love my family.' },
      { word: 'morning', translation: 'tong', example: 'Good morning!' },
      { word: 'happy', translation: 'baxtli', example: 'I am very happy today.' },
    ],
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Travel Essentials',
    description: 'Words you need for getting around abroad.',
    level: CefrLevel.A2,
    words: [
      { word: 'airport', translation: 'aeroport', example: 'We arrived at the airport early.' },
      { word: 'ticket', translation: 'chipta', example: 'I lost my train ticket.' },
      { word: 'luggage', translation: 'yuk', example: 'My luggage is very heavy.' },
      { word: 'hotel', translation: 'mehmonxona', example: 'The hotel is near the beach.' },
      { word: 'map', translation: 'xarita', example: 'Can you show me on the map?' },
      { word: 'passport', translation: 'pasport', example: 'Please show your passport.' },
      { word: 'station', translation: 'bekat', example: 'The bus station is closed.' },
      { word: 'journey', translation: 'sayohat', example: 'It was a long journey.' },
      { word: 'border', translation: 'chegara', example: 'We crossed the border at night.' },
      { word: 'currency', translation: 'valyuta', example: 'What is the local currency?' },
    ],
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Business English',
    description: 'Vocabulary for meetings, email and the office.',
    level: CefrLevel.B1,
    words: [
      { word: 'meeting', translation: 'uchrashuv', example: 'The meeting starts at nine.' },
      { word: 'deadline', translation: 'muddat', example: 'We missed the deadline.' },
      { word: 'invoice', translation: 'hisob-faktura', example: 'Please send the invoice.' },
      { word: 'budget', translation: 'byudjet', example: 'The project is over budget.' },
      { word: 'client', translation: 'mijoz', example: 'The client approved the design.' },
      { word: 'revenue', translation: 'daromad', example: 'Revenue grew last quarter.' },
      { word: 'schedule', translation: 'jadval', example: 'Let me check my schedule.' },
      { word: 'negotiate', translation: 'muzokara qilmoq', example: 'We need to negotiate the price.' },
      { word: 'colleague', translation: 'hamkasb', example: 'My colleague is on holiday.' },
      { word: 'agenda', translation: 'kun tartibi', example: 'What is on the agenda?' },
    ],
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'IELTS Core',
    description: 'High-frequency academic words for the IELTS exam.',
    level: CefrLevel.C1,
    words: [
      { word: 'significant', translation: 'sezilarli', example: 'There was a significant increase.' },
      { word: 'consequence', translation: 'oqibat', example: 'Every action has a consequence.' },
      { word: 'establish', translation: 'tashkil etmoq', example: 'They established a new company.' },
      { word: 'sufficient', translation: 'yetarli', example: 'We have sufficient evidence.' },
      { word: 'distribution', translation: 'taqsimot', example: 'The distribution was uneven.' },
      { word: 'fundamental', translation: 'asosiy', example: 'This is a fundamental principle.' },
      { word: 'phenomenon', translation: 'hodisa', example: 'It is a natural phenomenon.' },
      { word: 'subsequent', translation: 'keyingi', example: 'Subsequent research confirmed it.' },
      { word: 'comprehensive', translation: 'keng qamrovli', example: 'A comprehensive review is needed.' },
      { word: 'inevitable', translation: 'muqarrar', example: 'Change is inevitable.' },
    ],
  },
];

async function main() {
  for (const deckDef of DECKS) {
    const deck = await prisma.deck.upsert({
      where: { id: deckDef.id },
      update: {
        title: deckDef.title,
        description: deckDef.description,
        level: deckDef.level,
        isSystem: true,
        isPublic: true,
      },
      create: {
        id: deckDef.id,
        title: deckDef.title,
        description: deckDef.description,
        level: deckDef.level,
        isSystem: true,
        isPublic: true,
      },
    });

    // Only seed words when the deck is empty, so re-running the seed doesn't
    // duplicate words (and never touches learners' progress on existing ones).
    const existing = await prisma.word.count({ where: { deckId: deck.id } });
    if (existing === 0) {
      await prisma.word.createMany({
        data: deckDef.words.map(
          (w): Prisma.WordCreateManyInput => ({ ...w, deckId: deck.id }),
        ),
      });
    }
  }

  // Demo account for manual testing, enrolled in the first deck so the learn
  // and test flows have content out of the box.
  const hashedPassword = await bcrypt.hash('password123', 10);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@englishflow.com' },
    update: {},
    create: { email: 'demo@englishflow.com', password: hashedPassword },
  });

  const firstDeckWords = await prisma.word.findMany({
    where: { deckId: DECKS[0].id },
    select: { id: true },
  });
  await prisma.userWord.createMany({
    data: firstDeckWords.map((w) => ({ userId: demo.id, wordId: w.id })),
    skipDuplicates: true,
  });
  await prisma.deckEnrollment.upsert({
    where: { userId_deckId: { userId: demo.id, deckId: DECKS[0].id } },
    create: { userId: demo.id, deckId: DECKS[0].id },
    update: {},
  });

  console.log(
    `Seed completed: ${DECKS.length} system decks, demo user enrolled in "${DECKS[0].title}"`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
