import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@mealory.com';
  const password = 'Admin123!';

  const passwordHash = await hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: passwordHash,
      name: 'Admin',
      authProvider: 'local',
      role: 'admin',
    },
    update: {
      password: passwordHash,
      name: 'Admin',
      authProvider: 'local',
      role: 'admin',
    },
  });
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
