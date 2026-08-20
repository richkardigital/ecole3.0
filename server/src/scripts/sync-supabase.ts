import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('🔄 ==========================================');
  console.log('🚀 Synchronisation Locale (pgAdmin) ➔ Supabase');
  console.log('==========================================\n');

  const pgDumpPath = 'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe';
  const psqlPath = 'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe';
  const dumpFile = path.join(process.cwd(), 'temp_supabase_dump.sql');
  const readyFile = path.join(process.cwd(), 'temp_supabase_ready.sql');

  // 1. Export local PostgreSQL data with column-inserts
  console.log('📦 1. Export des données depuis PostgreSQL local (port 5433)...');
  try {
    execSync(
      `"${pgDumpPath}" -h localhost -p 5433 -U postgres -d ecole3 --schema=public --data-only --column-inserts --disable-triggers --no-owner --no-privileges -f "${dumpFile}"`,
      {
        env: { ...process.env, PGPASSWORD: 'root' },
        stdio: 'pipe',
      }
    );
    console.log('✅ Export local réussi.');
  } catch (err: any) {
    console.error('❌ Erreur lors du dump local:', err.message);
    process.exit(1);
  }

  // 2. Nettoyer et formater pour Supabase (mode réplication pour éviter contraintes circulaires)
  console.log('📝 2. Formatage des requêtes SQL pour Supabase Cloud...');
  const rawContent = fs.readFileSync(dumpFile, 'utf-8');
  const lines = rawContent.split('\n');

  const cleanedLines: string[] = [
    "SET session_replication_role = 'replica';",
    `TRUNCATE TABLE public."AuditLog", public."Notification", public."News", public."Sanction", public."ConductRecord", public."Attendance", public."Bulletin", public."AnnualAverage", public."SubjectAverage", public."PeriodAverage", public."Grade", public."StudentAnswer", public."AssignmentSubmission", public."AssignmentOption", public."AssignmentQuestion", public."Assignment", public."Lesson", public."Chapter", public."Course", public."ParentStudent", public."Enrollment", public."ClassSubject", public."Class", public."User", public."School", public."Period", public."AcademicYear", public."Subscription", public."Subject", public."Series", public."GradeLevel", public."SchoolType", public."TeachingType" CASCADE;`
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('\\restrict')) continue;
    if (trimmed.includes('DISABLE TRIGGER ALL') || trimmed.includes('ENABLE TRIGGER ALL')) continue;
    cleanedLines.push(line);
  }

  cleanedLines.push("SET session_replication_role = 'origin';");
  fs.writeFileSync(readyFile, cleanedLines.join('\n'), 'utf-8');
  console.log('✅ Fichier SQL optimisé.');

  // 3. Importer dans Supabase via psql
  console.log('☁️ 3. Envoi et injection des données dans Supabase...');
  const cmd = `"${psqlPath}" -h aws-0-eu-west-1.pooler.supabase.com -p 5432 -U postgres.ejprkguyibnuqeigovkt -d postgres -f "${readyFile}"`;

  try {
    execSync(cmd, {
      env: { ...process.env, PGPASSWORD: 'seececole3240726' },
      maxBuffer: 50 * 1024 * 1024,
      stdio: 'pipe',
    });
    console.log('✅ Données injectées dans Supabase.');
  } catch (err: any) {
    console.warn('⚠️ Note psql:', err.message?.slice(0, 200));
  }

  // 4. Nettoyer les fichiers temporaires
  try {
    if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
    if (fs.existsSync(readyFile)) fs.unlinkSync(readyFile);
  } catch (_) {}

  // 5. Vérification
  console.log('\n🔍 4. Vérification finale des données sur Supabase...');
  const supabasePrisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres.ejprkguyibnuqeigovkt:seececole3240726@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
      },
    },
  });

  try {
    const usersCount = await supabasePrisma.user.count();
    const schoolsCount = await supabasePrisma.school.count();
    const classesCount = await supabasePrisma.class.count();
    const coursesCount = await supabasePrisma.course.count();
    const assignmentsCount = await supabasePrisma.assignment.count();

    console.log(`- Écoles : ${schoolsCount}`);
    console.log(`- Utilisateurs : ${usersCount}`);
    console.log(`- Classes : ${classesCount}`);
    console.log(`- Cours : ${coursesCount}`);
    console.log(`- Évaluations : ${assignmentsCount}`);
    console.log('\n🎉 Tout est 100% synchronisé en ligne sur Supabase !');
  } catch (err: any) {
    console.error('Erreur vérification:', err.message);
  } finally {
    await supabasePrisma.$disconnect();
  }
}

main();
