/**
 * Seed de la base de données SEEEC ÉCOLE 3.0.
 * Structure complète et École Démo 100% fonctionnelle :
 * - Super Admins de la plateforme
 * - 3 Packs d'Abonnement Payants (Standard, Pro, Élite - Zéro Gratuit)
 * - Types d'enseignement & Types d'établissement
 * - Tous les Niveaux Scolaires de Côte d'Ivoire (6ème à Terminale D)
 * - École Démo ("Complexe Scolaire d'Abidjan") abonnée au Pack Pro
 * - Directeur (Marc Koffi), Éducatrice (Sylvie Bamba), 8 Enseignants, 11 Élèves en 4ème A
 * - Année académique (2026-2027) + 3 Trimestres
 * - Matières officielles, Cours complets (Chapitres, Exercices QCM, Devoirs, Évaluations)
 * - Registre de Conduite (Notes de conduite et appréciations saisies par l'éducatrice)
 * - Bulletins scolaires Trimestre 1 validés intégrant la conduite et le calcul des moyennes
 * - Bibliothèque numérique 3.0 (Manuels & Annales)
 * - Flash News globale
 *
 * Usage : cmd.exe /c "npx tsx prisma/seed.ts"
 */
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log('🚀 Démarrage de l\'initialisation complète de la base de données SEEEC (Nettoyage & Re-Seed Démo)...\n');

  // ============================================
  // 0. Nettoyage ordonné de la base
  // ============================================
  console.log('🧹 Nettoyage des anciennes données...');
  
  // Relations CNED & Exercices
  await prisma.exerciseAnswer.deleteMany();
  await prisma.exerciseSubmission.deleteMany();
  await prisma.exerciseOption.deleteMany();
  await prisma.exerciseQuestion.deleteMany();
  await prisma.chapterExercise.deleteMany();
  await prisma.chapterProgress.deleteMany();
  await prisma.assignmentPropagation.deleteMany();
  await prisma.annualAverage.deleteMany();

  // Relations Devoirs & Quiz
  await prisma.assignmentOption.deleteMany();
  await prisma.assignmentQuestion.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.quizAnswer.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();

  // Bulletins & Vie scolaire
  await prisma.bulletinEleve.deleteMany();
  await prisma.bulletin.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.conduct.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.message.deleteMany();
  await prisma.forumComment.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.news.deleteMany();
  await prisma.auditLog.deleteMany();

  // Cours, Chapitres, Ressources
  await prisma.resource.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.niveau.deleteMany();
  
  // Detach managers & subscriptions
  await prisma.school.updateMany({ data: { managerId: null, subscriptionId: null } });
  
  await prisma.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
  await prisma.school.deleteMany();
  await prisma.subscription.deleteMany();
  console.log('🧹 Nettoyage terminé.');

  // ============================================
  // 1. Super Admins de la plateforme
  // ============================================
  const defaultPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('Yed*76magelan', 10);

  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: { role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin' },
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
  // 2. Abonnements (3 Packs Payants - Zéro Gratuit)
  // ============================================
  const planStandard = await prisma.subscription.create({
    data: {
      name: "Pack Standard",
      planKey: "standard",
      description: "Idéal pour les collèges et établissements de proximité (jusqu'à 500 élèves)",
      price: 75000,
      period: "par trimestre",
      features: [
        "Gestion complète des élèves & classes",
        "Notes, évaluations & relevés",
        "Bulletins automatisés officiels",
        "Agenda scolaire synchronisé",
        "Cahier de texte numérique",
        "Support technique par email"
      ],
      isActive: true,
    }
  });

  const planPro = await prisma.subscription.create({
    data: {
      name: "Pack Pro Établissement",
      planKey: "pro",
      description: "La solution complète pour tout le secondaire (collèges & lycées d'excellence)",
      price: 150000,
      period: "par trimestre",
      features: [
        "Tous les avantages du Pack Standard",
        "Collèges & Lycées (1er et 2nd cycles)",
        "Effectifs élèves & professeurs illimités",
        "Bulletins officiels SEEEC + Registre de Conduite",
        "Messagerie directe & Annonces Flash News",
        "Librairie numérique 3.0 (Manuels & Annales)",
        "Accompagnement & Support prioritaire"
      ],
      isActive: true,
    }
  });

  const planElite = await prisma.subscription.create({
    data: {
      name: "Pack Élite Complexe",
      planKey: "elite",
      description: "Pour les grands groupes scolaires, complexes mixtes et réseaux multi-établissements",
      price: 250000,
      period: "par trimestre",
      features: [
        "Tous les avantages du Pack Pro",
        "Multi-établissements & Gestion centralisée",
        "Enseignement Général, Technique & Mixte",
        "Module Examens Blancs & Statistiques avancées",
        "Personnalisation & Intégration SEEEC",
        "Formation des équipes pédagogiques sur site",
        "Chef de projet dédié & Support 24/7"
      ],
      isActive: true,
    }
  });
  console.log('💎 3 Packs d\'abonnement payants configurés (Standard, Pro, Élite)');

  // ============================================
  // 3. Types d'enseignement & Types d'établissement
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
  console.log('🏫 Types d\'établissement et enseignement vérifiés');

  // ============================================
  // 4. École Démo ("Complexe Scolaire d'Abidjan")
  // ============================================
  const schoolDemo = await prisma.school.create({
    data: {
      name: "Complexe Scolaire d'Abidjan",
      code: 'CS-ABIDJAN-2026',
      ville: 'Abidjan',
      address: 'Cocody Deux-Plateaux Vallon, Rue des Jardins',
      phone: '+225 27 22 44 55 66',
      email: 'contact@csabidjan.ci',
      description: "Établissement d'excellence de référence en Côte d'Ivoire — Maternelle, Primaire et Secondaire.",
      isActive: true,
      subscriptionId: planPro.id,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartDate: new Date('2026-08-01'),
      subscriptionEndDate: new Date('2027-08-01'),
      teachingTypeId: teachingTypeMap['Enseignement Général (Secondaire)'],
      schoolTypeId: schoolTypeMap['Complexe Scolaire (Primaire & Secondaire)'],
    }
  });

  // ============================================
  // 5. Niveaux Scolaires de Côte d'Ivoire (6ème à Terminale D)
  // ============================================
  const ivoirianLevels = [
    // Premier cycle
    { nom: '6ème', rang: 20 },
    { nom: '5ème', rang: 21 },
    { nom: '4ème', rang: 22 },
    { nom: '3ème', rang: 23 },
    // Second cycle (Lycée)
    { nom: '2nde A', rang: 24 },
    { nom: '2nde C', rang: 25 },
    { nom: '1ère A', rang: 26 },
    { nom: '1ère C', rang: 27 },
    { nom: '1ère D', rang: 28 },
    { nom: 'Terminale A', rang: 29 },
    { nom: 'Terminale C', rang: 30 },
    { nom: 'Terminale D', rang: 31 },
  ];

  const niveauMap: Record<string, any> = {};
  for (const lvl of ivoirianLevels) {
    const niveau = await prisma.niveau.create({
      data: {
        nom: lvl.nom,
        rang: lvl.rang,
        schoolId: schoolDemo.id,
      }
    });
    niveauMap[lvl.nom] = niveau;
  }
  console.log(`🎓 12 Niveaux scolaires officiels ivoiriens créés (6ème à Terminale D)`);

  // ============================================
  // 6. Acteurs Démo (Directeur & Éducatrice)
  // ============================================
  const directeur = await prisma.user.create({
    data: {
      email: 'directeur@ecole1.com',
      password: defaultPassword,
      firstName: 'Marc',
      lastName: 'Koffi',
      role: 'DIRECTEUR',
      schoolId: schoolDemo.id,
      phone: '+225 07 07 12 34 56',
      matricule: 'DIR-2026-001',
      gender: 'MASCULIN',
    }
  });

  // Alias directeur 1
  await prisma.user.create({
    data: {
      email: 'directeur1@ecole.ci',
      password: defaultPassword,
      firstName: 'Marc',
      lastName: 'Koffi',
      role: 'DIRECTEUR',
      schoolId: schoolDemo.id,
      phone: '+225 07 07 12 34 56',
      matricule: 'DIR-2026-002',
      gender: 'MASCULIN',
    }
  });

  await prisma.school.update({
    where: { id: schoolDemo.id },
    data: { managerId: directeur.id },
  });

  const educateur = await prisma.user.create({
    data: {
      email: 'educateur@ecole1.com',
      password: defaultPassword,
      firstName: 'Sylvie',
      lastName: 'Bamba',
      role: 'EDUCATEUR',
      schoolId: schoolDemo.id,
      phone: '+225 05 05 23 45 67',
      matricule: 'EDU-2026-001',
      gender: 'FEMININ',
    }
  });

  // ============================================
  // 7. Année Académique 2026-2027 & Trimestres
  // ============================================
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2026-2027',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      schools: { connect: { id: schoolDemo.id } },
    }
  });

  const term1 = await prisma.term.create({
    data: {
      id: `term-demo-trimestre-1-${schoolDemo.id.slice(0, 8)}`,
      name: 'Trimestre 1',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-11-30'),
      status: 'CLOSED',
      academicYearId: academicYear.id,
    }
  });

  const term2 = await prisma.term.create({
    data: {
      id: `term-demo-trimestre-2-${schoolDemo.id.slice(0, 8)}`,
      name: 'Trimestre 2',
      startDate: new Date('2026-12-01'),
      endDate: new Date('2027-03-31'),
      status: 'OPEN',
      academicYearId: academicYear.id,
    }
  });

  const term3 = await prisma.term.create({
    data: {
      id: `term-demo-trimestre-3-${schoolDemo.id.slice(0, 8)}`,
      name: 'Trimestre 3',
      startDate: new Date('2027-04-01'),
      endDate: new Date('2027-06-30'),
      status: 'CLOSED',
      academicYearId: academicYear.id,
    }
  });

  // ============================================
  // 8. Classes de l'établissement
  // ============================================
  const class4A = await prisma.class.create({
    data: {
      name: '4ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['4ème'].id,
      academicYearId: academicYear.id,
    }
  });

  const class6A = await prisma.class.create({
    data: {
      name: '6ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['6ème'].id,
      academicYearId: academicYear.id,
    }
  });

  const class3A = await prisma.class.create({
    data: {
      name: '3ème A',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['3ème'].id,
      academicYearId: academicYear.id,
    }
  });

  const class2ndC = await prisma.class.create({
    data: {
      name: '2nde C1',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['2nde C'].id,
      academicYearId: academicYear.id,
    }
  });

  const class1ereD = await prisma.class.create({
    data: {
      name: '1ère D1',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['1ère D'].id,
      academicYearId: academicYear.id,
    }
  });

  const classTleD = await prisma.class.create({
    data: {
      name: 'Terminale D1',
      schoolId: schoolDemo.id,
      niveauId: niveauMap['Terminale D'].id,
      academicYearId: academicYear.id,
    }
  });

  // ============================================
  // 9. Élèves de 4ème A (11 élèves)
  // ============================================
  const elevesData = [
    { firstName: "Jean", lastName: "Koffi", email: "apprenant@ecole1.com", gender: "MASCULIN", matricule: "MAT-2026-4A00", conductNote: 17.5, conductAppr: "Excellente discipline, élève travailleur et respectueux." },
    { firstName: "Amani", lastName: "Kouadio Jean", email: "amani.jean@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A01", conductNote: 16.0, conductAppr: "Bonne conduite d'ensemble, attentif en classe." },
    { firstName: "Bamba", lastName: "Fatoumata", email: "bamba.f@ecole.ci", gender: "FEMININ", matricule: "MAT-2026-4A02", conductNote: 18.0, conductAppr: "Comportement exemplaire, déléguée de classe très investie." },
    { firstName: "Cissé", lastName: "Ibrahim", email: "cisse.ib@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A03", conductNote: 14.5, conductAppr: "Attitude convenable, quelques bavardages à corriger." },
    { firstName: "Diarrassouba", lastName: "Aïcha", email: "diarra.a@ecole.ci", gender: "FEMININ", matricule: "MAT-2026-4A04", conductNote: 17.0, conductAppr: "Très sérieuse et appliquée dans toutes les activités." },
    { firstName: "Koffi", lastName: "Ahou Grace", email: "koffi.grace@ecole.ci", gender: "FEMININ", matricule: "MAT-2026-4A05", conductNote: 16.5, conductAppr: "Très bon esprit de camaraderie et assiduité." },
    { firstName: "Koné", lastName: "Aboubacar", email: "kone.abou@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A06", conductNote: 15.0, conductAppr: "Bonne participation, maintenir les efforts." },
    { firstName: "N'Guessan", lastName: "Yao Cédric", email: "nguessan.cedric@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A07", conductNote: 16.0, conductAppr: "Élève ponctuel et respectueux du règlement." },
    { firstName: "Ouattara", lastName: "Salif", email: "ouattara.salif@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A08", conductNote: 14.0, conductAppr: "Conduite satisfaisante mais attention à la concentration." },
    { firstName: "Sylla", lastName: "Mariam", email: "sylla.m@ecole.ci", gender: "FEMININ", matricule: "MAT-2026-4A09", conductNote: 18.5, conductAppr: "Exemplaire en tout point, félicitations pour votre tenue." },
    { firstName: "Touré", lastName: "Oumar", email: "toure.oumar@ecole.ci", gender: "MASCULIN", matricule: "MAT-2026-4A10", conductNote: 15.5, conductAppr: "Bon comportement, participe activement." }
  ];

  const createdStudents: any[] = [];
  for (let i = 0; i < elevesData.length; i++) {
    const e = elevesData[i];
    const user = await prisma.user.create({
      data: {
        email: e.email,
        password: defaultPassword,
        firstName: e.firstName,
        lastName: e.lastName,
        gender: e.gender as any,
        role: 'APPRENANT',
        schoolId: schoolDemo.id,
        matricule: e.matricule,
        phone: `+225 01 02 03 04 ${i.toString().padStart(2, '0')}`,
      }
    });

    await prisma.enrollment.create({
      data: {
        studentId: user.id,
        classId: class4A.id,
        academicYearId: academicYear.id,
        matricule: user.matricule,
      }
    });

    // Enregistrement de la note de conduite pour le Trimestre 1 et Trimestre 2
    await prisma.conduct.create({
      data: {
        studentId: user.id,
        termId: term1.id,
        grade: e.conductNote,
        appreciation: e.conductAppr,
        comment: "Saisie validée par la vie scolaire.",
      }
    });

    await prisma.conduct.create({
      data: {
        studentId: user.id,
        termId: term2.id,
        grade: e.conductNote,
        appreciation: e.conductAppr,
        comment: "Trimestre en cours.",
      }
    });

    createdStudents.push({ ...user, conductNote: e.conductNote, conductAppr: e.conductAppr });
  }

  // Alias apprenant1@ecole.ci
  await prisma.user.create({
    data: {
      email: 'apprenant1@ecole.ci',
      password: defaultPassword,
      firstName: 'Jean',
      lastName: 'Koffi',
      gender: 'MASCULIN',
      role: 'APPRENANT',
      schoolId: schoolDemo.id,
      matricule: 'MAT-2026-4A00-ALT',
      phone: '+225 01 02 03 04 99',
    }
  });

  // ============================================
  // 9b. Parent Démo (lié à Jean Koffi)
  // ============================================
  const parentDemo = await prisma.user.create({
    data: {
      email: 'parent@ecole1.com',
      password: defaultPassword,
      firstName: 'Michel',
      lastName: 'Koffi',
      gender: 'MASCULIN',
      role: 'PARENT',
      schoolId: schoolDemo.id,
      phone: '+225 05 06 07 08 09',
    }
  });

  const firstStudent = createdStudents[0];
  if (firstStudent) {
    await prisma.parentChild.create({
      data: {
        parentId: parentDemo.id,
        studentId: firstStudent.id,
      }
    });
  }

  // ============================================
  // 10. Matières & Enseignants
  // ============================================
  const matieresConfig = [
    { code: 'MATH', name: 'Mathématiques', coef: 3, teacher: { email: 'enseignant@ecole1.com', first: 'Soro', last: 'Guillaume', gender: 'MASCULIN' } },
    { code: 'FRAN', name: 'Français', coef: 3, teacher: { email: 'prof.francais@ecole.ci', first: 'Kouamé', last: 'Adjoua', gender: 'FEMININ' } },
    { code: 'PC', name: 'Physique-Chimie', coef: 2, teacher: { email: 'prof.pc@ecole.ci', first: 'Traoré', last: 'Moussa', gender: 'MASCULIN' } },
    { code: 'SVT', name: 'SVT (Sciences de la Vie et de la Terre)', coef: 2, teacher: { email: 'prof.svt@ecole.ci', first: 'N’Dri', last: 'Pascaline', gender: 'FEMININ' } },
    { code: 'HG', name: 'Histoire-Géographie', coef: 2, teacher: { email: 'prof.hg@ecole.ci', first: 'Konan', last: 'Lambert', gender: 'MASCULIN' } },
    { code: 'ANG', name: 'Anglais', coef: 2, teacher: { email: 'prof.anglais@ecole.ci', first: 'Diallo', last: 'Abdoulaye', gender: 'MASCULIN' } },
    { code: 'EPS', name: 'EPS (Éducation Physique)', coef: 1, teacher: { email: 'prof.eps@ecole.ci', first: 'Gbagbo', last: 'Honoré', gender: 'MASCULIN' } },
    { code: 'EDHC', name: 'EDHC (Éducation aux Droits de l\'Homme)', coef: 1, teacher: { email: 'prof.edhc@ecole.ci', first: 'Yao', last: 'Clémentine', gender: 'FEMININ' } },
  ];

  // Alias prof 1
  await prisma.user.create({
    data: {
      email: 'professeur1@ecole.ci',
      password: defaultPassword,
      firstName: 'Soro',
      lastName: 'Guillaume',
      gender: 'MASCULIN',
      role: 'ENSEIGNANT',
      schoolId: schoolDemo.id,
      phone: '+225 07 08 09 10 11',
      matricule: 'ENS-2026-MATH-ALT',
    }
  });

  const createdCourses: any[] = [];

  for (const m of matieresConfig) {
    const subject = await prisma.subject.upsert({
      where: {
        name_schoolId: {
          name: m.name,
          schoolId: schoolDemo.id,
        }
      },
      update: { code: m.code, coefficient: m.coef, isActive: true },
      create: { name: m.name, code: m.code, coefficient: m.coef, schoolId: schoolDemo.id, isActive: true },
    });

    const teacher = await prisma.user.create({
      data: {
        email: m.teacher.email,
        password: defaultPassword,
        firstName: m.teacher.first,
        lastName: m.teacher.last,
        gender: m.teacher.gender as any,
        role: 'ENSEIGNANT',
        schoolId: schoolDemo.id,
        phone: '+225 07 08 09 10 00',
        matricule: `ENS-2026-${m.code}`,
      }
    });

    await prisma.teacherClass.create({
      data: {
        teacherId: teacher.id,
        classId: class4A.id,
        subjectId: subject.id,
      }
    });

    const course = await prisma.course.create({
      data: {
        subjectId: subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        isPublished: true,
        coefficient: m.coef,
      }
    });

    createdCourses.push({ ...course, subject, teacher, coef: m.coef });
  }

  // ============================================
  // 11. Cours Détaillés, Chapitres, Devoirs et Évaluations
  // ============================================
  const mathCourse = createdCourses.find(c => c.subject.code === 'MATH');
  if (mathCourse) {
    const chap1 = await prisma.chapter.create({
      data: {
        title: "Chapitre 1 : Nombres Relatifs et Opérations",
        content: "Maîtriser l'addition, la soustraction, la multiplication et la division des nombres relatifs.",
        position: 1,
        courseId: mathCourse.id,
        termId: term1.id,
      }
    });

    const chap2 = await prisma.chapter.create({
      data: {
        title: "Chapitre 2 : Théorème de Pythagore",
        content: "Application directe du théorème dans un triangle rectangle et calcul de longueurs.",
        position: 2,
        courseId: mathCourse.id,
        termId: term2.id,
      }
    });

    // Exercice interactif
    const exercise = await prisma.chapterExercise.create({
      data: {
        title: "QCM d'auto-évaluation — Nombres Relatifs",
        description: "Répondez aux questions suivantes pour tester vos acquis.",
        chapterId: chap1.id,
        type: "QCM",
        createdById: mathCourse.teacher.id,
      }
    });

    const q1 = await prisma.exerciseQuestion.create({
      data: {
        exerciseId: exercise.id,
        text: "Quel est le résultat de (-8) + (+15) ?",
        type: "QCM",
        points: 10,
        position: 1,
      }
    });

    await prisma.exerciseOption.createMany({
      data: [
        { questionId: q1.id, text: "-23", isCorrect: false },
        { questionId: q1.id, text: "+7", isCorrect: true },
        { questionId: q1.id, text: "-7", isCorrect: false },
        { questionId: q1.id, text: "+23", isCorrect: false },
      ]
    });

    // Devoir Trimestre 1
    const devoirMathT1 = await prisma.assignment.create({
      data: {
        title: "Devoir surveillé N°1 — Nombres Relatifs & Calcul Littéral",
        description: "Épreuve sur table portant sur les chapitres 1 et 2.",
        type: "DEVOIR_CLASSE",
        dueDate: new Date('2026-10-15T10:00:00Z'),
        points: 20,
        coefficient: 1,
        courseId: mathCourse.id,
        subjectId: mathCourse.subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        termId: term1.id,
        createdById: mathCourse.teacher.id,
        correctorId: mathCourse.teacher.id,
      }
    });

    // Composition / Examen Trimestre 1
    const compoMathT1 = await prisma.assignment.create({
      data: {
        title: "Composition Trimestrielle N°1 — Mathématiques",
        description: "Épreuve officielle de fin de 1er trimestre.",
        type: "COMPO_NIVEAU",
        dueDate: new Date('2026-11-20T08:00:00Z'),
        points: 20,
        coefficient: 2,
        courseId: mathCourse.id,
        subjectId: mathCourse.subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        termId: term1.id,
        createdById: mathCourse.teacher.id,
        correctorId: mathCourse.teacher.id,
      }
    });

    // Devoir Trimestre 2
    await prisma.assignment.create({
      data: {
        title: "Devoir surveillé N°1 (T2) — Théorème de Pythagore",
        description: "Application du théorème et calcul de la réciproque.",
        type: "DEVOIR_CLASSE",
        dueDate: new Date('2027-02-10T14:00:00Z'),
        points: 20,
        coefficient: 1,
        courseId: mathCourse.id,
        subjectId: mathCourse.subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        termId: term2.id,
        createdById: mathCourse.teacher.id,
        correctorId: mathCourse.teacher.id,
      }
    });

    // Notes Trimestre 1 pour tous les élèves
    const studentGradesValues = [18, 15, 17, 12, 16, 14, 13, 15.5, 11, 19, 14];
    for (let i = 0; i < createdStudents.length; i++) {
      const s = createdStudents[i];
      const valDevoir = studentGradesValues[i];
      const valCompo = Math.min(20, Math.max(0, valDevoir + (i % 2 === 0 ? 0.5 : -1)));

      await prisma.grade.create({
        data: {
          value: valDevoir,
          type: "DEVOIR",
          studentId: s.id,
          courseId: mathCourse.id,
          assignmentId: devoirMathT1.id,
          termId: term1.id,
        }
      });

      await prisma.grade.create({
        data: {
          value: valCompo,
          type: "EVALUATION",
          studentId: s.id,
          courseId: mathCourse.id,
          assignmentId: compoMathT1.id,
          termId: term1.id,
        }
      });
    }
  }

  // Devoirs et notes pour les autres cours
  for (const c of createdCourses) {
    if (c.subject.code === 'MATH') continue;

    const devoir = await prisma.assignment.create({
      data: {
        title: `Devoir N°1 — ${c.subject.name}`,
        description: `Contrôle continu portant sur le premier module de ${c.subject.name}.`,
        type: "DEVOIR_CLASSE",
        dueDate: new Date('2026-10-22T09:00:00Z'),
        points: 20,
        coefficient: 1,
        courseId: c.id,
        subjectId: c.subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        termId: term1.id,
        createdById: c.teacher.id,
        correctorId: c.teacher.id,
      }
    });

    const compo = await prisma.assignment.create({
      data: {
        title: `Composition N°1 — ${c.subject.name}`,
        description: `Évaluation trimestrielle de ${c.subject.name}.`,
        type: "COMPO_NIVEAU",
        dueDate: new Date('2026-11-25T10:00:00Z'),
        points: 20,
        coefficient: 2,
        courseId: c.id,
        subjectId: c.subject.id,
        niveauId: niveauMap['4ème'].id,
        academicYearId: academicYear.id,
        termId: term1.id,
        createdById: c.teacher.id,
        correctorId: c.teacher.id,
      }
    });

    for (let i = 0; i < createdStudents.length; i++) {
      const s = createdStudents[i];
      const baseNote = 12 + ((i * 3 + c.coef * 2) % 8);
      const devoirNote = Math.min(20, Math.max(8, baseNote));
      const compoNote = Math.min(20, Math.max(8, baseNote + 1));

      await prisma.grade.create({
        data: {
          value: devoirNote,
          type: "DEVOIR",
          studentId: s.id,
          courseId: c.id,
          assignmentId: devoir.id,
          termId: term1.id,
        }
      });

      await prisma.grade.create({
        data: {
          value: compoNote,
          type: "EVALUATION",
          studentId: s.id,
          courseId: c.id,
          assignmentId: compo.id,
          termId: term1.id,
        }
      });
    }
  }

  // ============================================
  // 12. Bulletins Démo Trimestre 1 pour TOUS les élèves (Calculés avec Conduite)
  // ============================================
  console.log('📊 Génération des bulletins scolaires avec notes de conduite...');
  
  // Calcul réel des moyennes par élève
  const studentAveragesList: { studentId: string; avg: number }[] = [];

  for (const s of createdStudents) {
    // Calcul de la moyenne de chaque matière
    let totalWeighted = 0;
    let totalCoef = 0;

    for (const c of createdCourses) {
      const grades = await prisma.grade.findMany({
        where: { studentId: s.id, courseId: c.id, termId: term1.id }
      });
      if (grades.length > 0) {
        const sum = grades.reduce((acc, g) => acc + g.value, 0);
        const avg = sum / grades.length;
        totalWeighted += avg * c.coef;
        totalCoef += c.coef;
      }
    }

    // Ajout de la note de conduite comme matière à part entière (coef 1)
    if (s.conductNote !== undefined && s.conductNote !== null) {
      totalWeighted += s.conductNote * 1;
      totalCoef += 1;
    }

    const overallAvg = totalCoef > 0 ? parseFloat((totalWeighted / totalCoef).toFixed(2)) : 14.5;
    studentAveragesList.push({ studentId: s.id, avg: overallAvg });
  }

  // Tri par moyenne décroissante pour déterminer le rang
  studentAveragesList.sort((a, b) => b.avg - a.avg);

  for (let i = 0; i < studentAveragesList.length; i++) {
    const item = studentAveragesList[i];
    const studentData = createdStudents.find(s => s.id === item.studentId);
    const rang = i + 1;

    let appreciationDirecteur = "Bon travail d'ensemble. Continuez ainsi au 2ème trimestre.";
    if (item.avg >= 16) {
      appreciationDirecteur = "Excellent trimestre ! Félicitations et encouragements du conseil de classe.";
    } else if (item.avg >= 14) {
      appreciationDirecteur = "Très bon trimestre. Travail sérieux et régulier.";
    } else if (item.avg < 12) {
      appreciationDirecteur = "Des efforts sont nécessaires au 2ème trimestre pour consolider les acquis.";
    }

    await prisma.bulletinEleve.create({
      data: {
        studentId: item.studentId,
        classId: class4A.id,
        termId: term1.id,
        statut: 'VALIDE_DIRECTEUR',
        moyenneGenerale: item.avg,
        noteConduite: studentData?.conductNote || 16.0,
        rangClasse: rang,
        nombreEleves: createdStudents.length,
        totalAbsences: i % 3 === 0 ? 2 : 0,
        absencesJustifiees: i % 3 === 0 ? 2 : 0,
        commentaireEducateur: studentData?.conductAppr || "Conduite satisfaisante.",
        commentaireDirecteur: appreciationDirecteur,
        valideEducateurParId: educateur.id,
        valideEducateurAt: new Date('2026-11-28'),
        valideDirecteurParId: directeur.id,
        valideDirecteurAt: new Date('2026-11-30'),
      }
    });
  }

  // Bulletin de classe général
  const classAvg = parseFloat((studentAveragesList.reduce((acc, x) => acc + x.avg, 0) / studentAveragesList.length).toFixed(2));
  await prisma.bulletin.create({
    data: {
      classId: class4A.id,
      termId: term1.id,
      statut: 'VALIDE',
      moyenneClasse: classAvg,
      submittedById: educateur.id,
      submittedAt: new Date('2026-11-28'),
      validatedById: directeur.id,
      validatedAt: new Date('2026-11-30'),
    }
  });
  console.log(`📜 11 Bulletins individuels et bulletin de classe générés avec succès (Moyenne classe: ${classAvg}/20)`);

  // ============================================
  // 13. Bibliothèque Numérique 3.0 (Manuels & Annales)
  // ============================================
  const libraryDocs = [
    { title: "Manuel Numérique — Mathématiques 4ème (Édition SEEEC)", type: "PDF" as const, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { title: "Annales Corrigées du BEPC Côte d'Ivoire (2020-2025)", type: "PDF" as const, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { title: "Guide de Rédaction & Méthodologie du Français 4ème/3ème", type: "PDF" as const, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { title: "Atlas Géographique et Historique de l'Afrique de l'Ouest", type: "PDF" as const, url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
  ];

  for (const doc of libraryDocs) {
    await prisma.resource.create({
      data: {
        title: doc.title,
        type: doc.type,
        url: doc.url,
        isGlobal: true,
        niveauId: niveauMap['4ème'].id,
        createdById: superAdmin1.id,
      }
    });
  }

  // ============================================
  // 14. Flash News Globale pour tous les acteurs
  // ============================================
  await prisma.news.create({
    data: {
      title: "📢 Bienvenue sur SEEEC — Rentrée & Calendrier des Évaluations",
      content: "Chers élèves, professeurs et directeurs, la plateforme SEEEC est opérationnelle. Le calendrier des évaluations et devoirs du 2ème trimestre est synchronisé dans vos agendas scolaires respectifs.",
      schoolId: schoolDemo.id,
      authorId: directeur.id,
      isActive: true,
      priority: "HIGH",
      targetRoles: ["ALL"],
    }
  });

  console.log('\n=============================================================');
  console.log('🎉 INITIALISATION DÉMO "COMPLEXE SCOLAIRE D\'ABIDJAN" RÉUSSIE !');
  console.log('=============================================================');
  console.log('🏫 École : Complexe Scolaire d\'Abidjan (Abonnement Pack Pro ACTIF)');
  console.log('💎 Abonnements : 3 Packs Payants configurés (Standard: 75K, Pro: 150K, Élite: 250K FCFA)');
  console.log('🎓 Niveaux CI : 12 Niveaux officiels enregistrés (6ème à Terminale D)');
  console.log('👔 Directeur : Marc Koffi (directeur@ecole1.com / directeur1@ecole.ci)');
  console.log('👩‍💼 Éducatrice : Sylvie Bamba (educateur@ecole1.com)');
  console.log('👨‍🏫 Professeurs : 8 enseignants configurés (Math, Français, PC, SVT, HG, Anglais, EPS, EDHC)');
  console.log('🎓 Élèves : 11 apprenants en 4ème A avec notes de conduite et bulletins calculés');
  console.log('📚 Cours & Devoirs : Cours complets et devoirs synchronisés');
  console.log('📜 Bulletins & Conduite : 11 bulletins trimestriels validés avec conduite intégrée');
  console.log('📢 Flash News & Bibliothèque : Annonces et manuels SEEEC prêts');
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ Erreur seed:', error);
  process.exit(1);
});