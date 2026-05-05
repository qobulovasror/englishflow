import { PrismaClient, WordStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@englishflow.com' },
    update: {},
    create: {
      email: 'demo@englishflow.com',
      password: hashedPassword,
    },
  });

  const words = [
    { word: 'apple', translation: 'яблоко', example: 'I eat an apple every day.' },
    { word: 'book', translation: 'книга', example: 'She is reading a book.' },
    { word: 'cat', translation: 'кот', example: 'The cat is sleeping on the sofa.' },
    { word: 'dog', translation: 'собака', example: 'My dog loves to play fetch.' },
    { word: 'elephant', translation: 'слон', example: 'An elephant never forgets.' },
    { word: 'flower', translation: 'цветок', example: 'She gave me a beautiful flower.' },
    { word: 'guitar', translation: 'гитара', example: 'He plays the guitar very well.' },
    { word: 'house', translation: 'дом', example: 'We bought a new house last year.' },
    { word: 'island', translation: 'остров', example: 'The island is surrounded by clear water.' },
    { word: 'jungle', translation: 'джунгли', example: 'The jungle is full of wild animals.' },
  ];

  for (const wordData of words) {
    const word = await prisma.word.create({
      data: {
        ...wordData,
        createdById: user.id,
      },
    });

    await prisma.userWord.create({
      data: {
        userId: user.id,
        wordId: word.id,
        status: WordStatus.NEW,
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
