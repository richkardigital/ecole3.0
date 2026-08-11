import { getSharedCourses } from '../src/controllers/course.controller';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ where: { role: 'APPRENANT' } });
  const student = users[0];
  if (!student) return;

  const req: any = {
    user: { id: student.id, role: 'APPRENANT' },
    query: {
      schoolId: 'ALL',
      classId: 'ALL',
      niveauId: 'ALL',
      q: ''
    }
  };

  const res: any = {
    json: (data: any) => console.log(`Returned ${data.length} courses`),
    status: (code: number) => ({ json: (err: any) => console.error(code, err) })
  };

  await getSharedCourses(req, res);
}

run().catch(console.error).finally(() => prisma.$disconnect());
