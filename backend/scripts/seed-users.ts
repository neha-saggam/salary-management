import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const users = [
  { email: 'admin@acme.com', password: 'Admin1234!', role: 'HR_ADMIN' as const },
  { email: 'hr@acme.com',    password: 'HrUser123!', role: 'HR_MANAGER' as const }
];
for (const u of users) {
  const passwordHash = await bcrypt.hash(u.password, 12);
  await prisma.user.upsert({
    where: { email: u.email },
    update: { passwordHash, role: u.role },
    create: { email: u.email, passwordHash, role: u.role }
  });
}
console.log('✓ Users seeded: admin@acme.com (HR_ADMIN), hr@acme.com (HR_MANAGER)');
await prisma.$disconnect();
