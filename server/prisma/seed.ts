/**
 * Seed de la base de données.
 * Crée les données initiales : Super Admin, niveaux, écoles, utilisateurs de test.
 *
 * Usage : node --loader ts-node/esm prisma/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log('🚀 Seeding database...\n');

  // ============================================
  // 1. Super Admins
  // ============================================
  const superAdminPassword = await bcrypt.hash('password123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'superadmin@example.com',
      password: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Super Admin : ${superAdmin.email}`);

  const superAdmin2Password = await bcrypt.hash('nestorkoffi', 10);
  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'llateamd@gmail.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'llateamd@gmail.com',
      password: superAdmin2Password,
      firstName: 'Nestor',
      lastName: 'Koffi',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Super Admin : ${superAdmin2.email}`);

  const superAdmin3Password = await bcrypt.hash('Yed*76magelan', 10);
  const superAdmin3 = await prisma.user.upsert({
    where: { email: 'rickardigital@gmail.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'rickardigital@gmail.com',
      password: superAdmin3Password,
      firstName: 'Richkard',
      lastName: 'Digital',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Super Admin : ${superAdmin3.email}`);

  // ============================================
  // 2. Écoles
  // ============================================
  const school1 = await prisma.school.upsert({
    where: { code: 'ECO-001' },
    update: {},
    create: {
      name: 'École Primaire Sainte-Marie',
      code: 'ECO-001',
      ville: 'Abidjan',
      address: 'Cocody, Rue des Jardins',
      isActive: true,
    },
  });

  const school2 = await prisma.school.upsert({
    where: { code: 'ECO-002' },
    update: {},
    create: {
      name: 'Collège Moderne du Plateau',
      code: 'ECO-002',
      ville: 'Abidjan',
      address: 'Plateau, Avenue Chardy',
      isActive: true,
    },
  });
  console.log('🏫 Écoles créées');

  // ============================================
  // 3. Niveaux scolaires
  // ============================================
  const niveauxData = [
    { nom: 'PS', rang: 1 },
    { nom: 'MS', rang: 2 },
    { nom: 'GS', rang: 3 },
    { nom: 'CP', rang: 10 },
    { nom: 'CE1', rang: 11 },
    { nom: 'CE2', rang: 12 },
    { nom: 'CM1', rang: 13 },
    { nom: 'CM2', rang: 14 },
    { nom: '6ème', rang: 20 },
    { nom: '5ème', rang: 21 },
    { nom: '4ème', rang: 22 },
    { nom: '3ème', rang: 23 },
    { nom: '2nde', rang: 30 },
    { nom: '1ère', rang: 31 },
    { nom: 'Terminale', rang: 32 },
  ];

  const niveaux: Record<string, string> = {};
  for (const n of niveauxData) {
    const niveau = await prisma.niveau.upsert({
      where: { nom_schoolId: { nom: n.nom, schoolId: school1.id } },
      update: { rang: n.rang },
      create: {
        nom: n.nom,
        rang: n.rang,
        schoolId: school1.id,
      },
    });
    niveaux[n.nom] = niveau.id;
  }

  // Créer les mêmes niveaux pour l'école 2
  for (const n of niveauxData) {
    await prisma.niveau.upsert({
      where: { nom_schoolId: { nom: n.nom, schoolId: school2.id } },
      update: { rang: n.rang },
      create: {
        nom: n.nom,
        rang: n.rang,
        schoolId: school2.id,
      },
    });
  }
  console.log(`📊 ${niveauxData.length} niveaux créés par école`);

  // ============================================
  // 4. Utilisateurs par rôle (École 1)
  // ============================================
  const defaultPassword = await bcrypt.hash('password123', 10);

  // Directeur
  const directeur = await prisma.user.upsert({
    where: { email: 'directeur@ecole1.com' },
    update: { role: 'DIRECTEUR', schoolId: school1.id },
    create: {
      email: 'directeur@ecole1.com',
      password: defaultPassword,
      firstName: 'Jean',
      lastName: 'Directeur',
      role: 'DIRECTEUR',
      schoolId: school1.id,
    },
  });

  // Lier le directeur à l'école
  await prisma.school.update({
    where: { id: school1.id },
    data: { managerId: directeur.id },
  });
  console.log(`✅ Directeur : ${directeur.email}`);

  // Éducateur
  const educateur = await prisma.user.upsert({
    where: { email: 'educateur@ecole1.com' },
    update: { role: 'EDUCATEUR', schoolId: school1.id },
    create: {
      email: 'educateur@ecole1.com',
      password: defaultPassword,
      firstName: 'Marie',
      lastName: 'Educateur',
      role: 'EDUCATEUR',
      schoolId: school1.id,
    },
  });
  console.log(`✅ Éducateur : ${educateur.email}`);

  // Enseignant
  const enseignant = await prisma.user.upsert({
    where: { email: 'enseignant@ecole1.com' },
    update: { role: 'ENSEIGNANT', schoolId: school1.id },
    create: {
      email: 'enseignant@ecole1.com',
      password: defaultPassword,
      firstName: 'Pierre',
      lastName: 'Prof',
      role: 'ENSEIGNANT',
      schoolId: school1.id,
    },
  });
  console.log(`✅ Enseignant : ${enseignant.email}`);

  // Apprenant
  const apprenant = await prisma.user.upsert({
    where: { email: 'apprenant@ecole1.com' },
    update: { role: 'APPRENANT', schoolId: school1.id },
    create: {
      email: 'apprenant@ecole1.com',
      password: defaultPassword,
      firstName: 'Kouassi',
      lastName: 'Élève',
      role: 'APPRENANT',
      schoolId: school1.id,
    },
  });
  console.log(`✅ Apprenant : ${apprenant.email}`);

  // ============================================
  // 5. Année scolaire + Trimestres
  // ============================================
  const academicYear = await prisma.academicYear.upsert({
    where: { name_schoolId: { name: '2025-2026', schoolId: school1.id } },
    update: {},
    create: {
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
      schoolId: school1.id,
    },
  });

  const terms = [
    { name: 'Trimestre 1', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'), status: 'CLOSED' as const },
    { name: 'Trimestre 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-20'), status: 'CLOSED' as const },
    { name: 'Trimestre 3', startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), status: 'OPEN' as const },
  ];

  for (const t of terms) {
    await prisma.term.upsert({
      where: { id: `seed-term-${t.name.replace(/\s/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seed-term-${t.name.replace(/\s/g, '-').toLowerCase()}`,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status,
        academicYearId: academicYear.id,
      },
    });
  }
  console.log('📅 Année scolaire + 3 trimestres créés');

  // ============================================
  // 6. Matières
  // ============================================
  const subjectsData = [
    { name: 'Mathématiques', code: 'MATH', coefficient: 4 },
    { name: 'Français', code: 'FRA', coefficient: 4 },
    { name: 'Anglais', code: 'ANG', coefficient: 2 },
    { name: 'SVT', code: 'SVT', coefficient: 2 },
    { name: 'Histoire-Géographie', code: 'HG', coefficient: 2 },
    { name: 'Éducation Physique', code: 'EPS', coefficient: 1 },
  ];

  for (const s of subjectsData) {
    await prisma.subject.upsert({
      where: { name_schoolId: { name: s.name, schoolId: school1.id } },
      update: { coefficient: s.coefficient, code: s.code },
      create: {
        name: s.name,
        code: s.code,
        coefficient: s.coefficient,
        schoolId: school1.id,
      },
    });
  }
  console.log(`📚 ${subjectsData.length} matières créées`);

  // ============================================
  // 7. Classes
  // ============================================
  const classesData = [
    { name: '6ème A', niveauNom: '6ème' },
    { name: '6ème B', niveauNom: '6ème' },
    { name: '5ème A', niveauNom: '5ème' },
    { name: '4ème A', niveauNom: '4ème' },
  ];

  for (const c of classesData) {
    await prisma.class.upsert({
      where: { name_schoolId: { name: c.name, schoolId: school1.id } },
      update: {},
      create: {
        name: c.name,
        schoolId: school1.id,
        niveauId: niveaux[c.niveauNom] || null,
        academicYearId: academicYear.id,
      },
    });
  }
  console.log(`🏫 ${classesData.length} classes créées`);

  // ============================================
  // 8. Récupérer les classes et matières pour les affectations
  // ============================================
  const sixiemeA = await prisma.class.findFirst({ where: { name: '6ème A', schoolId: school1.id } });
  const cinquiemeA = await prisma.class.findFirst({ where: { name: '5ème A', schoolId: school1.id } });
  const mathSubject = await prisma.subject.findFirst({ where: { name: 'Mathématiques', schoolId: school1.id } });
  const francaisSubject = await prisma.subject.findFirst({ where: { name: 'Français', schoolId: school1.id } });
  const anglaisSubject = await prisma.subject.findFirst({ where: { name: 'Anglais', schoolId: school1.id } });

  // ============================================
  // 9. Inscription de l'apprenant dans une classe (Enrollment)
  // ============================================
  if (sixiemeA) {
    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: apprenant.id, classId: sixiemeA.id } },
      update: {},
      create: {
        studentId: apprenant.id,
        classId: sixiemeA.id,
        matricule: 'MAT-2026-001',
      },
    });
    console.log('📝 Apprenant inscrit en 6ème A');
  }

  // ============================================
  // 10. Affectation enseignant → classe → matière (Course)
  // ============================================
  const coursesCreated: string[] = [];
  
  if (sixiemeA && mathSubject) {
    const course = await prisma.course.upsert({
      where: { classId_subjectId_teacherId: { classId: sixiemeA.id, subjectId: mathSubject.id, teacherId: enseignant.id } },
      update: {},
      create: {
        classId: sixiemeA.id,
        subjectId: mathSubject.id,
        teacherId: enseignant.id,
        coefficient: mathSubject.coefficient,
      },
    });
    coursesCreated.push(course.id);
  }

  if (sixiemeA && francaisSubject) {
    const course = await prisma.course.upsert({
      where: { classId_subjectId_teacherId: { classId: sixiemeA.id, subjectId: francaisSubject.id, teacherId: enseignant.id } },
      update: {},
      create: {
        classId: sixiemeA.id,
        subjectId: francaisSubject.id,
        teacherId: enseignant.id,
        coefficient: francaisSubject.coefficient,
      },
    });
    coursesCreated.push(course.id);
  }

  if (sixiemeA && anglaisSubject) {
    const course = await prisma.course.upsert({
      where: { classId_subjectId_teacherId: { classId: sixiemeA.id, subjectId: anglaisSubject.id, teacherId: enseignant.id } },
      update: {},
      create: {
        classId: sixiemeA.id,
        subjectId: anglaisSubject.id,
        teacherId: enseignant.id,
        coefficient: anglaisSubject.coefficient,
      },
    });
    coursesCreated.push(course.id);
  }
  console.log(`📚 ${coursesCreated.length} cours créés (enseignant ↔ classe ↔ matière)`);

  // ============================================
  // 11. TeacherClass (affectation directe)
  // ============================================
  if (sixiemeA && mathSubject) {
    await prisma.teacherClass.upsert({
      where: { teacherId_classId_subjectId: { teacherId: enseignant.id, classId: sixiemeA.id, subjectId: mathSubject.id } },
      update: {},
      create: {
        teacherId: enseignant.id,
        classId: sixiemeA.id,
        subjectId: mathSubject.id,
      },
    });
  }
  console.log('👨‍🏫 TeacherClass créé');

  // ============================================
  // 12. Devoirs de test (Assignments)
  // ============================================
  if (coursesCreated.length > 0) {
    const mathCourseId = coursesCreated[0];
    
    await prisma.assignment.create({
      data: {
        title: 'Exercice: Fractions et décimaux',
        description: 'Résolvez les exercices du chapitre 3 sur les fractions.',
        dueDate: new Date('2026-08-15'),
        courseId: mathCourseId,
        coefficient: 2,
        points: 20,
      },
    });

    await prisma.assignment.create({
      data: {
        title: 'Contrôle de Mathématiques — Chapitre 4',
        description: 'Évaluation sur les équations du premier degré.',
        dueDate: new Date('2026-08-30'),
        courseId: mathCourseId,
        coefficient: 3,
        points: 20,
      },
    });

    if (coursesCreated.length > 1) {
      const francaisCourseId = coursesCreated[1];
      await prisma.assignment.create({
        data: {
          title: 'Rédaction: Mon village natal',
          description: "Rédigez un texte de 200 mots décrivant votre village ou quartier.",
          dueDate: new Date('2026-08-20'),
          courseId: francaisCourseId,
          coefficient: 2,
          points: 20,
        },
      });
    }
    console.log('📋 Devoirs de test créés');
  }

  // ============================================
  // Résumé
  // ============================================
  const userCount = await prisma.user.count();
  const schoolCount = await prisma.school.count();
  const niveauCount = await prisma.niveau.count();
  const classCount = await prisma.class.count();
  const enrollmentCount = await prisma.enrollment.count();
  const courseCount = await prisma.course.count();
  const assignmentCount = await prisma.assignment.count();

  console.log('\n📊 Résumé :');
  console.log(`  👤 ${userCount} utilisateurs`);
  console.log(`  🏫 ${schoolCount} écoles`);
  console.log(`  📊 ${niveauCount} niveaux`);
  console.log(`  🎓 ${classCount} classes`);
  console.log(`  📝 ${enrollmentCount} inscriptions`);
  console.log(`  📚 ${courseCount} cours`);
  console.log(`  📋 ${assignmentCount} devoirs`);
  console.log('\n✅ Seed terminé !');

  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ Erreur seed:', error);
  process.exit(1);
});