import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useForm } from 'react-hook-form';
import { Plus, Trash2, GraduationCap, Users, X, Upload, Edit, Key, ArrowRightLeft, AlertCircle, CheckCircle, Loader2, Download } from 'lucide-react';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface ClassModel {
  id: string;
  name: string;
  level?: string;
  niveau?: { nom: string };
  school?: { name: string };
  _count?: {
    enrollments: number;
    courses: number;
  };
}

interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}

const Classes = () => {
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [selectedClassStudents, setSelectedClassStudents] = useState<Student[]>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingMode, setIsImportingMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingClass, setEditingClass] = useState<ClassModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [isEditConfirmModalOpen, setIsEditConfirmModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{name: string, level: string} | null>(null);

  const [studentToReset, setStudentToReset] = useState<Student | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [studentToTransfer, setStudentToTransfer] = useState<Student | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');

  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [isPreviewingImport, setIsPreviewingImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ name: string; level: string }>();

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes', error);
    } finally {
        setIsLoading(false);
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Nom,Niveau,École\n" + 
      classes.map(c => `${c.name},${c.niveau?.nom || ''},${c.school?.name || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "classes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const onSubmit = async (data: { name: string; level: string }) => {
    if (editingClass) {
        setEditFormData(data);
        setIsEditConfirmModalOpen(true);
    } else {
        try {
            setIsSubmitting(true);
            await api.post('/classes', data);
            setIsModalOpen(false);
            reset();
            fetchClasses();
        } catch (error) {
            console.error('Error creating class', error);
        } finally {
            setIsSubmitting(false);
        }
    }
  };

  const confirmEdit = async () => {
      if (!editingClass || !editFormData) return;
      try {
          await api.put(`/classes/${editingClass.id}`, editFormData);
          setIsModalOpen(false);
          reset();
          fetchClasses();
      } catch (error) {
          console.error('Error updating class', error);
      } finally {
          setIsEditConfirmModalOpen(false);
          setEditFormData(null);
          setEditingClass(null);
      }
  }

  const handleDeleteClick = (id: string) => {
      setClassToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const confirmDelete = async () => {
      if (!classToDelete) return;
      try {
          await api.delete(`/classes/${classToDelete}`);
          fetchClasses();
      } catch (error) {
          console.error('Error deleting class', error);
      } finally {
          setIsDeleteModalOpen(false);
          setClassToDelete(null);
      }
  }

  const openCreateModal = () => {
      setEditingClass(null);
      reset({ name: '', level: '' });
      setIsModalOpen(true);
  }

  const handleEditClick = (cls: ClassModel) => {
      setEditingClass(cls);
      reset({ name: cls.name, level: cls.level || '' });
      setIsModalOpen(true);
  }

  const handleViewStudents = async (classId: string, className: string) => {
      setSelectedClassName(className);
      setSelectedClassId(classId);
      setIsAddingStudent(false);
      setIsImportingMode(false);
      setSelectedFile(null);
      try {
          const response = await api.get(`/classes/${classId}/students`);
          setSelectedClassStudents(response.data);
          setIsStudentsModalOpen(true);
      } catch (error) {
          console.error('Error fetching students', error);
      }
  }

  const fetchAllStudents = async () => {
      try {
          const response = await api.get('/users?role=APPRENANT');
          setAllStudents(response.data);
      } catch (error) {
          console.error('Error fetching all students', error);
      }
  };

  const handleAddStudent = async () => {
      if (!selectedStudentId || !selectedClassId) return;
      try {
          await api.post('/classes/enroll', {
              classId: selectedClassId,
              studentId: selectedStudentId
          });
          const response = await api.get(`/classes/${selectedClassId}/students`);
          setSelectedClassStudents(response.data);
          setIsAddingStudent(false);
          setSelectedStudentId('');
          fetchClasses(); // Update counts
      } catch (error) {
          console.error('Error enrolling student', error);
          alert("Erreur lors de l'ajout de l'élève (il est peut-être déjà inscrit ailleurs)");
      }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        setSelectedFile(event.target.files[0]);
    }
  };

  const handlePreviewImport = async () => {
    if (!selectedFile || !selectedClassId) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        setIsPreviewingImport(true);
        const response = await api.post(`/classes/${selectedClassId}/students/import-preview`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setImportPreviewData(response.data);
    } catch (error) {
        console.error('Error previewing import', error);
        alert("Erreur lors de la prévisualisation. Vérifiez le format du fichier.");
    } finally {
        setIsPreviewingImport(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!selectedFile || !selectedClassId) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
        setIsImporting(true);
        const response = await api.post(`/classes/${selectedClassId}/students/import`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const studentsResponse = await api.get(`/classes/${selectedClassId}/students`);
        setSelectedClassStudents(studentsResponse.data);

        fetchClasses();
        
        setIsImportingMode(false);
        setSelectedFile(null);

        setTimeout(() => {
             alert(`Import terminé avec succès !\n${response.data.created} nouveaux élèves créés.\n${response.data.enrolled} élèves inscrits dans la classe.`);
        }, 100);
        
    } catch (error) {
        console.error('Error importing students', error);
        alert("Erreur lors de l'import");
    } finally {
        setIsImporting(false);
    }
  };

  const handleResetPasswordClick = (student: Student) => {
      setStudentToReset(student);
      setNewPassword('');
      setIsPasswordModalOpen(true);
  }

  const confirmResetPassword = async () => {
      if (!studentToReset || !newPassword) return;
      try {
          await api.put(`/users/${studentToReset.id}`, { password: newPassword });
          alert("Mot de passe mis à jour avec succès");
          setIsPasswordModalOpen(false);
          setStudentToReset(null);
      } catch (error) {
          console.error("Error resetting password", error);
          alert("Erreur lors de la réinitialisation du mot de passe");
      }
  }

  const handleTransferClick = (student: Student) => {
      setStudentToTransfer(student);
      setTargetClassId('');
      setIsTransferModalOpen(true);
  }

  const confirmTransfer = async () => {
      if (!studentToTransfer || !targetClassId) return;
      try {
          await api.post('/classes/transfer', {
              studentId: studentToTransfer.id,
              targetClassId
          });
          
          const response = await api.get(`/classes/${selectedClassId}/students`);
          setSelectedClassStudents(response.data);
          
          fetchClasses();

          setIsTransferModalOpen(false);
          setStudentToTransfer(null);
          alert("Élève transféré avec succès");
      } catch (error) {
          console.error("Error transferring student", error);
          alert("Erreur lors du transfert");
      }
  }

  const getClassImage = (level: string) => {
    if (level && (level.includes('6') || level.includes('5'))) return 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=600';
    if (level && (level.includes('4') || level.includes('3'))) return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600';
    if (level && (level.includes('2') || level.includes('1') || level.includes('Term'))) return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=600';
    return 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=600';
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestion des Classes"
        subtitle="Organisez vos classes, affectez les élèves et suivez les effectifs."
        action={
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter (CSV)
              </Button>
              <Button 
                  variant="primary"
                  onClick={openCreateModal}
                  leftIcon={<Plus className="w-4 h-4" />}
              >
                  Ajouter une classe
              </Button>
            </div>
        }
      />

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-brand-card rounded-2xl shadow-lg border border-brand-border hover:shadow-brand-accent/5 hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col relative">
                <div className="h-40 w-full relative overflow-hidden">
                    <img 
                        src={getClassImage(cls.level || '')} 
                        alt={cls.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/80 to-transparent"></div>
                    <div className="absolute bottom-4 left-5">
                        <h3 className="text-2xl font-bold text-white drop-shadow-md">{cls.name}</h3>
                        {cls.level && <p className="text-xs text-white/90 font-bold bg-brand-accent/20 border border-brand-accent/30 backdrop-blur-md px-2.5 py-1 rounded-full inline-block mt-2">Niveau: {cls.level}</p>}
                    </div>
                    <div className="absolute top-4 right-4 bg-brand-sidebar border border-brand-border p-2.5 rounded-xl shadow-lg backdrop-blur-md">
                        <GraduationCap className="w-5 h-5 text-brand-accent" />
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex gap-4 text-sm text-brand-text-muted mb-6">
                        <div className="flex flex-col flex-1 items-center p-3 bg-brand-sidebar border border-brand-border rounded-xl">
                            <span className="font-bold text-xl text-brand-text">{cls._count?.enrollments || 0}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Élèves</span>
                        </div>
                        <div className="flex flex-col flex-1 items-center p-3 bg-brand-sidebar border border-brand-border rounded-xl">
                            <span className="font-bold text-xl text-brand-text">{cls._count?.courses || 0}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-text-muted">Cours</span>
                        </div>
                    </div>
                    
                    <div className="mt-auto flex gap-2">
                        <button 
                            onClick={() => handleViewStudents(cls.id, cls.name)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-bold text-white bg-brand-accent hover:bg-brand-accent/90 rounded-lg transition-colors shadow-sm"
                        >
                            <Users className="w-4 h-4" />
                            Élèves
                        </button>
                        <button 
                            onClick={() => handleEditClick(cls)}
                            className="flex items-center justify-center p-2.5 text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border rounded-lg transition-colors border border-transparent hover:border-brand-border"
                            title="Modifier la classe"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(cls.id)}
                            className="flex items-center justify-center p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Supprimer la classe"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-md shadow-2xl border border-brand-border animate-fade-in-up">
            <h2 className="text-xl font-bold mb-6 text-brand-text">{editingClass ? 'Modifier la classe' : 'Ajouter une classe'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Nom de la classe</label>
                <input
                  {...register('name', { required: 'Le nom est requis' })}
                  className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text placeholder-brand-text-muted/50"
                  placeholder="Ex: 6ème A"
                />
                {errors.name && <span className="text-red-400 text-sm mt-1 block">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Niveau</label>
                 <select 
                    {...register('level')}
                    className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                 >
                    <option value="">Sélectionner un niveau</option>
                    <option value="6eme">6ème</option>
                    <option value="5eme">5ème</option>
                    <option value="4eme">4ème</option>
                    <option value="3eme">3ème</option>
                    <option value="2nde">2nde</option>
                    <option value="1ere">1ère</option>
                    <option value="Terminale">Terminale</option>
                 </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                >
                  {editingClass ? 'Enregistrer' : 'Créer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Students Modal */}
      {isStudentsModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsStudentsModalOpen(false)} />
            <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-brand-border animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b border-brand-border pb-4">
                    <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-accent" />
                        Élèves - {selectedClassName}
                    </h2>
                    <button onClick={() => setIsStudentsModalOpen(false)} className="text-brand-text-muted hover:text-white transition-colors bg-brand-sidebar p-1.5 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="mb-4">
                    {!isAddingStudent && !isImportingMode ? (
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsAddingStudent(true);
                                    fetchAllStudents();
                                }}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Ajouter un élève
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setIsImportingMode(true)}
                                leftIcon={<Upload className="w-4 h-4" />}
                                className="!bg-green-500/10 !text-green-400 !border-green-500/20 hover:!bg-green-500/20"
                            >
                                Importer Excel
                            </Button>
                        </div>
                    ) : isImportingMode ? (
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
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setIsImportingMode(false);
                                                setSelectedFile(null);
                                                setImportPreviewData([]);
                                            }}
                                        >
                                            Annuler
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handlePreviewImport}
                                            disabled={!selectedFile || isPreviewingImport}
                                            isLoading={isPreviewingImport}
                                        >
                                            Prévisualiser
                                        </Button>
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
                                                    <th className="p-3 border-b border-brand-border font-semibold text-brand-text-muted">Info</th>
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
                                                        <td className="p-3 text-xs text-red-400">
                                                            {row.reasons && row.reasons.join(', ')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setImportPreviewData([]);
                                                setSelectedFile(null);
                                            }}
                                        >
                                            Retour
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleImportSubmit}
                                            disabled={isImporting || importPreviewData.every((r: any) => r.status === 'INVALID')}
                                            isLoading={isImporting}
                                        >
                                            Confirmer l'import ({importPreviewData.filter((r: any) => r.status !== 'INVALID').length})
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-brand-sidebar border border-brand-border p-4 rounded-xl space-y-3">
                            <label className="block text-sm font-medium text-brand-text-muted">Sélectionner un élève existant</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text appearance-none"
                            >
                                <option value="">Choisir un élève...</option>
                                {allStudents
                                    .filter(s => !selectedClassStudents.some(active => active.id === s.id))
                                    .map(student => (
                                    <option key={student.id} value={student.id}>
                                        {student.firstName} {student.lastName} ({student.email})
                                    </option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsAddingStudent(false)}
                                >
                                    Annuler
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleAddStudent}
                                    disabled={!selectedStudentId}
                                >
                                    Ajouter à la classe
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2 mt-2">
                    {selectedClassStudents.length > 0 ? (
                        <div className="space-y-2">
                            {selectedClassStudents.map(student => (
                                <div key={student.id} className="p-3 bg-brand-sidebar border border-brand-border rounded-xl flex justify-between items-center hover:bg-brand-border/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center font-bold text-brand-accent text-xs">
                                            {student.firstName[0]}{student.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-brand-text text-sm">{student.firstName} {student.lastName}</p>
                                            <p className="text-xs text-brand-text-muted">{student.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleResetPasswordClick(student)}
                                            className="p-2 text-brand-text-muted hover:text-white hover:bg-brand-border rounded-lg transition-colors border border-transparent hover:border-brand-border"
                                            title="Réinitialiser le mot de passe"
                                        >
                                            <Key className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleTransferClick(student)}
                                            className="p-2 text-brand-accent hover:text-white bg-brand-accent/10 hover:bg-brand-accent rounded-lg transition-colors border border-transparent hover:border-brand-accent"
                                            title="Transférer vers une autre classe"
                                        >
                                            <ArrowRightLeft className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-brand-text-muted py-12 bg-brand-sidebar rounded-xl border border-dashed border-brand-border">
                            <Users className="w-12 h-12 mx-auto text-brand-border mb-3" />
                            <p>Aucun élève inscrit dans cette classe</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la classe"
        message="Êtes-vous sûr de vouloir supprimer cette classe ? Cette action supprimera également toutes les données associées (élèves inscrits, cours, etc.)."
        confirmText="Supprimer définitivement"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isEditConfirmModalOpen}
        onClose={() => setIsEditConfirmModalOpen(false)}
        onConfirm={confirmEdit}
        title="Enregistrer les modifications"
        message="Les informations de cette classe vont être mises à jour. Continuer ?"
        confirmText="Confirmer la mise à jour"
        variant="success"
      />

      {/* Password Reset Modal */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPasswordModalOpen(false)} />
              <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-brand-border animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-2 text-brand-text flex items-center gap-2">
                      <Key className="w-5 h-5 text-brand-accent" />
                      Réinitialiser mot de passe
                  </h3>
                  <p className="text-sm text-brand-text-muted mb-6">
                      Définir un nouveau mot de passe pour <span className="font-bold text-brand-text">{studentToReset?.firstName} {studentToReset?.lastName}</span>
                  </p>
                  <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text mb-6"
                  />
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
                          Annuler
                      </Button>
                      <Button variant="primary" onClick={confirmResetPassword} disabled={!newPassword}>
                          Confirmer
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
              <div className="relative bg-brand-card p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-brand-border animate-fade-in-up">
                  <h3 className="font-bold text-lg mb-2 text-brand-text flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-brand-accent" />
                      Transférer l'élève
                  </h3>
                  <p className="text-sm text-brand-text-muted mb-6">
                      Déplacer <span className="font-bold text-brand-text">{studentToTransfer?.firstName} {studentToTransfer?.lastName}</span> vers :
                  </p>
                  <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all text-brand-text mb-6 appearance-none"
                  >
                      <option value="">Sélectionner une classe</option>
                      {classes.filter(c => c.id !== selectedClassId).map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                  </select>
                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)}>
                          Annuler
                      </Button>
                      <Button variant="primary" onClick={confirmTransfer} disabled={!targetClassId}>
                          Transférer
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Classes;
