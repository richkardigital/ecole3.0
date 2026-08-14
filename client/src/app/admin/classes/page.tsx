import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  GraduationCap, 
  Users, 
  BookOpen, 
  AlertCircle, 
  Edit, 
  Loader2, 
  FileSpreadsheet, 
  Filter, 
  Search, 
  School, 
  Building2,
  UserCheck,
  Eye,
  UserPlus,
  Sparkles
} from 'lucide-react';
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
  niveau?: { id: string; nom: string };
  school?: { id: string; name: string; ville?: string };
  schoolId?: string;
  academicYear?: { id: string; name: string };
  teacherClasses?: any[];
  _count?: {
    enrollments: number;
    courses: number;
    teacherClasses?: number;
  };
}

const Classes = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isEducateur = user?.role === 'EDUCATEUR';
  const isDirecteur = user?.role === 'DIRECTEUR';

  const basePath = isSuperAdmin ? '/admin' : isEducateur ? '/educateur' : '/directeur';
  
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const itemsPerPage = 15;

  const uniqueLevels = useMemo(() => {
    const levels = new Set<string>();
    classes.forEach(c => {
      const levelName = c.niveau?.nom || c.level;
      if (levelName) levels.add(levelName);
    });
    return Array.from(levels).sort();
  }, [classes]);

  const uniqueSchools = useMemo(() => {
    const schools = new Map<string, string>();
    classes.forEach(c => {
      if (c.school?.name) {
        schools.set(c.school.name, c.school.name);
      }
    });
    return Array.from(schools.values()).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const levelName = c.niveau?.nom || c.level || '';
      const schoolName = c.school?.name || '';
      const className = c.name || '';

      const matchesSearch = searchQuery === '' || 
        className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        levelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schoolName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLevel = !selectedLevel || levelName === selectedLevel;
      const matchesSchool = !selectedSchool || schoolName === selectedSchool;

      return matchesSearch && matchesLevel && matchesSchool;
    });
  }, [classes, searchQuery, selectedLevel, selectedSchool]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClasses.slice(start, start + itemsPerPage);
  }, [filteredClasses, currentPage]);

  const totalStudentsCount = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
  }, [classes]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
  }, [searchQuery, selectedLevel, selectedSchool]);

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
        "Niveau": c.niveau?.nom || c.level || '',
        "Établissement": c.school?.name || '',
        "Effectif Élèves": c._count?.enrollments || 0,
        "Nombre de Cours": c._count?.courses || 0,
        "Enseignants affectés": c.teacherClasses?.length || c._count?.teacherClasses || 0
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    XLSX.writeFile(wb, "classes_ecole_connectee.xlsx");
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleDeleteClick = (id: string) => {
    setClassToDelete(id);
    setIsDeleteModalOpen(true);
  };

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
  };

  const pageTitle = isSuperAdmin 
    ? "Toutes les Classes du Réseau" 
    : isEducateur 
      ? "Classes & Vie Scolaire" 
      : "Gestion des Classes";

  const pageSubtitle = isSuperAdmin
    ? `Supervision générale de l'ensemble des ${classes.length} classes réparties sur la plateforme nationale.`
    : isEducateur
      ? "Consultez les effectifs, registres d'élèves et accès aux bulletins de votre établissement."
      : "Organisez vos classes, affectez les niveaux officiels et supervisez les effectifs et enseignants.";

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader 
        title={pageTitle}
        subtitle={pageSubtitle}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="shadow-xs">
              <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
              Exporter Excel
            </Button>
            {isDirecteur && (
              <Link to={`${basePath}/classes/new`}>
                <Button variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
                  Nouvelle classe
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* ── KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-text-muted uppercase">Total Classes</span>
            <p className="text-xl font-black text-brand-text mt-0.5">{classes.length}</p>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-text-muted uppercase">Élèves Inscrits</span>
            <p className="text-xl font-black text-brand-text mt-0.5">{totalStudentsCount}</p>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-brand-text-muted uppercase">Moyenne par classe</span>
            <p className="text-xl font-black text-brand-text mt-0.5">
              {classes.length > 0 ? (totalStudentsCount / classes.length).toFixed(1) : 0} élèves
            </p>
          </div>
        </div>
      </div>

      {/* ── FILTRES & RECHERCHE ── */}
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher une classe (ex: 4ème A)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-brand-sidebar border border-brand-border rounded-xl text-sm text-brand-text placeholder-brand-text-muted focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isSuperAdmin && uniqueSchools.length > 1 && (
            <div className="relative min-w-[180px]">
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-brand-sidebar border border-brand-border rounded-xl text-sm text-brand-text focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none appearance-none cursor-pointer"
              >
                <option value="">Tous les établissements</option>
                {uniqueSchools.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <School className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          )}

          <div className="relative min-w-[160px]">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-brand-sidebar border border-brand-border rounded-xl text-sm text-brand-text focus:ring-2 focus:ring-brand-accent focus:border-transparent outline-none appearance-none cursor-pointer"
            >
              <option value="">Tous les niveaux</option>
              {uniqueLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {(searchQuery || selectedLevel || selectedSchool) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedLevel('');
                setSelectedSchool('');
              }}
              className="text-xs text-brand-text-muted hover:text-brand-text"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

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
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap">Classe & Niveau</th>
                  {isSuperAdmin && (
                    <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap">Établissement</th>
                  )}
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap text-center">Effectif Élèves</th>
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap text-center">Matières & Cours</th>
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap text-center">Enseignants Affectés</th>
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap">Statut</th>
                  <th className="p-4 font-bold text-brand-text-muted text-xs uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
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
                        <div>
                          <Link 
                            to={`${basePath}/classes/${cls.id}`} 
                            className="font-bold text-brand-text hover:text-brand-accent transition-colors block"
                          >
                            {cls.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {cls.niveau?.nom || cls.level ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-bold">
                                {cls.niveau?.nom || cls.level}
                              </span>
                            ) : (
                              <span className="text-xs text-brand-text-muted">Niveau non défini</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {isSuperAdmin && (
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {cls.school?.name || 'Établissement principal'}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="p-4 text-center">
                      <Link 
                        to={`${basePath}/classes/${cls.id}?tab=students`} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition-colors font-bold text-xs border border-blue-500/20"
                        title="Voir la liste des élèves"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {cls._count?.enrollments || 0} élèves
                      </Link>
                    </td>

                    <td className="p-4 text-center">
                      <Link 
                        to={`${basePath}/classes/${cls.id}?tab=courses`} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl transition-colors font-bold text-xs border border-purple-500/20"
                        title="Consulter les cours de ce niveau"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {cls._count?.courses || 0} cours
                      </Link>
                    </td>

                    <td className="p-4 text-center">
                      <Link 
                        to={`${basePath}/classes/${cls.id}?tab=teachers`} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl transition-colors font-bold text-xs border border-amber-500/20"
                        title="Gérer les affectations enseignants"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {cls.teacherClasses?.length || cls._count?.teacherClasses || 0} profs
                      </Link>
                    </td>

                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(cls as any).isActive !== false ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {(cls as any).isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link to={`${basePath}/classes/${cls.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-bold gap-1 text-brand-accent border-brand-accent/30 hover:bg-brand-accent/10">
                            <Eye className="w-3.5 h-3.5" />
                            Voir
                          </Button>
                        </Link>

                        <Link to={`${basePath}/classes/${cls.id}?tab=teachers`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold gap-1 text-brand-text-muted hover:text-brand-text">
                            <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                            Affecter
                          </Button>
                        </Link>

                        {isDirecteur && (
                          <>
                            <Link to={`${basePath}/classes/${cls.id}/edit`}>
                              <button className="p-2 text-brand-text-muted hover:text-blue-500 bg-brand-sidebar hover:bg-brand-border rounded-lg transition-colors border border-brand-border" title="Modifier la classe">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </Link>
                            <button 
                              onClick={() => handleDeleteClick(cls.id)}
                              className="p-2 text-red-400 hover:text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                              title="Supprimer la classe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClasses.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="p-8 text-center text-brand-text-muted">
                      Aucune classe trouvée correspondant aux critères.
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
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-xs cursor-pointer"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1 hidden sm:flex">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-lg transition-colors cursor-pointer ${currentPage === i + 1 ? 'bg-brand-accent text-white shadow-xs' : 'bg-brand-card border border-brand-border text-brand-text hover:bg-brand-sidebar'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-brand-card border border-brand-border rounded-lg hover:bg-brand-sidebar disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition-colors font-medium shadow-xs cursor-pointer"
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
        message="Êtes-vous sûr de vouloir supprimer cette classe ? Cette action supprimera également toutes les données associées (élèves inscrits, affectations de cours, etc.)."
        confirmText="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};

export default Classes;
