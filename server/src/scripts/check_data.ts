import prisma from '../utils/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
      firstName: true,
      lastName: true,
      matricule: true,
      school: { select: { name: true } }
    }
  });
  console.log('=== TOTAL USERS IN DB ===', users.length);
  const byRole = users.reduce((acc: any, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  console.log('BY ROLE:', byRole);

  const school = await prisma.school.findFirst({
    include: {
      classes: {
        include: {
          niveau: true,
          enrollments: true,
          teacherClasses: {
            include: { teacher: true, subject: true }
          }
        }
      }
    }
  });
  console.log('=== SCHOOL ===', school?.name, 'ID:', school?.id);
  console.log('Classes:', school?.classes.map(c => ({
    name: c.name,
    niveau: c.niveau?.nom,
    studentsCount: c.enrollments.length,
    teachersCount: c.teacherClasses.length
  })));

  // Set all assignments to published: true and syncCalendar: true so they are active on calendar
  await prisma.assignment.updateMany({
    data: {
      published: true,
      syncCalendar: true,
      workflowStatus: 'PUBLIE'
    }
  });

  const assignments = await prisma.assignment.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      published: true,
      syncCalendar: true,
      startDate: true,
      dueDate: true,
      courseId: true,
      niveauId: true,
      subjectId: true,
      course: { select: { id: true, subject: { select: { name: true } }, niveau: { select: { nom: true } } } },
      niveau: { select: { nom: true } },
      subject: { select: { name: true } }
    }
  });
  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: { select: { firstName: true, lastName: true, role: true } },
      class: { include: { niveau: true } }
    }
  });
  console.log('=== ENROLLMENTS ===', enrollments.map(e => ({
    student: `${e.student.firstName} ${e.student.lastName}`,
    class: e.class.name,
    niveau: e.class.niveau?.nom,
    status: e.status
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
