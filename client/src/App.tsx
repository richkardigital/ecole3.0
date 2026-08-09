import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Login from '@/app/auth/login/page';
import Dashboard from '@/app/dashboard/page';
import Schools from '@/app/admin/schools/page';
import NewSchoolPage from '@/app/admin/schools/new/page';
import SchoolDetailsPage from '@/app/admin/schools/[id]/page';
import EditSchoolPage from '@/app/admin/schools/[id]/edit/page';
import Users from '@/app/admin/users/page';
import Classes from '@/app/admin/classes/page';
import NewClassPage from '@/app/admin/classes/new/page';
import ClassDetailsPage from '@/app/admin/classes/[id]/page';
import EditClassPage from '@/app/admin/classes/[id]/edit/page';
import Subjects from '@/app/admin/subjects/page';
import AcademicYears from '@/app/admin/academic-years/page';
import AcademicYearSchoolsPage from '@/app/admin/academic-years/[id]/schools/page';
import AcademicYearDetailsPage from '@/app/admin/academic-years/[id]/page';
import Courses from '@/app/academic/courses/page';
import CourseDetails from '@/app/academic/courses/details';
import AssignmentDetails from '@/app/academic/assignments/details';
import SubscriptionsPage from '@/app/admin/subscriptions/page';
import Library from '@/app/academic/library/page';
import AdminLibrary from '@/app/admin/library/page';
import NewLibraryDocumentPage from '@/app/admin/library/new/page';
import SharedResources from '@/app/academic/shared-resources/page';
import Agenda from '@/app/academic/agenda/page';
import EvaluationHub from '@/app/evaluation/page';
import Chat from '@/app/communication/chat/page';
import QuizTake from '@/app/evaluation/quizzes/take';
import QuizAttemptsList from '@/app/evaluation/quizzes/attempts-list';
import QuizAttemptDetail from '@/app/evaluation/quizzes/attempt-detail';
import NewQuizPage from '@/app/evaluation/quizzes/new/page';
import EditQuizPage from '@/app/evaluation/quizzes/edit/page';
import Broadcast from '@/app/communication/broadcast/page';
import Forum from '@/app/communication/forum/page';
import News from '@/app/communication/news/page';
import Meetings from '@/app/academic/meetings/page';
import Absences from '@/app/life/absences/page';
import Conduct from '@/app/life/conduct/page';
import Settings from '@/app/admin/settings/page';
import Corrections from '@/app/academic/corrections/page';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/layout/DashboardLayout';
import { VitrineLayout } from '@/components/layout/VitrineLayout';
import LandingPage from '@/app/vitrine/LandingPage';
import FeaturesPage from '@/app/vitrine/FeaturesPage';
import PricingPage from '@/app/vitrine/PricingPage';
import TestimonialsPage from '@/app/vitrine/TestimonialsPage';
import FaqPage from '@/app/vitrine/FaqPage';
import RegisterSchoolPage from '@/app/vitrine/RegisterSchoolPage';
import AboutPage from '@/app/vitrine/AboutPage';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';
import TeachingTypesPage from '@/app/admin/teaching-types/page';
import SchoolTypesPage from '@/app/admin/school-types/page';
import NiveauxPage from '@/app/admin/niveaux/page';
import NiveauDetailsPage from '@/app/admin/niveaux/[id]/page';
import SeecPage from '@/app/admin/seeec/page';
import AssignmentsPage from '@/app/academic/assignments/page';
import GlobalAssignmentsPage from '@/app/admin/assignments/page';
import NewGlobalAssignmentPage from '@/app/admin/assignments/new/page';
import GlobalAssignmentDetailsPage from '@/app/admin/assignments/[id]/page';
import EditGlobalAssignmentPage from '@/app/admin/assignments/[id]/edit/page';
import NewCourseAssignmentPage from '@/app/academic/assignments/new/course-assignment';
import ReportCards from '@/app/academic/report-cards/page';
import AcademicYearStatsPage from '@/app/admin/academic-years/[id]/stats/page';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Vitrine */}
              <Route path="/" element={<VitrineLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="a-propos" element={<AboutPage />} />
                <Route path="fonctionnalites" element={<FeaturesPage />} />
                <Route path="tarifs" element={<PricingPage />} />
                <Route path="temoignages" element={<TestimonialsPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="inscription" element={<RegisterSchoolPage />} />
              </Route>

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Route fallback pour accès non autorisé */}
              <Route path="/unauthorized" element={<Navigate to="/dashboard" replace />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  
                  {/* Common Dashboard fallback */}
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* ═══════════════════════════════════════════ */}
                  {/* SUPER ADMIN — Préfixe /admin/*               */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                    <Route path="/admin/dashboard" element={<Dashboard />} />
                    <Route path="/admin/schools" element={<Schools />} />
                    <Route path="/admin/schools/new" element={<NewSchoolPage />} />
                    <Route path="/admin/schools/:id" element={<SchoolDetailsPage />} />
                    <Route path="/admin/schools/:id/edit" element={<EditSchoolPage />} />
                    <Route path="/admin/teaching-types" element={<TeachingTypesPage />} />
                    <Route path="/admin/school-types" element={<SchoolTypesPage />} />
                    <Route path="/admin/academic-years" element={<AcademicYears />} />
                    <Route path="/admin/academic-years/:id" element={<AcademicYearDetailsPage />} />
                    <Route path="/admin/academic-years/:id/schools" element={<AcademicYearSchoolsPage />} />
                    <Route path="/admin/academic-years/:id/stats" element={<AcademicYearStatsPage />} />
                    <Route path="/admin/niveaux" element={<NiveauxPage />} />
                    <Route path="/admin/niveaux/:id" element={<NiveauDetailsPage />} />
                    <Route path="/admin/subjects" element={<Subjects />} />
                    <Route path="/admin/library" element={<AdminLibrary />} />
                    <Route path="/admin/library/new" element={<NewLibraryDocumentPage />} />
                    <Route path="/admin/shared-resources" element={<SharedResources />} />
                    <Route path="/admin/classes" element={<Classes />} />
                    <Route path="/admin/classes/new" element={<NewClassPage />} />
                    <Route path="/admin/classes/:id" element={<ClassDetailsPage />} />
                    <Route path="/admin/classes/:id/edit" element={<EditClassPage />} />
                    <Route path="/admin/users" element={<Users />} />
                    <Route path="/admin/courses" element={<Courses />} />
                    <Route path="/admin/courses/:id" element={<CourseDetails />} />
                    <Route path="/admin/assignments" element={<GlobalAssignmentsPage />} />
                    <Route path="/admin/assignments/new" element={<NewGlobalAssignmentPage />} />
                    <Route path="/admin/assignments/:id" element={<GlobalAssignmentDetailsPage />} />
                    <Route path="/admin/assignments/:id/edit" element={<EditGlobalAssignmentPage />} />
                    <Route path="/admin/report-cards" element={<ReportCards />} />
                    <Route path="/admin/seeec" element={<SeecPage />} />
                    <Route path="/admin/broadcast" element={<Broadcast />} />
                    <Route path="/admin/news" element={<News />} />
                    <Route path="/admin/absences" element={<Absences />} />
                    <Route path="/admin/conduct" element={<Conduct />} />
                    <Route path="/admin/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/admin/chat" element={<Chat />} />
                    <Route path="/admin/forum" element={<Forum />} />
                    <Route path="/admin/agenda" element={<Agenda />} />
                    <Route path="/admin/evaluations" element={<EvaluationHub />} />
                    <Route path="/admin/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* DIRECTEUR — Préfixe /directeur/*            */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTEUR']} />}>
                    <Route path="/directeur/dashboard" element={<Dashboard />} />
                    <Route path="/directeur/classes" element={<Classes />} />
                    <Route path="/directeur/classes/:id" element={<ClassDetailsPage />} />
                    <Route path="/directeur/classes/:id/edit" element={<EditClassPage />} />
                    <Route path="/directeur/users" element={<Users />} />
                    <Route path="/directeur/academic-years" element={<AcademicYears />} />
                    <Route path="/directeur/subjects" element={<Subjects />} />
                    <Route path="/directeur/courses" element={<Courses />} />
                    <Route path="/directeur/courses/:id" element={<CourseDetails />} />
                    <Route path="/directeur/report-cards" element={<ReportCards />} />
                    <Route path="/directeur/library" element={<AdminLibrary />} />
                    <Route path="/directeur/library/new" element={<NewLibraryDocumentPage />} />
                    <Route path="/directeur/absences" element={<Absences />} />
                    <Route path="/directeur/conduct" element={<Conduct />} />
                    <Route path="/directeur/broadcast" element={<Broadcast />} />
                    <Route path="/directeur/news" element={<News />} />
                    <Route path="/directeur/chat" element={<Chat />} />
                    <Route path="/directeur/forum" element={<Forum />} />
                    <Route path="/directeur/shared-resources" element={<SharedResources />} />
                    <Route path="/directeur/agenda" element={<Agenda />} />
                    <Route path="/directeur/evaluations" element={<EvaluationHub />} />
                    <Route path="/directeur/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* ENSEIGNANT — Préfixe /enseignant/*          */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENSEIGNANT']} />}>
                    <Route path="/enseignant/dashboard" element={<Dashboard />} />
                    <Route path="/enseignant/agenda" element={<Agenda />} />
                    <Route path="/enseignant/evaluations" element={<EvaluationHub />} />
                    <Route path="/enseignant/courses" element={<Courses />} />
                    <Route path="/enseignant/courses/:id" element={<CourseDetails />} />
                    <Route path="/enseignant/assignments" element={<AssignmentsPage />} />
                    <Route path="/enseignant/assignments/new" element={<NewGlobalAssignmentPage />} />
                    <Route path="/enseignant/assignments/:id" element={<AssignmentDetails />} />
                    <Route path="/enseignant/corrections" element={<Corrections />} />
                    <Route path="/enseignant/library" element={<AdminLibrary />} />
                    <Route path="/enseignant/library/new" element={<NewLibraryDocumentPage />} />
                    <Route path="/enseignant/report-cards" element={<ReportCards />} />
                    <Route path="/enseignant/courses/:courseId/quizzes/new" element={<NewQuizPage />} />
                    <Route path="/enseignant/courses/:courseId/assignments/new" element={<NewCourseAssignmentPage />} />
                    <Route path="/enseignant/courses/:courseId/quizzes/:quizId/edit" element={<EditQuizPage />} />
                    <Route path="/enseignant/chat" element={<Chat />} />
                    <Route path="/enseignant/forum" element={<Forum />} />
                    <Route path="/enseignant/shared-resources" element={<SharedResources />} />
                    <Route path="/enseignant/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* EDUCATEUR — Préfixe /educateur/*            */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'EDUCATEUR']} />}>
                    <Route path="/educateur/dashboard" element={<Dashboard />} />
                    <Route path="/educateur/agenda" element={<Agenda />} />
                    <Route path="/educateur/evaluations" element={<EvaluationHub />} />
                    <Route path="/educateur/absences" element={<Absences />} />
                    <Route path="/educateur/conduct" element={<Conduct />} />
                    <Route path="/educateur/classes" element={<Classes />} />
                    <Route path="/educateur/users" element={<Users />} />
                    <Route path="/educateur/courses" element={<Courses />} />
                    <Route path="/educateur/report-cards" element={<ReportCards />} />
                    <Route path="/educateur/chat" element={<Chat />} />
                    <Route path="/educateur/broadcast" element={<Broadcast />} />
                    <Route path="/educateur/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* APPRENANT / UNPREFIXED ROUTES (Accès direct)  */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTEUR', 'EDUCATEUR', 'ENSEIGNANT', 'APPRENANT']} />}>
                    <Route path="classes" element={<Classes />} />
                    <Route path="users" element={<Users />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="broadcast" element={<Broadcast />} />
                    <Route path="news" element={<News />} />
                    <Route path="absences" element={<Absences />} />
                    <Route path="conduct" element={<Conduct />} />
                    <Route path="library" element={<AdminLibrary />} />
                    
                    {/* Académique */}
                    <Route path="courses" element={<Courses />} />
                    <Route path="courses/:id" element={<CourseDetails />} />
                    <Route path="assignments" element={<AssignmentsPage />} />
                    <Route path="assignments/:id" element={<AssignmentDetails />} />
                    <Route path="report-cards" element={<ReportCards />} />
                    <Route path="corrections" element={<Corrections />} />

                    {/* Réseau */}
                    <Route path="seeec" element={<SeecPage />} />

                    {/* Communication & Quiz */}
                    <Route path="chat" element={<Chat />} />
                    <Route path="forum" element={<Forum />} />
                    <Route path="meetings" element={<Meetings />} />
                    <Route path="quizzes/:id" element={<QuizTake />} />
                    <Route path="quizzes/:id/attempts" element={<QuizAttemptsList />} />
                    <Route path="quizzes/attempts/:id" element={<QuizAttemptDetail />} />
                    <Route path="shared-resources" element={<SharedResources />} />
                    <Route path="agenda" element={<Agenda />} />
                    <Route path="evaluations" element={<EvaluationHub />} />
                  </Route>

                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
