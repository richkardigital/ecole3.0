import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, GraduationCap, Users, BookOpen, AlertCircle, Edit, Loader2, Download, FileSpreadsheet, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import * as XLSX from 'xlsx';

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
  const { user } = useAuth();
  const basePath = user?.role === 'SUPER_ADMIN' ? '/admin' : '/directeur';
  
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const itemsPerPage = 15;

  const uniqueLevels = useMemo(() => {
    const levels = new Set<string>();
    classes.forEach(c => {
      const levelName = c.level || c.niveau?.nom;
      if (levelName) levels.add(levelName);
    });
    return Array.from(levels).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!selectedLevel) return classes;
    return classes.filter(c => (c.level || c.niveau?.nom) === selectedLevel);
  }, [classes, selectedLevel]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(start, start + itemsPerPage);
  }, [filteredClasses, currentPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filter changes
  }, [selectedLevel]);

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
    const ws = XLSX.utils.json_to_sheet(filteredClasses.map(c => ({
        "Nom de la classe": c.name,
        "Niveau": c.level || c.niveau?.nom || '',
        "École": c.school?.name || '',
        "Nombre d'élèves": c._count?.enrollments || 0,
        "Nombre de cours": c._count?.courses || 0
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    XLSX.writeFile(wb, "classes.xlsx");
  };

  useEffect(() => {
    fetchClasses();
  }, []);

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader 
        title="Gestion des Classes"
        subtitle="Organisez vos classes, affectez les élèves et suivez les effectifs."
        action={
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                  <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-brand-sidebar border border-brand-border rounded-lg text-sm text-brand-text focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none appearance-none"
                  >
                      <option value="">Tous les niveaux</option>
                      {uniqueLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                      ))}
                  </select>
                  <Filter className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <Button variant="outline" onClick={handleExport}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
              <div className="flex gap-3">
              {user?.role === 'SUPER_ADMIN' && (
                <Link to="/admin/classes/new">
                    <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
                        Nouvelle classe
                    </Button>
                </Link>
              )}
            </div>
            </div>
        }
      />

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : (
          <div className="bg-brand-card rounded-2xl shadow-lg border border-brand-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-brand-sidebar border-b border-brand-border">
                        <tr>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Nom de la classe</th>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Niveau</th>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap text-center">Élèves</th>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap text-center">Cours</th>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap">Statut</th>
                            <th className="p-4 font-semibold text-brand-text-muted text-sm whitespace-nowrap text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {paginatedClasses.map((cls) => (
                            <tr key={cls.id} className="hover:bg-brand-sidebar/50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent rounded-xl flex items-center justify-center shrink-0">
                                            <GraduationCap className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-brand-text">{cls.name}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {cls.niveau?.nom || cls.level ? (
                                        <span className="px-3 py-1 bg-brand-sidebar border border-brand-border rounded-full text-xs font-bold text-brand-text-muted">
                                            {cls.niveau?.nom || cls.level}
                                        </span>
                                    ) : (
                                        <span className="text-brand-text-muted">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <Link to={`${basePath}/classes/${cls.id}`} className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors font-bold text-sm">
                                        <Users className="w-4 h-4" />
                                        {cls._count?.enrollments || 0}
                                    </Link>
                                </td>
                                <td className="p-4 text-center">
                                    <Link to={`${basePath}/classes/${cls.id}`} className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors font-bold text-sm">
                                        <BookOpen className="w-4 h-4" />
                                        {cls._count?.courses || 0}
                                    </Link>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(cls as any).isActive !== false ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {(cls as any).isActive !== false ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link to={`${basePath}/classes/${cls.id}`}>
                                            <button className="p-2 text-brand-text-muted hover:text-white bg-brand-bg hover:bg-brand-sidebar rounded-lg transition-colors border border-transparent hover:border-brand-border" title="Voir détails">
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <Link to={`${basePath}/classes/${cls.id}/edit`}>
                                            <button className="p-2 text-brand-text-muted hover:text-white bg-brand-bg hover:bg-brand-sidebar rounded-lg transition-colors border border-transparent hover:border-brand-border" title="Modifier">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <button 
                                            onClick={() => handleDeleteClick(cls.id)}
                                            className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {classes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-brand-text-muted">
                                    Aucune classe trouvée.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-brand-border bg-brand-sidebar/30 gap-4">
                <div className="text-sm text-brand-text-muted">
                  Affichage de <span className="font-medium text-brand-text">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium text-brand-text">{Math.min(currentPage * itemsPerPage, filteredClasses.length)}</span> sur <span className="font-medium text-brand-text">{filteredClasses.length}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm"
                  >
                    Précédent
                  </button>
                  <div className="flex items-center gap-1 hidden sm:flex">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${currentPage === i + 1 ? 'bg-brand-accent text-white shadow-md' : 'bg-brand-card border border-brand-border text-brand-text hover:bg-brand-sidebar'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-sm"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
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
    </div>
  );
};

export default Classes;
