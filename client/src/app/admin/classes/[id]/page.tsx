'use client';

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, GraduationCap, Users, BookOpen, Key, ArrowRightLeft, Edit2, Upload, Plus, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function ClassDetailsPage() {
  const { user } = useAuth();
  const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : '/directeur';
  
  const navigate = useNavigate();
  const params = useParams();
  const classId = params.id as string;
  
  const [cls, setCls] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'courses'>('students');

  // Student management states
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Course assignment states
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isAssigningCourse, setIsAssigningCourse] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  
  // Import states
  const [isImportingMode, setIsImportingMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Transfer & Reset Password
  const [studentToTransfer, setStudentToTransfer] = useState<Student | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [allClasses, setAllClasses] = useState<any[]>([]);
  
  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, studentsRes, coursesRes] = await Promise.all([
          api.get(`/classes/${classId}`),
          api.get(`/classes/${classId}/students`),
          api.get(`/courses?classId=${classId}`)
        ]);
        
        const currentClass = classRes.data;
        if (!currentClass) {
            navigate(`${basePath}/classes`);
            return;
        }

        setCls(currentClass);
        setStudents(studentsRes.data);
        setCourses(coursesRes.data);
      } catch (error) {
        console.error('Error fetching class details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (classId) fetchData();
  }, [classId, navigate]);

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
          setTeachers(techRes.data);
          setSubjects(subjRes.data);
      } catch (err) {
          console.error('Error fetching teachers and subjects', err);
      }
  };

  const handleAddCourse = async () => {
      if (!selectedTeacherId || !selectedSubjectId) return;
      try {
          await api.post('/courses', {
              classId,
              teacherId: selectedTeacherId,
              subjectId: selectedSubjectId,
              coefficient: 1
          });
          const coursesRes = await api.get(`/courses?classId=${classId}`);
          setCourses(coursesRes.data);
          setIsAssigningCourse(false);
          setSelectedTeacherId('');
          setSelectedSubjectId('');
      } catch (error) {
          console.error('Error adding course', error);
          alert("Erreur lors de l'assignation du cours");
      }
  };

  const handleDeleteCourse = async (courseId: string) => {
      if (!confirm("Voulez-vous vraiment retirer cette affectation de cours ?")) return;
      try {
          await api.delete(`/courses/${courseId}`);
          const coursesRes = await api.get(`/courses?classId=${classId}`);
          setCourses(coursesRes.data);
      } catch (error) {
          console.error("Error deleting course", error);
          alert("Erreur lors de la suppression de l'affectation.");
      }
  };

  const handleAddStudent = async () => {
      if (selectedStudentIds.length === 0) return;
      try {
          await Promise.all(
              selectedStudentIds.map(studentId => 
                  api.post('/classes/enroll', { classId, studentId })
              )
          );
          const response = await api.get(`/classes/${classId}/students`);
          setStudents(response.data);
          setIsAddingStudent(false);
          setSelectedStudentIds([]);
          setStudentSearch('');
      } catch (error) {
          console.error('Error enrolling student', error);
          alert("Erreur lors de l'ajout des élèves");
      }
  };

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
        const studentsRes = await api.get(`/classes/${classId}/students`);
        setStudents(studentsRes.data);
        
        setIsImportingMode(false);
        setSelectedFile(null);
        alert(`Import terminé avec succès !\n${response.data.created} nouveaux, ${response.data.enrolled} inscrits.`);
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
          'Email': 'emmanuel.kouassi@example.com',
          'Mot de passe': 'password123'
        },
        {
          'Nom': 'Diallo',
          'Prénom': 'Awa',
          'Email': 'awa.diallo@example.com',
          'Mot de passe': 'password123'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Élèves");
      XLSX.writeFile(workbook, "modele_importation_eleves.xlsx");
    } catch (error) {
      console.error("Erreur lors du téléchargement du modèle", error);
      alert("Erreur lors de la génération du modèle Excel.");
    }
  };

  const confirmTransfer = async () => {
      if (!studentToTransfer || !targetClassId) return;
      try {
          await api.post('/classes/transfer', {
              studentId: studentToTransfer.id,
              targetClassId
          });
          const response = await api.get(`/classes/${classId}/students`);
          setStudents(response.data);
          setIsTransferModalOpen(false);
          setStudentToTransfer(null);
          alert("Élève transféré avec succès");
      } catch (error) {
          console.error("Error transferring student", error);
      }
  };

  const confirmResetPassword = async () => {
      if (!studentToReset || !newPassword) return;
      try {
          await api.put(`/users/${studentToReset.id}`, { password: newPassword });
          alert("Mot de passe mis à jour avec succès");
          setIsPasswordModalOpen(false);
          setStudentToReset(null);
      } catch (error) {
          console.error("Error resetting password", error);
      }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  if (!cls) return null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={`${basePath}/classes`} className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-sidebar rounded-2xl flex items-center justify-center border border-brand-border">
                  <GraduationCap className="w-7 h-7 text-brand-accent" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-brand-text">{cls.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cls.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {cls.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {cls.niveau && <span className="text-sm text-brand-text-muted">Niveau: {cls.niveau.nom}</span>}
                      {cls.school && <span className="text-sm text-brand-text-muted">École: {cls.school.name}</span>}
                  </div>
              </div>
          </div>
        </div>

        <Link to={`/admin/classes/${cls.id}/edit`}>
            <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />}>
                Modifier
            </Button>
        </Link>
      </div>

      <div className="bg-brand-card rounded-2xl border border-brand-border overflow-hidden shadow-lg">
          {/* TABS */}
          <div className="flex border-b border-brand-border">
              <button 
                  onClick={() => setActiveTab('students')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'students' ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-accent/5' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'}`}
              >
                  <Users className="w-4 h-4" />
                  Élèves ({students.length})
              </button>
              <button 
                  onClick={() => setActiveTab('courses')}
                  className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'courses' ? 'text-brand-accent border-b-2 border-brand-accent bg-brand-accent/5' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar'}`}
              >
                  <BookOpen className="w-4 h-4" />
                  Cours ({courses.length})
              </button>
          </div>

          <div className="p-6">
              {activeTab === 'students' && (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold text-brand-text">Liste des Élèves</h3>
                          <div className="flex gap-3">
                              <Button
                                  variant="outline"
                                  onClick={() => {
                                      setIsAddingStudent(true);
                                      fetchAllStudents();
                                  }}
                                  leftIcon={<Plus className="w-4 h-4" />}
                              >
                                  Ajouter un élève
                              </Button>
                              <Button
                                  variant="primary"
                                  onClick={() => setIsImportingMode(true)}
                                  leftIcon={<Upload className="w-4 h-4" />}
                                  className="!bg-green-500/10 !text-green-400 !border-green-500/20 hover:!bg-green-500/20"
                              >
                                  Importer Excel
                              </Button>
                          </div>
                      </div>

                      {/* IMPORT ZONE */}
                      {isImportingMode && (
                          <div className="bg-brand-sidebar border border-brand-border rounded-xl p-4">
                              <div className="flex justify-between items-center mb-4">
                                  <div className="space-y-1">
                                      <h3 className="font-bold text-green-400 flex items-center gap-2">
                                          <Upload className="w-4 h-4" />
                                          Importer des élèves
                                      </h3>
                                      <div className="text-xs text-brand-text-muted">
                                          Format: Nom, Prénom, Email, Mot de passe
                                      </div>
                                  </div>
                                  <Button variant="outline" onClick={handleDownloadStudentTemplate} size="sm">
                                      <Download className="w-3.5 h-3.5 mr-1.5" />
                                      Modèle Excel
                                  </Button>
                              </div>

                              {!importPreviewData.length ? (
                                  <div className="space-y-4">
                                      <div>
                                          <input 
                                              type="file" 
                                              accept=".xlsx, .xls, .csv" 
                                              onChange={handleFileSelect}
                                              className="w-full p-2 bg-brand-bg border border-brand-border rounded-lg text-sm text-brand-text file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-accent file:text-white hover:file:bg-brand-accent/90 cursor-pointer"
                                          />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                          <Button variant="ghost" onClick={() => { setIsImportingMode(false); setSelectedFile(null); }}>Annuler</Button>
                                          <Button variant="primary" onClick={handlePreviewImport} disabled={!selectedFile || isPreviewingImport} isLoading={isPreviewingImport}>Prévisualiser</Button>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <div className="max-h-60 overflow-y-auto custom-scrollbar border border-brand-border rounded-lg bg-brand-bg text-sm">
                                          <table className="w-full text-left border-collapse">
                                              <thead className="bg-brand-sidebar sticky top-0">
                                                  <tr>
                                                      <th className="p-3 border-b border-brand-border font-semibold text-brand-text-muted">Statut</th>
                                                      <th className="p-3 border-b border-brand-border font-semibold text-brand-text-muted">Nom</th>
                                                      <th className="p-3 border-b border-brand-border font-semibold text-brand-text-muted">Email</th>
                                                  </tr>
                                              </thead>
                                              <tbody className="divide-y divide-brand-border">
                                                  {importPreviewData.map((row: any, idx: number) => (
                                                      <tr key={idx} className={row.status === 'INVALID' ? 'bg-red-500/5' : row.status === 'EXISTS' ? 'bg-yellow-500/5' : ''}>
                                                          <td className="p-3">
                                                              {row.status === 'VALID' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                              {row.status === 'INVALID' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                              {row.status === 'EXISTS' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                                                          </td>
                                                          <td className="p-3 text-brand-text">{row.firstName} {row.lastName}</td>
                                                          <td className="p-3 text-xs text-brand-text-muted">{row.email}</td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                          <Button variant="ghost" onClick={() => { setImportPreviewData([]); setSelectedFile(null); }}>Retour</Button>
                                          <Button variant="primary" onClick={handleImportSubmit} disabled={isImporting || importPreviewData.every((r: any) => r.status === 'INVALID')} isLoading={isImporting}>Confirmer l'import</Button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}

                      {/* ADD STUDENT ZONE */}
                      {isAddingStudent && (
                          <div className="bg-brand-sidebar border border-brand-border p-5 rounded-2xl space-y-4 shadow-lg">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                  <label className="block text-sm font-bold text-brand-text">Rechercher et sélectionner des élèves à inscrire</label>
                                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/20">
                                      {selectedStudentIds.length} élève(s) sélectionné(s)
                                  </span>
                              </div>

                              {/* SEARCH INPUT */}
                              <div className="relative">
                                  <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                                  <input 
                                      type="text"
                                      placeholder="Rechercher par nom, prénom ou email..."
                                      value={studentSearch}
                                      onChange={(e) => setStudentSearch(e.target.value)}
                                      className="w-full pl-9 pr-4 py-2.5 bg-brand-bg border border-brand-border rounded-xl outline-none text-brand-text text-sm focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                                  />
                              </div>

                              {/* LIST OF AVAILABLE STUDENTS */}
                              {(() => {
                                  const availableStudents = allStudents
                                      .filter(s => !students.some(active => active.id === s.id))
                                      .filter(s => {
                                          if (!studentSearch.trim()) return true;
                                          const q = studentSearch.toLowerCase();
                                          return (
                                              (s.firstName || '').toLowerCase().includes(q) ||
                                              (s.lastName || '').toLowerCase().includes(q) ||
                                              (s.email || '').toLowerCase().includes(q)
                                          );
                                      });

                                  const allAvailableSelected = availableStudents.length > 0 && availableStudents.every(s => selectedStudentIds.includes(s.id));

                                  const toggleSelectAll = () => {
                                      if (allAvailableSelected) {
                                          setSelectedStudentIds(prev => prev.filter(id => !availableStudents.some(s => s.id === id)));
                                      } else {
                                          const newIds = new Set([...selectedStudentIds, ...availableStudents.map(s => s.id)]);
                                          setSelectedStudentIds(Array.from(newIds));
                                      }
                                  };

                                  return (
                                      <div className="space-y-2">
                                          <div className="flex justify-between items-center px-1">
                                              <span className="text-xs text-brand-text-muted">{availableStudents.length} élève(s) trouvé(s)</span>
                                              {availableStudents.length > 0 && (
                                                  <button 
                                                      type="button" 
                                                      onClick={toggleSelectAll} 
                                                      className="text-xs font-bold text-brand-accent hover:underline"
                                                  >
                                                      {allAvailableSelected ? 'Tout décocher' : 'Tout sélectionner'}
                                                  </button>
                                              )}
                                          </div>
                                          <div className="max-h-56 overflow-y-auto border border-brand-border rounded-xl bg-brand-bg divide-y divide-brand-border/50">
                                              {availableStudents.map(student => {
                                                  const isChecked = selectedStudentIds.includes(student.id);
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
                                                                          setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                                                      } else {
                                                                          setSelectedStudentIds(prev => [...prev, student.id]);
                                                                      }
                                                                  }}
                                                                  className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent"
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
                                  <Button variant="ghost" onClick={() => { setIsAddingStudent(false); setSelectedStudentIds([]); setStudentSearch(''); }}>Annuler</Button>
                                  <Button variant="primary" onClick={handleAddStudent} disabled={selectedStudentIds.length === 0}>
                                      Inscrire {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''} à la classe
                                  </Button>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {students.map(student => (
                              <div key={student.id} className="p-4 bg-brand-sidebar border border-brand-border rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm">
                                          {student.firstName[0]}{student.lastName[0]}
                                      </div>
                                      <div>
                                          <p className="font-bold text-brand-text text-sm">{student.firstName} {student.lastName}</p>
                                          <p className="text-xs text-brand-text-muted">{student.email}</p>
                                      </div>
                                  </div>
                                  <div className="flex gap-1">
                                      <button onClick={() => { setStudentToReset(student); setIsPasswordModalOpen(true); }} className="p-2 text-brand-text-muted hover:text-white bg-brand-bg hover:bg-brand-border rounded-lg transition-colors" title="Réinitialiser">
                                          <Key className="w-4 h-4" />
                                      </button>
                                      <button onClick={async () => {
                                        setStudentToTransfer(student);
                                        try {
                                          const res = await api.get(`/classes`);
                                          setAllClasses(res.data);
                                        } catch (err) {}
                                        setIsTransferModalOpen(true);
                                      }} className="p-2 text-brand-accent hover:text-white bg-brand-accent/10 hover:bg-brand-accent rounded-lg transition-colors" title="Transférer">
                                          <ArrowRightLeft className="w-4 h-4" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {students.length === 0 && (
                              <div className="col-span-full py-10 text-center text-brand-text-muted">
                                  Aucun élève inscrit dans cette classe.
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'courses' && (
                  <div className="space-y-6">
                      <div className="flex justify-between items-center">
                          <h3 className="text-lg font-bold text-brand-text">Cours assignés à la classe</h3>
                          <Button
                              variant="primary"
                              onClick={() => {
                                  setIsAssigningCourse(true);
                                  fetchTeachersAndSubjects();
                              }}
                              leftIcon={<Plus className="w-4 h-4" />}
                          >
                              Assigner un enseignant
                          </Button>
                      </div>
                      
                      {isAssigningCourse && (
                          <div className="bg-brand-sidebar border border-brand-border p-5 rounded-2xl space-y-4 shadow-lg">
                              <h4 className="font-bold text-brand-text">Nouvelle assignation d'enseignant à une matière</h4>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* MATIERE WITH SEARCH */}
                                  <div>
                                      <label className="block text-sm font-medium text-brand-text-muted mb-1">Matière *</label>
                                      <div className="relative mb-2">
                                          <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                                          <input
                                              type="text"
                                              placeholder="Filtrer les matières..."
                                              value={subjectSearch}
                                              onChange={(e) => setSubjectSearch(e.target.value)}
                                              className="w-full pl-8 pr-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs outline-none text-brand-text focus:border-brand-accent transition-all"
                                          />
                                      </div>
                                      <select
                                          value={selectedSubjectId}
                                          onChange={(e) => setSelectedSubjectId(e.target.value)}
                                          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg outline-none text-brand-text appearance-none text-sm"
                                      >
                                          <option value="">Choisir une matière...</option>
                                          {subjects
                                              .filter(s => !subjectSearch.trim() || s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
                                              .map(subj => (
                                                  <option key={subj.id} value={subj.id}>{subj.name}</option>
                                              ))
                                          }
                                      </select>
                                  </div>

                                  {/* TEACHER WITH SEARCH */}
                                  <div>
                                      <label className="block text-sm font-medium text-brand-text-muted mb-1">Enseignant *</label>
                                      <div className="relative mb-2">
                                          <Search className="w-3.5 h-3.5 text-brand-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                                          <input
                                              type="text"
                                              placeholder="Filtrer les enseignants par nom/email..."
                                              value={teacherSearch}
                                              onChange={(e) => setTeacherSearch(e.target.value)}
                                              className="w-full pl-8 pr-3 py-1.5 bg-brand-bg border border-brand-border rounded-lg text-xs outline-none text-brand-text focus:border-brand-accent transition-all"
                                          />
                                      </div>
                                      <select
                                          value={selectedTeacherId}
                                          onChange={(e) => setSelectedTeacherId(e.target.value)}
                                          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg outline-none text-brand-text appearance-none text-sm"
                                      >
                                          <option value="">Choisir un enseignant...</option>
                                          {teachers
                                              .filter(t => {
                                                  if (!teacherSearch.trim()) return true;
                                                  const q = teacherSearch.toLowerCase();
                                                  return (
                                                      t.firstName.toLowerCase().includes(q) ||
                                                      t.lastName.toLowerCase().includes(q) ||
                                                      t.email.toLowerCase().includes(q)
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
                                  <Button variant="ghost" onClick={() => { setIsAssigningCourse(false); setTeacherSearch(''); setSubjectSearch(''); }}>Annuler</Button>
                                  <Button variant="primary" onClick={handleAddCourse} disabled={!selectedTeacherId || !selectedSubjectId}>Confirmer l'assignation</Button>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {courses.map(course => (
                              <div key={course.id} className="p-4 bg-brand-sidebar border border-brand-border rounded-xl flex items-center justify-between">
                                  <div>
                                      <h4 className="font-bold text-brand-text text-lg">{course.subject?.name || 'Matière'}</h4>
                                      <p className="text-sm text-brand-text-muted mt-1 flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                          Prof: {course.teacher?.firstName} {course.teacher?.lastName}
                                      </p>
                                  </div>
                                  <button 
                                      onClick={() => handleDeleteCourse(course.id)}
                                      className="p-2 text-brand-text-muted hover:text-red-400 bg-brand-bg hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Retirer l'affectation"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                          {courses.length === 0 && (
                              <div className="col-span-full py-10 text-center text-brand-text-muted">
                                  Aucun cours défini pour cette classe.
                              </div>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* MODALS */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)} />
              <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-brand-border animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-2 text-brand-text flex items-center gap-2">
                      <Key className="w-5 h-5 text-brand-accent" />
                      Réinitialiser mot de passe
                  </h3>
                  <p className="text-sm text-brand-text-muted">Définir pour <span className="font-bold text-brand-text">{studentToReset?.firstName} {studentToReset?.lastName}</span></p>
                  <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg mt-4 mb-6 outline-none text-brand-text"
                  />
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>Annuler</Button>
                      <Button variant="primary" onClick={confirmResetPassword} disabled={!newPassword}>Confirmer</Button>
                  </div>
              </div>
          </div>
      )}

      {isTransferModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
              <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-brand-border animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-2 text-brand-text flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-brand-accent" />
                      Transférer l'élève
                  </h3>
                  <p className="text-sm text-brand-text-muted">Déplacer <span className="font-bold text-brand-text">{studentToTransfer?.firstName} {studentToTransfer?.lastName}</span> vers :</p>
                  <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg mt-4 mb-6 outline-none text-brand-text appearance-none"
                  >
                      <option value="">Sélectionner une classe</option>
                      {allClasses.filter(c => c.id !== classId).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Annuler</Button>
                      <Button variant="primary" onClick={confirmTransfer} disabled={!targetClassId}>Transférer</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
