import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Login from '@/app/auth/login/page';
import Dashboard from '@/app/dashboard/page';
import Schools from '@/app/admin/schools/page';
import Users from '@/app/admin/users/page';
import Classes from '@/app/admin/classes/page';
import Subjects from '@/app/admin/subjects/page';
import AcademicYears from '@/app/admin/academic-years/page';
import Courses from '@/app/academic/courses/page';
import CourseDetails from '@/app/academic/courses/details';
import AssignmentDetails from '@/app/academic/assignments/details';
import StudentReportCards from '@/app/academic/report-cards/page';
import Library from '@/app/academic/library/page';
import SharedResources from '@/app/academic/shared-resources/page';
import Agenda from '@/app/academic/agenda/page';
import Chat from '@/app/communication/chat/page';
import QuizTake from '@/app/evaluation/quizzes/take';
import QuizAttemptsList from '@/app/evaluation/quizzes/attempts-list';
import QuizAttemptDetail from '@/app/evaluation/quizzes/attempt-detail';
import Broadcast from '@/app/communication/broadcast/page';
import Forum from '@/app/communication/forum/page';
import News from '@/app/communication/news/page';
import Meetings from '@/app/academic/meetings/page';
import Absences from '@/app/life/absences/page';
import Conduct from '@/app/life/conduct/page';
import Settings from '@/app/admin/settings/page';
import AuditLogs from '@/app/admin/audit-logs/page';
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
import NiveauxPage from '@/app/admin/niveaux/page';
import SeecPage from '@/app/admin/seec/page';
import AssignmentsPage from '@/app/academic/assignments/page';
import ReportCards from '@/app/academic/report-cards/page';

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
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                    <Route path="/admin/teaching-types" element={<TeachingTypesPage />} />
                    <Route path="/admin/academic-years" element={<AcademicYears />} />
                    <Route path="/admin/niveaux" element={<NiveauxPage />} />
                    <Route path="/admin/subjects" element={<Subjects />} />
                    <Route path="/admin/library" element={<Library />} />
                    <Route path="/admin/classes" element={<Classes />} />
                    <Route path="/admin/users" element={<Users />} />
                    <Route path="/admin/courses" element={<Courses />} />
                    <Route path="/admin/courses/:id" element={<CourseDetails />} />
                    <Route path="/admin/assignments" element={<AssignmentsPage />} />
                    <Route path="/admin/assignments/:id" element={<AssignmentDetails />} />
                    <Route path="/admin/report-cards" element={<ReportCards />} />
                    <Route path="/admin/seec" element={<SeecPage />} />
                    <Route path="/admin/broadcast" element={<Broadcast />} />
                    <Route path="/admin/news" element={<News />} />
                    <Route path="/admin/absences" element={<Absences />} />
                    <Route path="/admin/conduct" element={<Conduct />} />
                    <Route path="/admin/chat" element={<Chat />} />
                    <Route path="/admin/forum" element={<div>Forum (À venir)</div>} />
                    <Route path="/admin/agenda" element={<Agenda />} />
                    <Route path="/admin/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* DIRECTEUR — Préfixe /directeur/*            */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'DIRECTEUR']} />}>
                    <Route path="/directeur/dashboard" element={<Dashboard />} />
                    <Route path="/directeur/classes" element={<Classes />} />
                    <Route path="/directeur/users" element={<Users />} />
                    <Route path="/directeur/academic-years" element={<AcademicYears />} />
                    <Route path="/directeur/subjects" element={<Subjects />} />
                    <Route path="/directeur/courses" element={<Courses />} />
                    <Route path="/directeur/courses/:id" element={<CourseDetails />} />
                    <Route path="/directeur/report-cards" element={<ReportCards />} />
                    <Route path="/directeur/library" element={<Library />} />
                    <Route path="/directeur/absences" element={<Absences />} />
                    <Route path="/directeur/conduct" element={<Conduct />} />
                    <Route path="/directeur/broadcast" element={<Broadcast />} />
                    <Route path="/directeur/news" element={<News />} />
                    <Route path="/directeur/chat" element={<Chat />} />
                    <Route path="/directeur/forum" element={<div>Forum (À venir)</div>} />
                    <Route path="/directeur/shared-resources" element={<SharedResources />} />
                    <Route path="/directeur/agenda" element={<Agenda />} />
                    <Route path="/directeur/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* ENSEIGNANT — Préfixe /enseignant/*          */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ENSEIGNANT']} />}>
                    <Route path="/enseignant/dashboard" element={<Dashboard />} />
                    <Route path="/enseignant/agenda" element={<Agenda />} />
                    <Route path="/enseignant/courses" element={<Courses />} />
                    <Route path="/enseignant/courses/:id" element={<CourseDetails />} />
                    <Route path="/enseignant/assignments" element={<AssignmentsPage />} />
                    <Route path="/enseignant/assignments/:id" element={<AssignmentDetails />} />
                    <Route path="/enseignant/corrections" element={<Corrections />} />
                    <Route path="/enseignant/library" element={<Library />} />
                    <Route path="/enseignant/report-cards" element={<ReportCards />} />
                    <Route path="/enseignant/chat" element={<Chat />} />
                    <Route path="/enseignant/forum" element={<div>Forum (À venir)</div>} />
                    <Route path="/enseignant/shared-resources" element={<SharedResources />} />
                    <Route path="/enseignant/settings" element={<Settings />} />
                  </Route>

                  {/* ═══════════════════════════════════════════ */}
                  {/* EDUCATEUR — Préfixe /educateur/*            */}
                  {/* ═══════════════════════════════════════════ */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'EDUCATEUR']} />}>
                    <Route path="/educateur/dashboard" element={<Dashboard />} />
                    <Route path="/educateur/agenda" element={<Agenda />} />
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
                    <Route path="library" element={<Library />} />
                    
                    {/* Académique */}
                    <Route path="courses" element={<Courses />} />
                    <Route path="courses/:id" element={<CourseDetails />} />
                    <Route path="assignments" element={<AssignmentsPage />} />
                    <Route path="assignments/:id" element={<AssignmentDetails />} />
                    <Route path="report-cards" element={<ReportCards />} />
                    <Route path="corrections" element={<Corrections />} />

                    {/* Réseau */}
                    <Route path="seec" element={<SeecPage />} />

                    {/* Communication & Quiz */}
                    <Route path="chat" element={<Chat />} />
                    <Route path="forum" element={<div>Forum (À venir)</div>} />
                    <Route path="meetings" element={<Meetings />} />
                    <Route path="quizzes/:id" element={<QuizTake />} />
                    <Route path="quizzes/:id/attempts" element={<QuizAttemptsList />} />
                    <Route path="quizzes/attempts/:id" element={<QuizAttemptDetail />} />
                    <Route path="shared-resources" element={<SharedResources />} />
                    <Route path="agenda" element={<Agenda />} />
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
