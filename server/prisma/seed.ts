/**
 * Seed de la base de données.
 * Crée la structure initiale globale et une École Démo 100% complète et fonctionnelle :
 * - Super Admins (Platform Super Administrators)
 * - Types d'enseignement & Types d'établissement
 * - École Démo ("Complexe Scolaire Excellence d'Abidjan")
 * - Directeur, Éducateur, Enseignant
 * - Multi-classes pour l'enseignant (6ème A, 5ème A, 3ème A)
 * - 2 Élèves inscrits en classe de 6ème A
 * - Année académique + Trimestres
 * - Matières, Cours, Chapitres publiés & Devoirs
 * - Notes & Absences
 *
 * Usage : node --loader ts-node/esm prisma/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log('🚀 Démarrage de l\'initialisation de la base de données...\n');

  // ============================================
  // 1. Super Admins de la plateforme
  // ============================================
  const defaultPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('Yed*76magelan', 10);

  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'superadmin@example.com',
      password: defaultPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    },
  });

  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'llateamd@gmail.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'llateamd@gmail.com',
      password: await bcrypt.hash('nestorkoffi', 10),
      firstName: 'Nestor',
      lastName: 'Koffi',
      role: 'SUPER_ADMIN',
    },
  });

  const superAdmin3 = await prisma.user.upsert({
    where: { email: 'rickardigital@gmail.com' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      email: 'rickardigital@gmail.com',
      password: adminPassword,
      firstName: 'Richkard',
      lastName: 'Digital',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Super Admins configurés (${superAdmin3.email}, ${superAdmin1.email})`);

  // ============================================
  // 2. Types d'enseignement & Types d'établissement
  // ============================================
  const defaultTeachingTypes = [
    'Enseignement Général (Primaire)',
    'Enseignement Général (Secondaire)',
    'Enseignement Technique & Professionnel',
    'Complexe Mixte (Général & Technique)'
  ];

  const teachingTypeMap: Record<string, string> = {};
  for (const ttName of defaultTeachingTypes) {
    const tt = await prisma.teachingType.upsert({
      where: { name: ttName },
      update: { isActive: true },
      create: { name: ttName, isActive: true }
    });
    teachingTypeMap[ttName] = tt.id;
  }
  console.log('📚 Types d\'enseignement créés');

  const defaultSchoolTypes = [
    { name: 'Primaire', code: 'PRIM', description: 'Établissement du premier degré (CI à CM2)' },
    { name: 'Collège', code: 'COL', description: 'Premier cycle du secondaire (6ème à 3ème)' },
    { name: 'Lycée', code: 'LYC', description: 'Second cycle du secondaire (Seconde à Terminale)' },
    { name: 'Complexe Scolaire (Primaire & Secondaire)', code: 'CS', description: 'Établissement intégrant le primaire et le secondaire' },
    { name: 'Lycée Technique', code: 'LT', description: 'Enseignement technique et professionnel' }
  ];

  const schoolTypeMap: Record<string, string> = {};
  for (const st of defaultSchoolTypes) {
    const sType = await prisma.schoolType.upsert({
      where: { name: st.name },
      update: { code: st.code, description: st.description, isActive: true },
      create: { name: st.name, code: st.code, description: st.description, isActive: true }
    });
    schoolTypeMap[st.name] = sType.id;
  }
  console.log('🏫 Types d\'établissement créés');

  // ============================================
  // 3. École Démo ("Complexe Scolaire Excellence d'Abidjan")
  // ============================================
  const schoolDemo = await prisma.school.upsert({
    where: { code: 'CS-EXCELLENCE-2026' },
    update: {
      teachingTypeId: teachingTypeMap['Enseignement Général (Secondaire)'],
      schoolTypeId: schoolTypeMap['Complexe Scolaire (Primaire & Secondaire)'],
    },
    create: {
      name: 'Complexe Scolaire Excellence d\'Abidjan',
      code: 'CS-EXCELLENCE-2026',
      ville: 'Abidjan',
      address: 'Cocody Riviera 3, Bd de France',
      phone: '+225 07 08 09 10 11',
      email: 'contact@excellence-abidjan.edu.ci',
      description: 'Établissement démo de référence pour la plateforme École 3.0',
      isActive: true,
      teachingTypeId: teachingTypeMap['Enseignement Général (Secondaire)'],
      schoolTypeId: schoolTypeMap['Complexe Scolaire (Primaire & Secondaire)'],
    },
  });

  // École secondaire secondaire 2
  await prisma.school.upsert({
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
  console.log('🏫 Écoles Démo configurées');

  // ============================================
  // 4. Niveaux scolaires
  // ============================================
  const niveauxData = [
    { nom: '6ème', rang: 20 },
    { nom: '5ème', rang: 21 },
    { nom: '4ème', rang: 22 },
    { nom: '3ème', rang: 23 },
    { nom: '2nde', rang: 30 },
    { nom: '1ère', rang: 31 },
    { nom: 'Terminale', rang: 32 },
  ];

  const niveauxMap: Record<string, string> = {};
  for (const n of niveauxData) {
    const niveau = await prisma.niveau.upsert({
      where: { nom_schoolId: { nom: n.nom, schoolId: schoolDemo.id } },
      update: { rang: n.rang },
      create: {
        nom: n.nom,
        rang: n.rang,
        schoolId: schoolDemo.id,
      },
    });
    niveauxMap[n.nom] = niveau.id;
  }
  console.log(`📊 ${niveauxData.length} niveaux créés pour l'école Démo`);

  // ============================================
  // 5. Année académique + Trimestres
  // ============================================
  const academicYear = await prisma.academicYear.upsert({
    where: { name_schoolId: { name: '2025-2026', schoolId: schoolDemo.id } },
    update: { isCurrent: true },
    create: {
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
      schoolId: schoolDemo.id,
    },
  });

  const terms = [
    { name: 'Trimestre 1', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'), status: 'CLOSED' as const },
    { name: 'Trimestre 2', startDate: new Date('2026-01-05'), endDate: new Date('2026-03-20'), status: 'CLOSED' as const },
    { name: 'Trimestre 3', startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), status: 'OPEN' as const },
  ];

  for (const t of terms) {
    const termId = `term-demo-${t.name.replace(/\s/g, '-').toLowerCase()}-${schoolDemo.id.slice(0, 8)}`;
    await prisma.term.upsert({
      where: { id: termId },
      update: { status: t.status },
      create: {
        id: termId,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status,
        academicYearId: academicYear.id,
      },
    });
  }
  console.log('📅 Année académique 2025-2026 + 3 Trimestres créés');

  // ============================================
  // 6. Acteurs de l'École Démo (Utilisateurs)
  // ============================================
  
  // A. Directeur
  const directeur = await prisma.user.upsert({
    where: { email: 'directeur.excellence@ecole30.com' },
    update: { role: 'DIRECTEUR', schoolId: schoolDemo.id },
    create: {
      email: 'directeur.excellence@ecole30.com',
      password: defaultPassword,
      firstName: 'Marc',
      lastName: 'Koffi',
      role: 'DIRECTEUR',
      schoolId: schoolDemo.id,
    },
  });

  await prisma.school.update({
    where: { id: schoolDemo.id },
    data: { managerId: directeur.id },
  });
  console.log(`👨‍💼 Directeur : ${directeur.email} (Marc Koffi)`);

  // B. Éducateur / Conseiller d'Éducation
  const educateur = await prisma.user.upsert({
    where: { email: 'educateur.excellence@ecole30.com' },
    update: { role: 'EDUCATEUR', schoolId: schoolDemo.id },
    create: {
      email: 'educateur.excellence@ecole30.com',
      password: defaultPassword,
      firstName: 'Sylvie',
      lastName: 'Bamba',
      role: 'EDUCATEUR',
      schoolId: schoolDemo.id,
    },
  });
  console.log(`👩‍💼 Éducatrice : ${educateur.email} (Sylvie Bamba)`);

  // C. Professeur / Enseignant (Multi-Classes)
  const enseignant = await prisma.user.upsert({
    where: { email: 'prof.maths@ecole30.com' },
    update: { role: 'ENSEIGNANT', schoolId: schoolDemo.id },
    create: {
      email: 'prof.maths@ecole30.com',
      password: defaultPassword,
      firstName: 'Amadou',
      lastName: 'Koné',
      role: 'ENSEIGNANT',
      schoolId: schoolDemo.id,
    },
  });
  console.log(`👨‍🏫 Professeur : ${enseignant.email} (Amadou Koné)`);

  // D. Élève 1
  const eleve1 = await prisma.user.upsert({
    where: { email: 'eleve1.excellence@ecole30.com' },
    update: { role: 'APPRENANT', schoolId: schoolDemo.id },
    create: {
      email: 'eleve1.excellence@ecole30.com',
      password: defaultPassword,
      firstName: 'Yao',
      lastName: 'Jean-Marc',
      role: 'APPRENANT',
      schoolId: schoolDemo.id,
    },
  });

  // E. Élève 2
  const eleve2 = await prisma.user.upsert({
    where: { email: 'eleve2.excellence@ecole30.com' },
    update: { role: 'APPRENANT', schoolId: schoolDemo.id },
    create: {
      email: 'eleve2.excellence@ecole30.com',
      password: defaultPassword,
      firstName: 'Konan',
      lastName: 'Akissi Sarah',
      role: 'APPRENANT',
      schoolId: schoolDemo.id,
    },
  });
  console.log(`👨‍🎓 Élève 1 : ${eleve1.email} (Yao Jean-Marc)`);
  console.log(`👩‍🎓 Élève 2 : ${eleve2.email} (Konan Akissi Sarah)`);

  // ============================================
  // 7. Matières de l'École
  // ============================================
  const subjectsData = [
    { name: 'Mathématiques', code: 'MATH', coefficient: 4 },
    { name: 'Sciences de la Vie et de la Terre', code: 'SVT', coefficient: 2 },
    { name: 'Français', code: 'FRA', coefficient: 4 },
    { name: 'Anglais', code: 'ANG', coefficient: 2 },
    { name: 'Histoire-Géographie', code: 'HG', coefficient: 2 },
  ];

  const subjectsMap: Record<string, any> = {};
  for (const s of subjectsData) {
    const subject = await prisma.subject.upsert({
      where: { name_schoolId: { name: s.name, schoolId: schoolDemo.id } },
      update: { coefficient: s.coefficient, code: s.code },
      create: {
        name: s.name,
        code: s.code,
        coefficient: s.coefficient,
        schoolId: schoolDemo.id,
      },
    });
    subjectsMap[s.name] = subject;
  }
  console.log('📚 Matières créées');

  // ============================================
  // 8. Classes (6ème A, 5ème A, 3ème A)
  // ============================================
  const class6A = await prisma.class.upsert({
    where: { name_schoolId: { name: '6ème A', schoolId: schoolDemo.id } },
    update: {},
    create: {
      name: '6ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauxMap['6ème'],
      academicYearId: academicYear.id,
    },
  });

  const class5A = await prisma.class.upsert({
    where: { name_schoolId: { name: '5ème A', schoolId: schoolDemo.id } },
    update: {},
    create: {
      name: '5ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauxMap['5ème'],
      academicYearId: academicYear.id,
    },
  });

  const class3A = await prisma.class.upsert({
    where: { name_schoolId: { name: '3ème A', schoolId: schoolDemo.id } },
    update: {},
    create: {
      name: '3ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauxMap['3ème'],
      academicYearId: academicYear.id,
    },
  });
  console.log('🎓 Classes créées (6ème A, 5ème A, 3ème A)');

  // ============================================
  // 9. Inscription des 2 élèves en 6ème A
  // ============================================
  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: eleve1.id, classId: class6A.id } },
    update: {},
    create: {
      studentId: eleve1.id,
      classId: class6A.id,
      matricule: 'MAT-2026-001',
    },
  });

  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: eleve2.id, classId: class6A.id } },
    update: {},
    create: {
      studentId: eleve2.id,
      classId: class6A.id,
      matricule: 'MAT-2026-002',
    },
  });
  console.log('📝 2 élèves inscrits en 6ème A (Yao Jean-Marc & Konan Sarah)');

  // ============================================
  // 10. Multi-Affectations Enseignant (Prof. Amadou Koné → 6ème A, 5ème A, 3ème A)
  // ============================================
  // Course 1: Mathématiques 6ème A
  const courseMath6A = await prisma.course.upsert({
    where: { classId_subjectId_teacherId: { classId: class6A.id, subjectId: subjectsMap['Mathématiques'].id, teacherId: enseignant.id } },
    update: {},
    create: {
      classId: class6A.id,
      subjectId: subjectsMap['Mathématiques'].id,
      teacherId: enseignant.id,
      coefficient: 4,
    },
  });

  // Course 2: SVT 6ème A
  const courseSVT6A = await prisma.course.upsert({
    where: { classId_subjectId_teacherId: { classId: class6A.id, subjectId: subjectsMap['Sciences de la Vie et de la Terre'].id, teacherId: enseignant.id } },
    update: {},
    create: {
      classId: class6A.id,
      subjectId: subjectsMap['Sciences de la Vie et de la Terre'].id,
      teacherId: enseignant.id,
      coefficient: 2,
    },
  });

  // Course 3: Mathématiques 3ème A
  const courseMath3A = await prisma.course.upsert({
    where: { classId_subjectId_teacherId: { classId: class3A.id, subjectId: subjectsMap['Mathématiques'].id, teacherId: enseignant.id } },
    update: {},
    create: {
      classId: class3A.id,
      subjectId: subjectsMap['Mathématiques'].id,
      teacherId: enseignant.id,
      coefficient: 4,
    },
  });

  // TeacherClasses
  await prisma.teacherClass.upsert({
    where: { teacherId_classId_subjectId: { teacherId: enseignant.id, classId: class6A.id, subjectId: subjectsMap['Mathématiques'].id } },
    update: {},
    create: { teacherId: enseignant.id, classId: class6A.id, subjectId: subjectsMap['Mathématiques'].id },
  });

  await prisma.teacherClass.upsert({
    where: { teacherId_classId_subjectId: { teacherId: enseignant.id, classId: class6A.id, subjectId: subjectsMap['Sciences de la Vie et de la Terre'].id } },
    update: {},
    create: { teacherId: enseignant.id, classId: class6A.id, subjectId: subjectsMap['Sciences de la Vie et de la Terre'].id },
  });

  await prisma.teacherClass.upsert({
    where: { teacherId_classId_subjectId: { teacherId: enseignant.id, classId: class3A.id, subjectId: subjectsMap['Mathématiques'].id } },
    update: {},
    create: { teacherId: enseignant.id, classId: class3A.id, subjectId: subjectsMap['Mathématiques'].id },
  });

  console.log('👨‍🏫 Prof. Amadou Koné affecté aux cours en 6ème A (Maths & SVT) et en 3ème A (Maths)');

  // ============================================
  // 11. Chapitres de cours publiés
  // ============================================
  // Nettoyer les anciens chapitres pour réinitialisation propre
  await prisma.chapter.deleteMany({
    where: { courseId: { in: [courseMath6A.id, courseSVT6A.id, courseMath3A.id] } }
  });

  await prisma.chapter.create({
    data: {
      title: 'Chapitre 1 : Les Nombres Entiers et Décimaux',
      content: 'Dans ce premier chapitre, nous étudions l\'écriture, la comparaison et les opérations élémentaires sur les nombres entiers et décimaux.',
      courseId: courseMath6A.id,
    }
  });

  await prisma.chapter.create({
    data: {
      title: 'Chapitre 2 : Fractions et Opérations',
      content: 'Définition des fractions, simplification et calculs de sommes et de produits de fractions.',
      courseId: courseMath6A.id,
    }
  });

  await prisma.chapter.create({
    data: {
      title: 'Chapitre 3 : Équations du Premier Degré',
      content: 'Résolution de problèmes et équations à une inconnue.',
      courseId: courseMath6A.id,
    }
  });

  await prisma.chapter.create({
    data: {
      title: 'Chapitre 1 : La Cellule et le Monde Vivant',
      content: 'Introduction à la biologie générale : la structure cellulaire et les règnes du vivant.',
      courseId: courseSVT6A.id,
    }
  });

  await prisma.chapter.create({
    data: {
      title: 'Chapitre 1 : Théorème de Thalès et Applications',
      content: 'Rapports de longueurs, droites parallèles et agrandissement/réduction.',
      courseId: courseMath3A.id,
    }
  });

  console.log('📖 5 Chapitres de cours créés et publiés à travers les différentes matières');

  // ============================================
  // 12. Devoirs & Évaluations
  // ============================================
  await prisma.assignment.deleteMany({
    where: { courseId: { in: [courseMath6A.id, courseSVT6A.id, courseMath3A.id] } }
  });

  await prisma.assignment.create({
    data: {
      title: 'Devoir 1 : Exercices sur les fractions et décimaux',
      description: 'Effectuer les exercices 1 à 5 du manuel page 42. À rendre obligatoirement.',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      courseId: courseMath6A.id,
      coefficient: 2,
      points: 20,
    }
  });

  await prisma.assignment.create({
    data: {
      title: 'Contrôle Continu : Équations et Problèmes',
      description: 'Évaluation individuelle écrite sur l\'ensemble des notions du trimestre.',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      courseId: courseMath6A.id,
      coefficient: 3,
      points: 20,
    }
  });

  await prisma.assignment.create({
    data: {
      title: 'TP SVT : Schéma et observation microscopique',
      description: 'Dessiner et légender la cellule végétale observée pendant le TP.',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      courseId: courseSVT6A.id,
      coefficient: 2,
      points: 20,
    }
  });

  await prisma.assignment.create({
    data: {
      title: 'Devoir de Synthèse : Théorème de Thalès',
      description: 'Résolution de problèmes complexes avec figures géométriques.',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      courseId: courseMath3A.id,
      coefficient: 3,
      points: 20,
    }
  });

  console.log('📋 Devoirs et évaluations créés pour toutes les classes');

  // ============================================
  // 13. Flash News de Démo
  // ============================================
  await prisma.news.create({
    data: {
      title: "Bienvenue au Complexe Scolaire Excellence d'Abidjan !",
      content: "La direction de l'école est heureuse d'accueillir les élèves et leurs parents pour cette nouvelle année académique sous le signe de l'excellence numérique.",
      priority: "FLASH",
      isActive: true,
      targetRoles: ["ALL"],
      authorId: directeur.id,
      schoolId: schoolDemo.id,
    }
  });

  console.log('\n=============================================================');
  console.log('🎉 POPULATION DE LA DB ET AFFECTATIONS MULTI-CLASSES RÉUSSIES ! 🎉');
  console.log('=============================================================');
  console.log('🏫 École : Complexe Scolaire Excellence d\'Abidjan (CS-EXCELLENCE-2026)');
  console.log('👨‍🏫 Prof. Amadou Koné : Affecté à 6ème A (Maths & SVT) et 3ème A (Maths)');
  console.log('🎓 Élèves inscrits : Yao Jean-Marc & Konan Sarah (6ème A)');
  console.log('📖 Cours & Chapitres : 3 cours actifs avec 5 chapitres & 4 devoirs');
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ Erreur seed:', error);
  process.exit(1);
});