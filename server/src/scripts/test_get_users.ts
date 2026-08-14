import prisma from '../utils/prisma.js';

async function main() {
  // Test 1: SUPER_ADMIN query (whereClause = {})
  const superAdminUsers = await prisma.user.findMany({
    where: {},
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      phone: true,
      matricule: true,
      avatarUrl: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
          schoolType: { select: { name: true } },
          teachingType: { select: { name: true } }
        }
      },
      enrollments: {
        include: {
          class: {
            include: { niveau: true }
          }
        }
      },
      teacherClasses: {
        include: {
          class: {
            include: { niveau: true }
          },
          subject: true
        }
      }
    }
  });

  console.log('Total Super Admin Query Results:', superAdminUsers.length);
  const byRole = superAdminUsers.reduce((acc: any, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log('By Role:', byRole);

  // Check enrollments for APPRENANT
  const apprenants = superAdminUsers.filter(u => u.role === 'APPRENANT');
  console.log('Apprenants count:', apprenants.length);
  console.log('Apprenants sample:', apprenants.slice(0, 3).map(a => ({
    name: `${a.firstName} ${a.lastName}`,
    email: a.email,
    school: a.school?.name,
    enrollments: a.enrollments
  })));

  // Test 2: DIRECTEUR query (whereClause: { schoolId: 'f1e805ef-5c1f-47cc-b157-6ad4c43bd2f0', role: { not: 'SUPER_ADMIN' } })
  const dirUsers = await prisma.user.findMany({
    where: {
      schoolId: 'f1e805ef-5c1f-47cc-b157-6ad4c43bd2f0',
      role: { not: 'SUPER_ADMIN' }
    }
  });
  console.log('Directeur Query Results:', dirUsers.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
