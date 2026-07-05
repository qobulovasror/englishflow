/**
 * Promotes (or demotes) a user by email. Needed to bootstrap the first admin,
 * since there is no self-service path to the ADMIN role.
 *
 *   npm run admin:promote -- someone@example.com          # → ADMIN
 *   npm run admin:promote -- someone@example.com USER      # → USER
 *
 * Reads DATABASE_URL from the environment (same as the app).
 */
import { PrismaClient, Role } from '@prisma/client';

async function main(): Promise<void> {
  const email = process.argv[2];
  const roleArg = (process.argv[3] ?? 'ADMIN').toUpperCase();

  if (!email) {
    console.error('Usage: npm run admin:promote -- <email> [ADMIN|USER]');
    process.exitCode = 1;
    return;
  }
  if (roleArg !== Role.ADMIN && roleArg !== Role.USER) {
    console.error(`Invalid role "${roleArg}". Use ADMIN or USER.`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      console.error(`No user found with email "${email}".`);
      process.exitCode = 1;
      return;
    }

    const user = await prisma.user.update({
      where: { email },
      data: { role: roleArg as Role },
    });
    console.log(`✓ ${user.email} is now ${user.role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
