import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import * as http from 'http';

async function test() {
  const users = await prisma.user.findMany({ where: { role: 'APPRENANT' } });
  const student = users[0];
  if (!student) return;

  // We need an auth token for the student to call the API.
  // Actually, wait, let's just create a token.
  // Or even simpler, let's just check what `api.get('/courses/shared/courses')` is actually sending.
}
test();
