'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { 
  ArrowLeft, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Key, 
  ArrowRightLeft, 
  Edit2, 
  Upload, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Download, 
  Search, 
  UserMinus,
  Mail,
  Phone,
  School,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  UserCheck,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  matricule?: string;
  phone?: string;
  avatarUrl?: string;
  gender?: string;
  enrollmentId?: string;
  enrollmentStatus?: string;
  joinedAt?: string;
}

interface TeacherClassAssignment {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    matricule?: string;
  };
  subject?: {
    id: string;
    name: string;
    code?: string;
    coefficient?: number;
  };
}

interface CourseItem {
  id: string;
  title: string;
  description?: string;
  subject?: { id: string; name: string };
  niveau?: { id: string; nom: string };
  _count?: {
    chapters: number;
    assignments: number;
    quizzes: number;
  };
}

export default function ClassDetailsPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'EDUCATEUR' ? '/educateur' : '/directeur';
  
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const classId = params.id as string;
  
  // Tab sync with URL parameter: 'students' | 'teachers' | 'courses'
  const currentTab = (searchParams.get('tab') as 'students' | 'teachers' | 'courses') || 'students';
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'courses'>(currentTab);

  const handleTabChange = (tab: 'students' | 'teachers' | 'courses') => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      p.set('tab', tab);
      return p;
    });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'students' || tabParam === 'teachers' || tabParam === 'courses') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [cls, setCls] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherClassAssignment[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Student selection & filters
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [addStudentSearch, setAddStudentSearch] = useState('');
  const [newSelectedStudentIds, setNewSelectedStudentIds] = useState<string[]>([]);

  // Teacher assignment states
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [teacherFilterSearch, setTeacherFilterSearch] = useState('');
  const [subjectFilterSearch, setSubjectFilterSearch] = useState('');
  
  // Import states
  const [isImportingMode, setIsImportingMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Transfer & Migration Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<Student | null>(null);
  const [isBulkTransfer, setIsBulkTransfer] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [isTransferLoading, setIsTransferLoading] = useState(false);
  
  // Reset Password Modal
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Remove Student Modal
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);

  const fetchClassData = async () => {
    try {
      const [classRes, studentsRes, coursesRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/classes/${classId}/students`),
        api.get(`/classes/${classId}/courses`).catch(() => ({ data: [] }))
      ]);
      
      const currentClass = classRes.data;
      if (!currentClass) {
        navigate(`${basePath}/classes`);
        return;
      }

      setCls(currentClass);
      setStudents(studentsRes.data || []);
      setTeacherAssignments(currentClass.teacherClasses || []);
      setCourses(coursesRes.data || currentClass.niveau?.courses || []);
    } catch (error) {
      console.error('Error fetching class details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (classId) fetchClassData();
  }, [classId]);

  const fetchAllStudents = async () => {
    try {
      const response = await api.get('/users?role=APPRENANT');
      setAllStudents(response.data);
    } catch (error) {
      console.error('Error fetching all students', error);
    }
  };

  const fetchTeachersAndSubjects = async () => {
    try {
      const [techRes, subjRes] = await Promise.all([
        api.get('/users?role=ENSEIGNANT'),
        api.get('/subjects')
      ]);
      setAllTeachers(techRes.data);
      setAllSubjects(subjRes.data);
    } catch (err) {
      console.error('Error fetching teachers and subjects', err);
    }
  };

  const fetchAllClasses = async () => {
    try {
      const res = await api.get(`/classes`);
      setAllClasses(res.data);
    } catch (err) {
      console.error('Error fetching all classes', err);
    }
  };

  // ── ASSIGN TEACHER TO SUBJECT ──
  const handleAssignTeacher = async () => {
    if (!selectedTeacherId || !selectedSubjectId) return;
    try {
      await api.post('/classes/assign-teacher', {
        classId,
        teacherId: selectedTeacherId,
        subjectId: selectedSubjectId
      });
      await fetchClassData();
      setIsAssigningTeacher(false);
      setSelectedTeacherId('');
      setSelectedSubjectId('');
    } catch (error: any) {
      console.error('Error assigning teacher', error);
      alert(error.response?.data?.message || "Erreur lors de l'affectation de l'enseignant.");
    }
  };

  const handleUnassignTeacher = async (assignmentId: string) => {
    if (!confirm("Voulez-vous vraiment retirer cette affectation ? L'enseignant conservera son compte et ses autres cours.")) return;
    try {
      await api.post('/classes/unassign-teacher', {
        teacherClassId: assignmentId
      });
      await fetchClassData();
    } catch (error: any) {
      console.error("Error unassigning teacher", error);
      alert(error.response?.data?.message || "Erreur lors du retrait de l'affectation.");
    }
  };

  // ── ENROLL STUDENTS ──
  const handleEnrollSelectedStudents = async () => {
    if (newSelectedStudentIds.length === 0) return;
    try {
      await Promise.all(
        newSelectedStudentIds.map(studentId => 
          api.post('/classes/enroll', { classId, studentId })
        )
      );
      await fetchClassData();
      setIsAddingStudent(false);
      setNewSelectedStudentIds([]);
      setAddStudentSearch('');
    } catch (error: any) {
      console.error('Error enrolling student', error);
      alert(error.response?.data?.message || "Erreur lors de l'inscription des élèves.");
    }
  };

  // ── TRANSFER / MIGRATE STUDENTS ──
  const openTransferModal = async (student?: Student) => {
    if (student) {
      setStudentToTransfer(student);
      setIsBulkTransfer(false);
    } else {
      setStudentToTransfer(null);
      setIsBulkTransfer(true);
    }
    await fetchAllClasses();
    setIsTransferModalOpen(true);
  };

  const confirmTransfer = async () => {
    if (!targetClassId) return;
    setIsTransferLoading(true);
    try {
      const studentIds = isBulkTransfer 
        ? selectedStudentIds 
        : studentToTransfer ? [studentToTransfer.id] : [];

      if (studentIds.length === 0) return;

      const res = await api.post('/classes/transfer', {
        studentIds,
        fromClassId: classId,
        toClassId: targetClassId
      });

      alert(res.data?.message || "Migration effectuée avec succès !");
      await fetchClassData();
      setIsTransferModalOpen(false);
      setStudentToTransfer(null);
      setSelectedStudentIds([]);
      setTargetClassId('');
    } catch (error: any) {
      console.error('Error transferring student(s)', error);
      alert(error.response?.data?.message || "Erreur lors du transfert de l'élève.");
    } finally {
      setIsTransferLoading(false);
    }
  };

  // ── REMOVE / UNENROLL STUDENT ──
  const confirmRemoveStudent = async () => {
    if (!studentToRemove) return;
    try {
      await api.post('/classes/unenroll', {
        studentId: studentToRemove.id,
        classId
      });
      await fetchClassData();
      setIsRemoveModalOpen(false);
      setStudentToRemove(null);
    } catch (error: any) {
      console.error('Error unenrolling student', error);
      alert(error.response?.data?.message || "Erreur lors du retrait de l'élève.");
    }
  };

  // ── IMPORT STUDENTS EXCEL ──
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handlePreviewImport = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      setIsPreviewingImport(true);
      const response = await api.post(`/classes/${classId}/students/import-preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportPreviewData(response.data);
    } catch (error) {
      console.error('Error previewing import', error);
      alert("Erreur lors de la prévisualisation.");
    } finally {
      setIsPreviewingImport(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      setIsImporting(true);
      const response = await api.post(`/classes/${classId}/students/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchClassData();
      setIsImportingMode(false);
      setSelectedFile(null);
      setImportPreviewData([]);
      alert(`Import terminé avec succès !\n${response.data.created} nouveaux créés, ${response.data.enrolled} inscrits.`);
    } catch (error) {
      console.error('Error importing students', error);
      alert("Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadStudentTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const sampleData = [
        {
          'Nom': 'Kouassi',
          'Prénom': 'Emmanuel',
          'Email': 'emmanuel.kouassi@ecole.ci',
          'Mot de passe': 'pass1234'
        },
        {
          'Nom': 'Diallo',
          'Prénom': 'Awa',
          'Email': 'awa.diallo@ecole.ci',
          'Mot de passe': 'pass1234'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Élèves");
      XLSX.writeFile(workbook, `modele_inscriptions_${cls?.name || 'classe'}.xlsx`);
    } catch (error) {
      console.error("Erreur lors du téléchargement du modèle", error);
    }
  };

  const confirmResetPassword = async () => {
    if (!studentToReset || !newPassword) return;
    try {
      await api.put(`/users/${studentToReset.id}`, { password: newPassword });
      alert("Mot de passe mis à jour avec succès");
      setIsPasswordModalOpen(false);
      setStudentToReset(null);
      setNewPassword('');
    } catch (error) {
      console.error("Error resetting password", error);
      alert("Erreur lors de la réinitialisation");
    }
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s => 
      (s.firstName || '').toLowerCase().includes(q) ||
      (s.lastName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.matricule || '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  if (!cls) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* ── HEADER NAVIGATION & INFO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-card p-6 rounded-2xl border border-brand-border shadow-xs">
        <div className="flex items-center gap-4">
          <Link to={`${basePath}/classes`} className="p-2.5 hover:bg-brand-sidebar rounded-xl transition-colors text-brand-text-muted hover:text-brand-text border border-brand-border">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-accent/10 border border-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-brand-text">{cls.name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls.isActive ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  {cls.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-brand-text-muted">
                {cls.niveau && (
                  <span className="flex items-center gap-1 font-semibold text-brand-text">
                    <Layers className="w-3.5 h-3.5 text-brand-accent" />
                    Niveau: {cls.niveau.nom}
                  </span>
                )}
                {cls.school && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    {cls.school.name}
                  </span>
                )}
                {cls.academicYear && (
                  <span className="flex items-center gap-1 text-purple-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    Année: {cls.academicYear.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'DIRECTEUR' && (
            <Link to={`${basePath}/classes/${cls.id}/edit`}>
              <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
                Modifier
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI MINI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => handleTabChange('students')} 
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeTab === 'students' ? 'bg-brand-accent/10 border-brand-accent shadow-sm' : 'bg-brand-card border-brand-border hover:border-brand-accent/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Effectif Élèves</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-brand-text mt-2">{students.length}</p>
          <p className="text-[11px] text-brand-text-muted mt-0.5">Inscrits pour l'année en cours</p>
        </div>

        <div 
          onClick={() => handleTabChange('teachers')} 
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeTab === 'teachers' ? 'bg-brand-accent/10 border-brand-accent shadow-sm' : 'bg-brand-card border-brand-border hover:border-brand-accent/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Enseignants Affectés</span>
            <UserCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-brand-text mt-2">{teacherAssignments.length}</p>
          <p className="text-[11px] text-brand-text-muted mt-0.5">Affectations matières & profs</p>
        </div>

        <div 
          onClick={() => handleTabChange('courses')} 
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeTab === 'courses' ? 'bg-brand-accent/10 border-brand-accent shadow-sm' : 'bg-brand-card border-brand-border hover:border-brand-accent/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Cours du Niveau</span>
            <BookOpen className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-brand-text mt-2">{courses.length}</p>
          <p className="text-[11px] text-brand-text-muted mt-0.5">Matières & programmes officiels</p>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER WITH TABS ── */}
      <div className="bg-brand-card rounded-2xl border border-brand-border overflow-hidden shadow-lg">
        {/* TAB HEADERS */}
        <div className="flex border-b border-brand-border bg-brand-sidebar/30">
          <button 
            onClick={() => handleTabChange('students')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'students' ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-card shadow-xs' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'}`}
          >
            <Users className="w-4 h-4" />
            Élèves Inscrits ({students.length})
          </button>
          <button 
            onClick={() => handleTabChange('teachers')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'teachers' ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-card shadow-xs' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'}`}
          >
            <UserCheck className="w-4 h-4" />
            Enseignants & Matières ({teacherAssignments.length})
          </button>
          <button 
            onClick={() => handleTabChange('courses')}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'courses' ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-card shadow-xs' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'}`}
          >
            <BookOpen className="w-4 h-4" />
            Cours Officiels ({courses.length})
          </button>
        </div>

        <div className="p-6">
          {/* ══════════════════════════════════════════════
              TAB 1: STUDENTS MANAGEMENT & MIGRATION
          ══════════════════════════════════════════════ */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              {/* TOP ACTION BAR */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-brand-sidebar/40 p-4 rounded-xl border border-brand-border">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer les élèves par nom, email, matricule..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-brand-card border border-brand-border rounded-xl text-xs text-brand-text outline-none focus:border-brand-accent transition-all"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedStudentIds.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransferModal()}
                      leftIcon={<ArrowRightLeft className="w-4 h-4 text-brand-accent" />}
                      className="border-brand-accent/50 text-brand-accent bg-brand-accent/5"
                    >
                      Migrer la sélection ({selectedStudentIds.length})
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAddingStudent(true);
                      fetchAllStudents();
                    }}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Inscrire des élèves
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsImportingMode(true)}
                    leftIcon={<Upload className="w-4 h-4" />}
                    className="!bg-green-500/10 !text-green-500 !border-green-500/20 hover:!bg-green-500/20"
                  >
                    Importer Excel
                  </Button>
                </div>
              </div>

              {/* IMPORT ZONE */}
              {isImportingMode && (
                <div className="bg-brand-sidebar border border-brand-border rounded-2xl p-5 space-y-4 shadow-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-green-500 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Importer la liste des élèves (Excel)
                      </h3>
                      <p className="text-xs text-brand-text-muted mt-0.5">
                        Colonnes requises: Nom, Prénom, Email, Mot de passe
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleDownloadStudentTemplate} size="sm">
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Télécharger Modèle
                    </Button>
                  </div>

                  {!importPreviewData.length ? (
                    <div className="space-y-4">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleFileSelect}
                        className="w-full p-2.5 bg-brand-card border border-brand-border rounded-xl text-sm text-brand-text file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand-accent file:text-white cursor-pointer"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setIsImportingMode(false); setSelectedFile(null); }}>Annuler</Button>
                        <Button variant="primary" size="sm" onClick={handlePreviewImport} disabled={!selectedFile || isPreviewingImport} isLoading={isPreviewingImport}>Prévisualiser</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-brand-border rounded-xl bg-brand-card text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-brand-sidebar sticky top-0 border-b border-brand-border">
                            <tr>
                              <th className="p-3 text-brand-text-muted font-bold">Statut</th>
                              <th className="p-3 text-brand-text-muted font-bold">Nom Complet</th>
                              <th className="p-3 text-brand-text-muted font-bold">Email</th>
                              <th className="p-3 text-brand-text-muted font-bold">Remarque</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-border">
                            {importPreviewData.map((row: any, idx: number) => (
                              <tr key={idx} className={row.status === 'INVALID' ? 'bg-red-500/5' : row.status === 'EXISTS' ? 'bg-yellow-500/5' : ''}>
                                <td className="p-3">
                                  {row.status === 'VALID' && <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Prêt</span>}
                                  {row.status === 'INVALID' && <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Invalide</span>}
                                  {row.status === 'EXISTS' && <span className="text-yellow-500 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Existant</span>}
                                </td>
                                <td className="p-3 font-semibold text-brand-text">{row.firstName} {row.lastName}</td>
                                <td className="p-3 text-brand-text-muted">{row.email}</td>
                                <td className="p-3 text-brand-text-muted italic">{row.reasons?.join(', ') || 'Nouveau compte'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setImportPreviewData([]); setSelectedFile(null); }}>Retour</Button>
                        <Button variant="primary" size="sm" onClick={handleImportSubmit} disabled={isImporting || importPreviewData.every((r: any) => r.status === 'INVALID')} isLoading={isImporting}>Valider l'importation</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADD STUDENT MODAL/INLINE ZONE */}
              {isAddingStudent && (
                <div className="bg-brand-sidebar border border-brand-border p-5 rounded-2xl space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <label className="block text-sm font-bold text-brand-text">Sélectionner des élèves non assignés</label>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                      {newSelectedStudentIds.length} élève(s) sélectionné(s)
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Rechercher par nom, prénom ou email..."
                      value={addStudentSearch}
                      onChange={(e) => setAddStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-brand-card border border-brand-border rounded-xl outline-none text-brand-text text-sm focus:border-brand-accent transition-all"
                    />
                  </div>

                  {(() => {
                    const availableStudents = allStudents
                      .filter(s => !students.some(active => active.id === s.id))
                      .filter(s => {
                        if (!addStudentSearch.trim()) return true;
                        const q = addStudentSearch.toLowerCase();
                        return (
                          (s.firstName || '').toLowerCase().includes(q) ||
                          (s.lastName || '').toLowerCase().includes(q) ||
                          (s.email || '').toLowerCase().includes(q)
                        );
                      });

                    const allAvailableSelected = availableStudents.length > 0 && availableStudents.every(s => newSelectedStudentIds.includes(s.id));

                    const toggleSelectAll = () => {
                      if (allAvailableSelected) {
                        setNewSelectedStudentIds(prev => prev.filter(id => !availableStudents.some(s => s.id === id)));
                      } else {
                        const newIds = new Set([...newSelectedStudentIds, ...availableStudents.map(s => s.id)]);
                        setNewSelectedStudentIds(Array.from(newIds));
                      }
                    };

                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs text-brand-text-muted">{availableStudents.length} élève(s) disponible(s)</span>
                          {availableStudents.length > 0 && (
                            <button 
                              type="button" 
                              onClick={toggleSelectAll} 
                              className="text-xs font-bold text-brand-accent hover:underline cursor-pointer"
                            >
                              {allAvailableSelected ? 'Tout décocher' : 'Tout sélectionner'}
                            </button>
                          )}
                        </div>
                        <div className="max-h-56 overflow-y-auto border border-brand-border rounded-xl bg-brand-card divide-y divide-brand-border/50 custom-scrollbar">
                          {availableStudents.map(student => {
                            const isChecked = newSelectedStudentIds.includes(student.id);
                            return (
                              <label 
                                key={student.id} 
                                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-brand-sidebar/60 transition-colors ${isChecked ? 'bg-brand-accent/5' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setNewSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                      } else {
                                        setNewSelectedStudentIds(prev => [...prev, student.id]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent cursor-pointer"
                                  />
                                  <div>
                                    <p className="font-bold text-brand-text text-sm">{student.firstName} {student.lastName}</p>
                                    <p className="text-xs text-brand-text-muted">{student.email}</p>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                          {availableStudents.length === 0 && (
                            <div className="p-6 text-center text-sm text-brand-text-muted">
                              Aucun élève disponible trouvé pour cette recherche.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-2 pt-2 border-t border-brand-border/50">
                    <Button variant="ghost" size="sm" onClick={() => { setIsAddingStudent(false); setNewSelectedStudentIds([]); setAddStudentSearch(''); }}>Annuler</Button>
                    <Button variant="primary" size="sm" onClick={handleEnrollSelectedStudents} disabled={newSelectedStudentIds.length === 0}>
                      Inscrire ({newSelectedStudentIds.length}) à la classe
                    </Button>
                  </div>
                </div>
              )}

              {/* STUDENTS LIST TABLE */}
              <div className="border border-brand-border rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-brand-sidebar border-b border-brand-border">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds(filteredStudents.map(s => s.id));
                            } else {
                              setSelectedStudentIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-brand-border text-brand-accent cursor-pointer"
                        />
                      </th>
                      <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">Élève</th>
                      <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">Matricule</th>
                      <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">Contact</th>
                      <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider">Statut Inscription</th>
                      <th className="p-4 text-xs font-bold text-brand-text-muted uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border bg-brand-card">
                    {filteredStudents.map(student => {
                      const isChecked = selectedStudentIds.includes(student.id);
                      return (
                        <tr key={student.id} className={`hover:bg-brand-sidebar/40 transition-colors ${isChecked ? 'bg-brand-accent/5' : ''}`}>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                } else {
                                  setSelectedStudentIds(prev => [...prev, student.id]);
                                }
                              }}
                              className="w-4 h-4 rounded border-brand-border text-brand-accent cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {student.avatarUrl ? (
                                <img src={student.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-brand-border" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 font-bold text-xs flex items-center justify-center border border-blue-500/20">
                                  {student.firstName?.[0] || 'E'}{student.lastName?.[0] || ''}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-brand-text text-sm">{student.firstName} {student.lastName}</p>
                                <p className="text-xs text-brand-text-muted">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-brand-accent">
                            {student.matricule || '—'}
                          </td>
                          <td className="p-4 text-xs text-brand-text-muted">
                            {student.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {student.phone}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20">
                              {student.enrollmentStatus || 'Inscrit'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => openTransferModal(student)}
                                className="p-2 text-brand-accent hover:text-white bg-brand-accent/10 hover:bg-brand-accent rounded-lg transition-colors cursor-pointer"
                                title="Migrer / Transférer vers une autre classe"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { setStudentToReset(student); setIsPasswordModalOpen(true); }} 
                                className="p-2 text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border rounded-lg transition-colors cursor-pointer" 
                                title="Réinitialiser le mot de passe"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setStudentToRemove(student);
                                  setIsRemoveModalOpen(true);
                                }} 
                                className="p-2 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 rounded-lg transition-colors cursor-pointer" 
                                title="Retirer de la classe (désinscrire)"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-brand-text-muted">
                          Aucun élève trouvé dans cette classe.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 2: TEACHERS & SUBJECTS ASSIGNMENTS
          ══════════════════════════════════════════════ */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-brand-text">Enseignants & Matières Affectés</h3>
                  <p className="text-xs text-brand-text-muted mt-0.5">
                    Gérez les professeurs intervenant dans cette classe et leurs matières respectives.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsAssigningTeacher(true);
                    fetchTeachersAndSubjects();
                  }}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Affecter un enseignant
                </Button>
              </div>

              {/* ASSIGN TEACHER FORM */}
              {isAssigningTeacher && (
                <div className="bg-brand-sidebar border border-brand-border p-5 rounded-2xl space-y-4 shadow-lg">
                  <h4 className="font-bold text-brand-text flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-accent" />
                    Nouvelle affectation Enseignant ↔ Matière
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SUBJECT SELECT */}
                    <div>
                      <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Matière *</label>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filtrer les matières..."
                          value={subjectFilterSearch}
                          onChange={(e) => setSubjectFilterSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs outline-none text-brand-text focus:border-brand-accent transition-all"
                        />
                      </div>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg outline-none text-brand-text text-sm cursor-pointer"
                      >
                        <option value="">Sélectionner une matière...</option>
                        {allSubjects
                          .filter(s => !subjectFilterSearch.trim() || s.name.toLowerCase().includes(subjectFilterSearch.toLowerCase()))
                          .map(subj => (
                            <option key={subj.id} value={subj.id}>{subj.name} (Coef: {subj.coefficient || 1})</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* TEACHER SELECT */}
                    <div>
                      <label className="block text-xs font-bold text-brand-text-muted uppercase mb-1">Enseignant *</label>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filtrer les enseignants..."
                          value={teacherFilterSearch}
                          onChange={(e) => setTeacherFilterSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-brand-card border border-brand-border rounded-lg text-xs outline-none text-brand-text focus:border-brand-accent transition-all"
                        />
                      </div>
                      <select
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg outline-none text-brand-text text-sm cursor-pointer"
                      >
                        <option value="">Sélectionner un professeur...</option>
                        {allTeachers
                          .filter(t => {
                            if (!teacherFilterSearch.trim()) return true;
                            const q = teacherFilterSearch.toLowerCase();
                            return (
                              (t.firstName || '').toLowerCase().includes(q) ||
                              (t.lastName || '').toLowerCase().includes(q) ||
                              (t.email || '').toLowerCase().includes(q)
                            );
                          })
                          .map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.firstName} {teacher.lastName} ({teacher.email})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-brand-border/50">
                    <Button variant="ghost" size="sm" onClick={() => { setIsAssigningTeacher(false); setTeacherFilterSearch(''); setSubjectFilterSearch(''); }}>Annuler</Button>
                    <Button variant="primary" size="sm" onClick={handleAssignTeacher} disabled={!selectedTeacherId || !selectedSubjectId}>Valider l'affectation</Button>
                  </div>
                </div>
              )}

              {/* TEACHER ASSIGNMENTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherAssignments.map(assignment => (
                  <div key={assignment.id} className="p-4 bg-brand-sidebar border border-brand-border rounded-2xl flex flex-col justify-between space-y-4 hover:border-brand-accent/40 transition-all shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                            {assignment.subject?.name || 'Matière'}
                          </span>
                          {assignment.subject?.coefficient && (
                            <span className="ml-2 text-[10px] font-semibold text-brand-text-muted">
                              Coef: {assignment.subject.coefficient}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleUnassignTeacher(assignment.id)}
                          className="p-1.5 text-brand-text-muted hover:text-red-400 bg-brand-card hover:bg-red-500/10 rounded-lg transition-colors border border-brand-border cursor-pointer"
                          title="Désassigner cette matière"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        {assignment.teacher?.avatarUrl ? (
                          <img src={assignment.teacher.avatarUrl} alt="Teacher" className="w-10 h-10 rounded-full object-cover border border-brand-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 font-black text-xs flex items-center justify-center border border-amber-500/20">
                            {assignment.teacher?.firstName?.[0] || 'P'}{assignment.teacher?.lastName?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-brand-text text-sm">
                            {assignment.teacher?.firstName} {assignment.teacher?.lastName}
                          </p>
                          <p className="text-xs text-brand-text-muted flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {assignment.teacher?.email}
                          </p>
                          {assignment.teacher?.phone && (
                            <p className="text-[11px] text-brand-text-muted flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              {assignment.teacher.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {teacherAssignments.length === 0 && (
                  <div className="col-span-full py-12 text-center text-brand-text-muted bg-brand-sidebar/20 rounded-2xl border border-dashed border-brand-border">
                    <UserCheck className="w-8 h-8 mx-auto text-brand-text-muted/50 mb-2" />
                    <p className="font-bold text-brand-text">Aucun enseignant affecté pour l'instant</p>
                    <p className="text-xs mt-1">Cliquez sur "Affecter un enseignant" pour associer un professeur et une matière à cette classe.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════
              TAB 3: OFFICIAL COURSES OF LEVEL
          ══════════════════════════════════════════════ */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-brand-text">Programme & Cours du Niveau ({cls.niveau?.nom || 'Niveau'})</h3>
                <p className="text-xs text-brand-text-muted mt-0.5">
                  Ces cours constituent le socle pédagogique officiel pour toutes les classes du niveau {cls.niveau?.nom}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map(course => (
                  <div key={course.id} className="p-5 bg-brand-sidebar border border-brand-border rounded-2xl flex flex-col justify-between hover:border-brand-accent/50 transition-all shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {course.subject?.name || 'Matière'}
                        </span>
                        <span className="text-[11px] font-bold text-brand-text-muted">
                          {course._count?.chapters || 0} chapitres
                        </span>
                      </div>
                      <h4 className="font-black text-brand-text text-base group-hover:text-brand-accent transition-colors">
                        {course.title}
                      </h4>
                      {course.description && (
                        <p className="text-xs text-brand-text-muted mt-1.5 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-brand-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-brand-text-muted">
                        <span>{course._count?.assignments || 0} devoirs</span>
                        <span>•</span>
                        <span>{course._count?.quizzes || 0} quiz</span>
                      </div>
                      <Link 
                        to={`/academic/courses/${course.id}?tab=CONTENT`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-accent hover:underline"
                      >
                        Consulter <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}

                {courses.length === 0 && (
                  <div className="col-span-full py-12 text-center text-brand-text-muted bg-brand-sidebar/20 rounded-2xl border border-dashed border-brand-border">
                    <BookOpen className="w-8 h-8 mx-auto text-brand-text-muted/50 mb-2" />
                    <p className="font-bold text-brand-text">Aucun cours officiel configuré pour ce niveau</p>
                    <p className="text-xs mt-1">Le Super Administrateur peut créer les cours et chapitres pour le niveau {cls.niveau?.nom}.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TRANSFER / MIGRATE MODAL ── */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isTransferLoading && setIsTransferModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-brand-border animate-fade-in-up">
            <h3 className="font-black text-lg mb-2 text-brand-text flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-brand-accent" />
              {isBulkTransfer ? `Migrer ${selectedStudentIds.length} élève(s)` : `Migrer l'élève`}
            </h3>
            
            <p className="text-xs text-brand-text-muted mb-4">
              {isBulkTransfer ? (
                <>Déplacer les <strong>{selectedStudentIds.length}</strong> élèves sélectionnés de <strong>{cls.name}</strong> vers une nouvelle classe pour l'année en cours.</>
              ) : (
                <>Déplacer <strong>{studentToTransfer?.firstName} {studentToTransfer?.lastName}</strong> de <strong>{cls.name}</strong> vers une nouvelle classe.</>
              )}
              <br /><br />
              <span className="text-amber-500 font-semibold">ℹ️ Remarque :</span> L'élève sera automatiquement retiré de son ancienne classe pour éviter toute duplication, et son compte restera intégralement conservé.
            </p>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold text-brand-text-muted uppercase">Classe de destination *</label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border rounded-xl text-sm font-semibold text-brand-text outline-none focus:border-brand-accent cursor-pointer"
              >
                <option value="">Sélectionner la classe cible...</option>
                {allClasses.filter(c => c.id !== classId).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.niveau?.nom ? `(${c.niveau.nom})` : ''} {c.school?.name ? `— ${c.school.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsTransferModalOpen(false)} disabled={isTransferLoading}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={confirmTransfer} disabled={!targetClassId || isTransferLoading} isLoading={isTransferLoading}>
                Confirmer la migration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-brand-border animate-fade-in-up">
            <h3 className="font-bold text-lg mb-2 text-brand-text flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-accent" />
              Réinitialiser mot de passe
            </h3>
            <p className="text-xs text-brand-text-muted">
              Définir un nouveau mot de passe pour <strong className="text-brand-text">{studentToReset?.firstName} {studentToReset?.lastName}</strong>
            </p>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe..."
              className="w-full px-3.5 py-2.5 bg-brand-sidebar border border-brand-border rounded-xl mt-4 mb-6 outline-none text-brand-text text-sm font-mono focus:border-brand-accent"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPasswordModalOpen(false)}>Annuler</Button>
              <Button variant="primary" size="sm" onClick={confirmResetPassword} disabled={!newPassword.trim()}>Valider</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE STUDENT MODAL ── */}
      {isRemoveModalOpen && studentToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-brand-card w-full max-w-md rounded-2xl border border-brand-border p-6 shadow-2xl animate-fade-in-up">
            <h3 className="text-lg font-black text-brand-text mb-3 flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" />
              Retirer de la classe
            </h3>
            <p className="text-xs text-brand-text-muted mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir retirer <strong>{studentToRemove.firstName} {studentToRemove.lastName}</strong> de la classe <strong>{cls.name}</strong> ?
              <br /><br />
              Cela annulera son inscription dans cette classe pour l'année active, tout en <strong>conservant son compte utilisateur</strong> intact sur la plateforme.
            </p>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setIsRemoveModalOpen(false); setStudentToRemove(null); }}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={confirmRemoveStudent} className="!bg-red-500 hover:!bg-red-600 !text-white !border-red-500">
                Oui, retirer de la classe
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
