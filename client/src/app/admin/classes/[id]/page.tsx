'use client';

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, GraduationCap, Users, BookOpen, Key, ArrowRightLeft, Edit2, Upload, Plus, AlertCircle, CheckCircle } from 'lucide-react';

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export default function ClassDetailsPage() {
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
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
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
        const [classRes, studentsRes, coursesRes, allClassesRes] = await Promise.all([
          api.get(`/classes`),
          api.get(`/classes/${classId}/students`),
          api.get(`/courses?classId=${classId}`),
          api.get(`/classes`)
        ]);
        
        const currentClass = classRes.data.find((c: any) => c.id === classId);
        if (!currentClass) {
            navigate('/admin/classes');
            return;
        }

        setCls(currentClass);
        setStudents(studentsRes.data);
        setCourses(coursesRes.data);
        setAllClasses(allClassesRes.data);
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

  const handleAddStudent = async () => {
      if (!selectedStudentId) return;
      try {
          await api.post('/classes/enroll', {
              classId,
              studentId: selectedStudentId
          });
          const response = await api.get(`/classes/${classId}/students`);
          setStudents(response.data);
          setIsAddingStudent(false);
          setSelectedStudentId('');
      } catch (error) {
          console.error('Error enrolling student', error);
          alert("Erreur lors de l'ajout de l'élève");
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
          <Link to="/admin/classes" className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
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
                      {cls.level && <span className="text-sm text-brand-text-muted">Niveau: {cls.level}</span>}
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
                          <div className="bg-brand-sidebar border border-brand-border p-4 rounded-xl space-y-3">
                              <label className="block text-sm font-medium text-brand-text-muted">Sélectionner un élève existant</label>
                              <select
                                  value={selectedStudentId}
                                  onChange={(e) => setSelectedStudentId(e.target.value)}
                                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg outline-none text-brand-text appearance-none"
                              >
                                  <option value="">Choisir un élève...</option>
                                  {allStudents
                                      .filter(s => !students.some(active => active.id === s.id))
                                      .map(student => (
                                      <option key={student.id} value={student.id}>
                                          {student.firstName} {student.lastName} ({student.email})
                                      </option>
                                  ))}
                              </select>
                              <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="ghost" onClick={() => setIsAddingStudent(false)}>Annuler</Button>
                                  <Button variant="primary" onClick={handleAddStudent} disabled={!selectedStudentId}>Ajouter à la classe</Button>
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
                                      <button onClick={() => { setStudentToTransfer(student); setIsTransferModalOpen(true); }} className="p-2 text-brand-accent hover:text-white bg-brand-accent/10 hover:bg-brand-accent rounded-lg transition-colors" title="Transférer">
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
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {courses.map(course => (
                              <div key={course.id} className="p-4 bg-brand-sidebar border border-brand-border rounded-xl">
                                  <h4 className="font-bold text-brand-text text-lg">{course.subject.name}</h4>
                                  <p className="text-sm text-brand-text-muted mt-1 flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                      Prof: {course.teacher.firstName} {course.teacher.lastName}
                                  </p>
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
