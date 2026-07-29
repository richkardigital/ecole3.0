import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserAndSeedCourses() {
  // Find all schools
  const schools = await prisma.school.findMany();
  console.log("SCHOOLS IN DB:", schools.map(s => ({ id: s.id, name: s.name })));

  // For any school that has 0 courses, create default classes, subjects, and sample courses!
  for (const school of schools) {
    const coursesCount = await prisma.course.count({
      where: { class: { schoolId: school.id } }
    });

    console.log(`School "${school.name}" currently has ${coursesCount} courses.`);

    if (coursesCount === 0) {
      console.log(`Creating default academic year, class, subject, and courses for "${school.name}"...`);

      // 1. Academic Year
      const year = await prisma.academicYear.upsert({
        where: { name_schoolId: { name: '2025-2026', schoolId: school.id } },
        update: { isCurrent: true },
        create: {
          name: '2025-2026',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-06-30'),
          isCurrent: true,
          schoolId: school.id
        }
      });

      // 2. Niveau
      const niveau = await prisma.niveau.upsert({
        where: { nom_schoolId: { nom: '6ème', schoolId: school.id } },
        update: { rang: 20 },
        create: { nom: '6ème', rang: 20, schoolId: school.id }
      });

      // 3. Class
      const cls = await prisma.class.upsert({
        where: { name_schoolId: { name: '6ème A', schoolId: school.id } },
        update: {},
        create: {
          name: '6ème A',
          schoolId: school.id,
          niveauId: niveau.id,
          academicYearId: year.id
        }
      });

      // 4. Subjects
      const math = await prisma.subject.upsert({
        where: { name_schoolId: { name: 'Mathématiques', schoolId: school.id } },
        update: { coefficient: 4, code: 'MATH' },
        create: { name: 'Mathématiques', code: 'MATH', coefficient: 4, schoolId: school.id }
      });

      const fra = await prisma.subject.upsert({
        where: { name_schoolId: { name: 'Français', schoolId: school.id } },
        update: { coefficient: 4, code: 'FRA' },
        create: { name: 'Français', code: 'FRA', coefficient: 4, schoolId: school.id }
      });

      // 5. Find a teacher or manager to assign as teacher
      let teacher = await prisma.user.findFirst({
        where: { schoolId: school.id, role: 'ENSEIGNANT' }
      });

      if (!teacher) {
        // Use school manager or create a default teacher
        teacher = await prisma.user.findFirst({
          where: { schoolId: school.id }
        });
      }

      if (teacher) {
        // Create Math course
        const course1 = await prisma.course.create({
          data: {
            classId: cls.id,
            subjectId: math.id,
            teacherId: teacher.id,
            coefficient: 4,
          }
        });

        await prisma.chapter.create({
          data: {
            title: 'Chapitre 1 : Introduction et Fondamentaux',
            content: 'Bienvenue dans ce cours. Ce premier chapitre couvre les notions essentielles du programme.',
            courseId: course1.id,
          }
        });

        await prisma.assignment.create({
          data: {
            title: 'Devoir 1 : Exercices d\'application',
            description: 'Résoudre les exercices d\'application du chapitre 1.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            courseId: course1.id,
            coefficient: 2,
            points: 20
          }
        });

        // Create French course
        const course2 = await prisma.course.create({
          data: {
            classId: cls.id,
            subjectId: fra.id,
            teacherId: teacher.id,
            coefficient: 4,
          }
        });

        await prisma.chapter.create({
          data: {
            title: 'Chapitre 1 : Grammaire et Expression Écrite',
            content: 'Étude des structures de phrases et règles de grammaire.',
            courseId: course2.id,
          }
        });

        console.log(`✅ Default courses created for school "${school.name}"`);
      }
    }
  }

  // Also update rickardigital01@gmail.com to point to Complexe Scolaire Excellence d'Abidjan if needed
  const excellenceSchool = await prisma.school.findFirst({
    where: { code: 'CS-EXCELLENCE-2026' }
  });

  if (excellenceSchool) {
    await prisma.user.updateMany({
      where: { email: 'rickardigital01@gmail.com' },
      data: { schoolId: excellenceSchool.id }
    });
    console.log("✅ Updated rickardigital01@gmail.com to school Complexe Scolaire Excellence d'Abidjan");
  }
}

fixUserAndSeedCourses().catch(console.error).finally(() => prisma.$disconnect());
