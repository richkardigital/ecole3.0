import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllUsersCourses() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      school: { select: { name: true } }
    }
  });

  console.log(`=== CHECKING COURSES RETURNED FOR ALL ${users.length} USERS ===`);

  for (const user of users) {
    const userId = user.id;
    const role = user.role;
    let schoolId = user.schoolId;

    if (["DIRECTEUR", "EDUCATEUR"].includes(role) && !schoolId) {
      const managedSchool = await prisma.school.findFirst({ where: { managerId: userId } });
      if (managedSchool) schoolId = managedSchool.id;
    }

    let courses: any[] = [];
    if (role === 'SUPER_ADMIN') {
      courses = await prisma.course.findMany({});
    } else if (["DIRECTEUR", "EDUCATEUR"].includes(role)) {
      courses = await prisma.course.findMany({
        where: schoolId ? { class: { schoolId } } : {}
      });
    } else if (role === 'ENSEIGNANT') {
      courses = await prisma.course.findMany({
        where: {
          OR: [
            { teacherId: userId },
            ...(schoolId ? [{ class: { schoolId } }] : [])
          ]
        }
      });
    } else if (role === 'APPRENANT') {
      courses = await prisma.course.findMany({
        where: {
          OR: [
            { class: { enrollments: { some: { studentId: userId } } } },
            ...(schoolId ? [{ class: { schoolId } }] : [])
          ]
        }
      });
    }

    console.log(`User: ${user.email} (${user.role}) [School: ${user.school?.name || 'NONE'}] -> Courses found: ${courses.length}`);
  }
}

checkAllUsersCourses().catch(console.error).finally(() => prisma.$disconnect());
