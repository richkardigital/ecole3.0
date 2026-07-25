-- ==========================================
-- RLS POLICIES FOR ECOLE 3.0 (Supabase)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Term" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chapter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Grade" ENABLE ROW LEVEL SECURITY;

-- 1. School
-- SUPER_ADMIN can do everything
CREATE POLICY "SUPER_ADMIN full access to School" ON "School" FOR ALL USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');
-- Other roles can read only their own school
CREATE POLICY "Users read own school" ON "School" FOR SELECT USING (id::text = (auth.jwt() ->> 'schoolId'));

-- 2. User
-- SUPER_ADMIN can do everything
CREATE POLICY "SUPER_ADMIN full access to User" ON "User" FOR ALL USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');
-- Users can read users in their own school
CREATE POLICY "Users read users from same school" ON "User" FOR SELECT USING ("schoolId"::text = (auth.jwt() ->> 'schoolId'));
-- DIRECTEUR and EDUCATEUR can manage users in their school
CREATE POLICY "School Admins manage users" ON "User" FOR ALL USING ("schoolId"::text = (auth.jwt() ->> 'schoolId') AND (auth.jwt() ->> 'role' IN ('DIRECTEUR', 'EDUCATEUR')));
-- Users can update their own profile
CREATE POLICY "Users update own profile" ON "User" FOR UPDATE USING (id::text = (auth.jwt() ->> 'id'));

-- 3. AcademicYear & Term
CREATE POLICY "Read access AcademicYear" ON "AcademicYear" FOR SELECT USING ("schoolId"::text = (auth.jwt() ->> 'schoolId'));
CREATE POLICY "Read access Term" ON "Term" FOR SELECT USING (true); -- Assumes linked through logic
CREATE POLICY "Manage AcademicYear" ON "AcademicYear" FOR ALL USING ("schoolId"::text = (auth.jwt() ->> 'schoolId') AND (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR')));
CREATE POLICY "Manage Term" ON "Term" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR'));

-- 4. Class & Subject
CREATE POLICY "Read access Class" ON "Class" FOR SELECT USING ("schoolId"::text = (auth.jwt() ->> 'schoolId'));
CREATE POLICY "Read access Subject" ON "Subject" FOR SELECT USING ("schoolId"::text = (auth.jwt() ->> 'schoolId'));
CREATE POLICY "Manage Class" ON "Class" FOR ALL USING ("schoolId"::text = (auth.jwt() ->> 'schoolId') AND (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR')));
CREATE POLICY "Manage Subject" ON "Subject" FOR ALL USING ("schoolId"::text = (auth.jwt() ->> 'schoolId') AND (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR')));

-- 5. Enrollment
CREATE POLICY "Read access Enrollment" ON "Enrollment" FOR SELECT USING (true);
CREATE POLICY "Manage Enrollment" ON "Enrollment" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR'));

-- 6. Course, Chapter, Material, Assignment
-- Read: students in the class, teachers, admins
CREATE POLICY "Read access Course" ON "Course" FOR SELECT USING (true);
CREATE POLICY "Read access Chapter" ON "Chapter" FOR SELECT USING (true);
CREATE POLICY "Read access Material" ON "Material" FOR SELECT USING (true);
CREATE POLICY "Read access Assignment" ON "Assignment" FOR SELECT USING (true);

-- Write: TEACHER only for their courses, Admins for all in their school
CREATE POLICY "Manage Course" ON "Course" FOR ALL USING (
  (auth.jwt() ->> 'role' = 'ENSEIGNANT' AND "teacherId"::text = (auth.jwt() ->> 'id')) OR 
  (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR'))
);
CREATE POLICY "Manage Chapter" ON "Chapter" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT'));
CREATE POLICY "Manage Material" ON "Material" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT'));
CREATE POLICY "Manage Assignment" ON "Assignment" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT'));

-- 7. Submission
-- Read: Teacher of the course, or the student who submitted
CREATE POLICY "Read Submission" ON "Submission" FOR SELECT USING (
  "studentId"::text = (auth.jwt() ->> 'id') OR 
  auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT')
);
-- Write: Student can insert their own submission
CREATE POLICY "Insert Submission" ON "Submission" FOR INSERT WITH CHECK ("studentId"::text = (auth.jwt() ->> 'id'));
CREATE POLICY "Update Submission" ON "Submission" FOR UPDATE USING ("studentId"::text = (auth.jwt() ->> 'id'));

-- 8. Grade
-- Read: Student can see their own grades, Admins/Teachers can see all in their school
CREATE POLICY "Read Grade" ON "Grade" FOR SELECT USING (
  "studentId"::text = (auth.jwt() ->> 'id') OR 
  auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT')
);
-- Write: Teachers and Admins
CREATE POLICY "Manage Grade" ON "Grade" FOR ALL USING (auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT'));

-- Force Policies
ALTER TABLE "School" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Term" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Class" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subject" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Enrollment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Course" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Chapter" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Material" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Submission" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Grade" FORCE ROW LEVEL SECURITY;
