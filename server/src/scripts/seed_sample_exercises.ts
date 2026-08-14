import prisma from '../utils/prisma.js';

async function main() {
  const teacher = await prisma.user.findFirst({
    where: { role: 'ENSEIGNANT' }
  });
  if (!teacher) {
    console.log('No teacher found');
    return;
  }

  const courses = await prisma.course.findMany({
    include: {
      subject: true,
      niveau: true,
      chapters: true
    }
  });

  console.log(`Checking ${courses.length} courses for chapters...`);

  for (const course of courses) {
    let chapter = course.chapters[0];
    if (!chapter) {
      chapter = await prisma.chapter.create({
        data: {
          title: `Chapitre 1 : Introduction & Fondamentaux — ${course.subject.name}`,
          content: `Concepts clés, propriétés et applications pratiques du cours de ${course.subject.name}.`,
          position: 1,
          courseId: course.id
        }
      });
      console.log(`Created Chapter for ${course.subject.name} (${course.niveau.nom})`);
    }

    // Check if exercise already exists for this chapter
    const existingExercise = await prisma.chapterExercise.findFirst({
      where: { chapterId: chapter.id }
    });

    if (!existingExercise) {
      await prisma.chapterExercise.create({
        data: {
          title: `Exercice d'entraînement N°1 — ${course.subject.name}`,
          description: `Auto-évaluation sur les compétences essentielles du Chapitre 1. Non noté.`,
          type: 'QCM',
          isGraded: false,
          coefficient: 1,
          timeLimit: 15,
          chapterId: chapter.id,
          createdById: teacher.id,
          questions: {
            create: [
              {
                text: `Quelle est la règle fondamentale applicable dans cette leçon de ${course.subject.name} ?`,
                type: 'QCM',
                position: 0,
                points: 2,
                options: {
                  create: [
                    { text: "Option A : Définition exacte et application systématique", isCorrect: true },
                    { text: "Option B : Exception non justifiée", isCorrect: false },
                    { text: "Option C : Cas indéterminé", isCorrect: false }
                  ]
                }
              },
              {
                text: `Vérification des acquis : cette méthode est-elle valide dans tous les cas ?`,
                type: 'VRAI_FAUX',
                position: 1,
                points: 2,
                options: {
                  create: [
                    { text: "Vrai", isCorrect: true },
                    { text: "Faux", isCorrect: false }
                  ]
                }
              }
            ]
          }
        }
      });
      console.log(`Created sample exercise for ${course.subject.name} (${course.niveau.nom})`);
    }
  }

  console.log('Sample exercises seeding completed successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
