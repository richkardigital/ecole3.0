/**
 * Seed de la base de données.
 * Crée la structure initiale globale et une École Démo 100% complète et fonctionnelle :
 * - Super Admins (Platform Super Administrators) préservés
 * - Types d'enseignement & Types d'établissement
 * - École Démo ("Complexe Scolaire Excellence d'Abidjan")
 * - Directeur, Éducateur, 8 Enseignants, 10 Élèves (4ème A)
 * - Année académique (2026-2027) + 3 Trimestres
 * - Matières, Cours, Chapitres publiés & Devoirs
 *
 * Usage : node --loader ts-node/esm prisma/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log('🚀 Démarrage de l\'initialisation de la base de données (Nettoyage & Re-Seed)...\n');

  // ============================================
  // 0. Nettoyage de la base (sauf Super Admins et Types)
  // ============================================
  console.log('🧹 Nettoyage des anciennes données...');
  await prisma.chapter.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.teacherClass.deleteMany();
  await prisma.course.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.news.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.niveau.deleteMany();
  
  // Tables associées à l'utilisateur
  await prisma.message.deleteMany();
  await prisma.forumComment.deleteMany();
  await prisma.forumPost.deleteMany();
  await prisma.bulletinEleve.deleteMany();
  await prisma.bulletin.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.absence.deleteMany();
  await prisma.conduct.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.meeting.deleteMany();
  
  // Detach managers from schools to avoid foreign key issues when deleting users
  await prisma.school.updateMany({ data: { managerId: null } });
  
  await prisma.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } });
  await prisma.school.deleteMany();
  console.log('🧹 Nettoyage terminé.');

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
  // 3. École Démo
  // ============================================
  const schoolDemo = await prisma.school.create({
    data: {
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
    }
  });

  // ============================================
  // 4. Acteurs (Direction & Éducateur)
  // ============================================
  const directeur = await prisma.user.create({
    data: {
      email: 'directeur@ecole1.com',
      password: defaultPassword,
      firstName: 'Marc',
      lastName: 'Koffi',
      role: 'DIRECTEUR',
      schoolId: schoolDemo.id,
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
    }
  });

  // ============================================
  // 5. Niveaux scolaires & Classe (4ème A)
  // ============================================
  const niveau4eme = await prisma.niveau.create({
    data: { nom: '4ème', rang: 22, schoolId: schoolDemo.id }
  });

  // ============================================
  // 6. Année académique 2026-2027 + Trimestres
  // ============================================
  const academicYear = await prisma.academicYear.create({
    data: {
      name: '2026-2027',
      startDate: new Date('2026-08-09'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
      schools: { connect: { id: schoolDemo.id } },
    }
  });

  const terms = [
    { name: 'Trimestre 1', startDate: new Date('2026-08-09'), endDate: new Date('2026-11-30'), status: 'CLOSED' as const },
    { name: 'Trimestre 2', startDate: new Date('2026-12-01'), endDate: new Date('2027-03-15'), status: 'OPEN' as const },
    { name: 'Trimestre 3', startDate: new Date('2027-03-16'), endDate: new Date('2027-06-30'), status: 'CLOSED' as const },
  ];

  for (const t of terms) {
    const termId = `term-demo-${t.name.replace(/\s/g, '-').toLowerCase()}-${schoolDemo.id.slice(0, 8)}`;
    await prisma.term.create({
      data: {
        id: termId,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status,
        academicYearId: academicYear.id,
      }
    });
  }

  const class4A = await prisma.class.create({
    data: {
      name: '4ème A',
      schoolId: schoolDemo.id,
      niveauId: niveau4eme.id,
      academicYearId: academicYear.id,
    }
  });

  // ============================================
  // 7. Élèves de 4ème A
  // ============================================
  const elevesData = [
    { firstName: "Amani", lastName: "Kouadio Jean", email: "amani.jean@ecole.ci", gender: "MASCULIN" },
    { firstName: "Bamba", lastName: "Fatoumata", email: "bamba.f@ecole.ci", gender: "FEMININ" },
    { firstName: "Cissé", lastName: "Ibrahim", email: "cisse.ib@ecole.ci", gender: "MASCULIN" },
    { firstName: "Diarrassouba", lastName: "Aïcha", email: "diarra.a@ecole.ci", gender: "FEMININ" },
    { firstName: "Koffi", lastName: "Ahou Grace", email: "koffi.grace@ecole.ci", gender: "FEMININ" },
    { firstName: "Koné", lastName: "Aboubacar", email: "kone.abou@ecole.ci", gender: "MASCULIN" },
    { firstName: "N'Guessan", lastName: "Yao Cédric", email: "nguessan.cedric@ecole.ci", gender: "MASCULIN" },
    { firstName: "Ouattara", lastName: "Salif", email: "ouattara.salif@ecole.ci", gender: "MASCULIN" },
    { firstName: "Sylla", lastName: "Mariam", email: "sylla.m@ecole.ci", gender: "FEMININ" },
    { firstName: "Touré", lastName: "Oumar", email: "toure.oumar@ecole.ci", gender: "MASCULIN" },
    { firstName: "Test", lastName: "Élève", email: "apprenant@ecole1.com", gender: "MASCULIN" } // Pour le bouton de démo
  ];

  const elevePassword = await bcrypt.hash('Eleve2026!', 10);
  const demoElevePassword = await bcrypt.hash('password123', 10);

  for (let i = 0; i < elevesData.length; i++) {
    const e = elevesData[i];
    const user = await prisma.user.create({
      data: {
        email: e.email,
        password: e.email === 'apprenant@ecole1.com' ? demoElevePassword : elevePassword,
        firstName: e.firstName,
        lastName: e.lastName,
        gender: e.gender as any,
        role: 'APPRENANT',
        schoolId: schoolDemo.id,
        matricule: `MAT-2026-4A${(i + 1).toString().padStart(2, '0')}`
      }
    });

    await prisma.enrollment.create({
      data: {
        studentId: user.id,
        classId: class4A.id,
        matricule: user.matricule || `MAT-2026-4A${(i + 1).toString().padStart(2, '0')}`,
      }
    });
  }

  // ============================================
  // 8. Matières & Professeurs
  // ============================================
  const profPassword = await bcrypt.hash('ProfTest26!', 10);
  const demoProfPassword = await bcrypt.hash('password123', 10);

  const profsData = [
    { firstName: "Soro", lastName: "Guillaume", email: "enseignant@ecole1.com", gender: "MASCULIN", subject: "Mathématiques", code: "MATH", coef: 4 }, // Démo
    { firstName: "Kouamé", lastName: "Akissi", email: "kouame.svt@ecole.ci", gender: "FEMININ", subject: "SVT", code: "SVT", coef: 2 },
    { firstName: "Bakayoko", lastName: "Youssouf", email: "bakayoko.pc@ecole.ci", gender: "MASCULIN", subject: "Physique-Chimie", code: "PC", coef: 2 },
    { firstName: "Dosso", lastName: "Mamoudou", email: "dosso.hg@ecole.ci", gender: "MASCULIN", subject: "Histoire-Géo", code: "HG", coef: 2 },
    { firstName: "Yao", lastName: "Affoué", email: "yao.francais@ecole.ci", gender: "FEMININ", subject: "Français", code: "FRA", coef: 4 },
    { firstName: "Traoré", lastName: "Seydou", email: "traore.anglais@ecole.ci", gender: "MASCULIN", subject: "Anglais", code: "ANG", coef: 2 },
    { firstName: "Zadi", lastName: "Franck", email: "zadi.eps@ecole.ci", gender: "MASCULIN", subject: "EPS", code: "EPS", coef: 1 },
    { firstName: "Fofana", lastName: "Aminata", email: "fofana.edhc@ecole.ci", gender: "FEMININ", subject: "EDHC", code: "EDHC", coef: 1 },
  ];

  for (const p of profsData) {
    // Créer la matière
    const subject = await prisma.subject.create({
      data: { name: p.subject, code: p.code, coefficient: p.coef, schoolId: schoolDemo.id }
    });

    // Créer le professeur
    const prof = await prisma.user.create({
      data: {
        email: p.email,
        password: p.email === 'enseignant@ecole1.com' ? demoProfPassword : profPassword,
        firstName: p.firstName,
        lastName: p.lastName,
        gender: p.gender as any,
        role: 'ENSEIGNANT',
        schoolId: schoolDemo.id,
      }
    });

    // Créer le cours
    const course = await prisma.course.create({
      data: {
        classId: class4A.id,
        subjectId: subject.id,
        teacherId: prof.id,
        coefficient: subject.coefficient,
      }
    });

    // Assigner TeacherClass
    await prisma.teacherClass.create({
      data: { teacherId: prof.id, classId: class4A.id, subjectId: subject.id }
    });

    // Ajouter des leçons et quiz de test
    await prisma.chapter.create({
      data: {
        title: `Introduction à ${p.subject}`,
        content: `Contenu du cours introductif de ${p.subject} pour la classe de 4ème A.`,
        courseId: course.id,
      }
    });

    await prisma.assignment.create({
      data: {
        title: `Devoir 1 - ${p.subject}`,
        description: 'Évaluation sur les premières notions du trimestre.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        courseId: course.id,
        coefficient: p.coef,
        points: 20,
      }
    });
  }

  console.log('\n=============================================================');
  console.log('🎉 POPULATION DE LA DB ET AFFECTATIONS 4ème A RÉUSSIES ! 🎉');
  console.log('=============================================================');
  console.log('🏫 École : Complexe Scolaire Excellence d\'Abidjan (2026-2027)');
  console.log('👨‍🏫 Professeurs : 8 enseignants affectés avec leurs matières');
  console.log('🎓 Élèves inscrits : 11 élèves en 4ème A (dont compte démo)');
  console.log('=============================================================\n');

  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error('❌ Erreur seed:', error);
  process.exit(1);
});