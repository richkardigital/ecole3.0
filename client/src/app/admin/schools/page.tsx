import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Trash2, User, Edit2, Lock, Unlock, School as SchoolIcon, Loader2, BookOpen, FileSpreadsheet, Eye, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';

interface School {
  id: string;
  name: string;
  code?: string;
  address?: string;
  ville?: string;
  phone?: string;
  email?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  managerId?: string;
  teachingTypeId?: string;
  teachingType?: { id: string; name: string };
  schoolType?: { id: string; name: string };
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    users: number;
    classes: number;
  };
}

const Schools = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [teachingTypeFilter, setTeachingTypeFilter] = useState('ALL');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState('ALL');

  const filteredSchools = schools.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || 
                        (s.code && s.code.toLowerCase().includes(q)) || 
                        (s.ville && s.ville.toLowerCase().includes(q));
    const matchTT = teachingTypeFilter === 'ALL' || s.teachingType?.name === teachingTypeFilter;
    const matchST = schoolTypeFilter === 'ALL' || s.schoolType?.name === schoolTypeFilter;
    return matchSearch && matchTT && matchST;
  });

  const sortedSchools = [...filteredSchools].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(schools.map(s => ({
        "Code": s.code || '',
        "Nom": s.name,
        "Ville": s.ville || '',
        "Adresse": s.address || '',
        "Type": s.teachingType?.name || '',
        "Directeur": s.manager ? s.manager.firstName + ' ' + s.manager.lastName : ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ecoles");
    XLSX.writeFile(wb, "ecoles.xlsx");
  };

  const fetchSchools = async () => {
    try {
      const response = await api.get('/schools');
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools', error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const confirmDelete = (id: string) => {
      setSchoolToDelete(id);
      setIsDeleteModalOpen(true);
  }

  const handleDelete = async () => {
    if (schoolToDelete) {
      try {
        await api.delete(`/schools/${schoolToDelete}`);
        fetchSchools();
      } catch (error) {
        console.error('Error deleting school', error);
        alert('Impossible de supprimer cette école');
      }
    }
  };

  const toggleStatus = async (school: School) => {
      try {
          await api.put(`/schools/${school.id}`, {
              isActive: !school.isActive
          });
          fetchSchools();
      } catch (error) {
          console.error('Error updating status', error);
      }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Réseau d'Écoles"
        subtitle="Gérez l'ensemble des établissements du réseau"
        action={
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                title={sortOrder === 'desc' ? "Afficher les plus anciennes en premier" : "Afficher les plus récentes en premier"}
              >
                Trier: {sortOrder === 'desc' ? 'Récentes' : 'Anciennes'}
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exporter Excel
              </Button>
              <div className="relative group">
                <Link to="/admin/schools/new">
                  <Button 
                      variant="primary"
                      leftIcon={<Plus className="w-4 h-4" />}
                  >
                      Ajouter une école
                  </Button>
                </Link>
              </div>
          </div>
        }
      />

      {isLoading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-brand-accent" />
          </div>
      ) : (
          <div className="bg-brand-card shadow-lg rounded-2xl overflow-hidden border border-brand-border">
            <div className="p-4 border-b border-brand-border/50 bg-brand-sidebar/30 flex flex-col md:flex-row gap-4 items-center justify-between">
               <div className="relative w-full md:w-80">
                   <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                   <input 
                       type="text"
                       placeholder="Rechercher une école, ville, code..."
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                       className="w-full pl-9 pr-4 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                   />
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                   <select 
                       value={teachingTypeFilter}
                       onChange={e => setTeachingTypeFilter(e.target.value)}
                       className="px-3 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer"
                   >
                       <option value="ALL">Tous types d'enseignement</option>
                       {Array.from(new Set(schools.map(s => s.teachingType?.name).filter(Boolean))).map(tt => (
                           <option key={tt as string} value={tt as string}>{tt as string}</option>
                       ))}
                   </select>
                   <select 
                       value={schoolTypeFilter}
                       onChange={e => setSchoolTypeFilter(e.target.value)}
                       className="px-3 py-2 text-sm bg-brand-card border border-brand-border rounded-xl text-brand-text outline-none focus:border-brand-accent transition-all cursor-pointer"
                   >
                       <option value="ALL">Tous secteurs</option>
                       {Array.from(new Set(schools.map(s => s.schoolType?.name).filter(Boolean))).map(st => (
                           <option key={st as string} value={st as string}>{st as string}</option>
                       ))}
                   </select>
               </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-brand-border">
                <thead className="bg-brand-sidebar">
                    <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Établissement</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Localisation</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Direction</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Métriques</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border bg-brand-card">
                    {sortedSchools.map((school) => (
                    <tr key={school.id} className={`hover:bg-brand-sidebar/50 transition-colors ${!school.isActive ? 'opacity-75' : ''}`}>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <button 
                                onClick={() => toggleStatus(school)}
                                className={`p-2 rounded-xl transition-colors ${school.isActive ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20'}`}
                                title={school.isActive ? "Désactiver l'école" : "Activer l'école"}
                            >
                                {school.isActive ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            </button>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-sidebar rounded-lg border border-brand-border">
                                    <SchoolIcon className="w-5 h-5 text-brand-accent" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-brand-text">{school.name}</div>
                                    {!school.isActive && <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">Suspendue</span>}
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-brand-text-muted">{school.address || '-'}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 bg-brand-accent/20 rounded-full flex items-center justify-center border border-brand-accent/30">
                                <User className="w-4 h-4 text-brand-accent" />
                            </div>
                            <div className="ml-3">
                            <div className="text-sm font-semibold text-brand-text">
                                {school.manager ? `${school.manager.firstName} ${school.manager.lastName}` : 'Non assigné'}
                            </div>
                            <div className="text-xs text-brand-text-muted">{school.manager?.email || '-'}</div>
                            </div>
                        </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                                    <User className="w-3 h-3" /> {school._count?.users || 0} membres
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 w-fit">
                                    <BookOpen className="w-3 h-3" /> {school._count?.classes || 0} classes
                                </span>
                            </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                                <Link to={`/admin/schools/${school.id}`} className="text-brand-accent hover:text-white bg-brand-sidebar hover:bg-brand-border p-2 rounded-lg transition-colors border border-transparent hover:border-brand-border" title="Voir les détails">
                                    <Eye className="w-4 h-4" />
                                </Link>
                                <Link to={`/admin/schools/${school.id}/edit`} className="text-brand-text-muted hover:text-white bg-brand-sidebar hover:bg-brand-border p-2 rounded-lg transition-colors border border-transparent hover:border-brand-border" title="Modifier">
                                    <Edit2 className="w-4 h-4" />
                                </Link>
                                <button onClick={() => confirmDelete(school.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg transition-colors" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                    {schools.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-16 text-center">
                                <SchoolIcon className="w-12 h-12 text-brand-border mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-brand-text">Aucune école</h3>
                                <p className="text-brand-text-muted mt-1">Commencez par ajouter votre premier établissement.</p>
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'établissement"
        message="Attention : la suppression d'une école entraîne la suppression définitive de tous les utilisateurs, classes et données qui y sont liés."
        confirmText="Supprimer définitivement"
        variant="danger"
      />
    </div>
  );
};

export default Schools;
