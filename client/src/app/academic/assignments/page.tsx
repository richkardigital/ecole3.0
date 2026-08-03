import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Eye, Edit2, Trash2, LayoutGrid, List, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'recent' | 'corrected' | 'uncorrected'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments?global=true');
      setAssignments(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const columns = [
    { key: 'title', header: 'Titre' },
    { 
      key: 'niveau',
      header: 'Niveau', 
      render: (row: any) => row.niveau?.name || 'N/A' 
    },
    { 
      key: 'dueDate',
      header: 'Date limite', 
      render: (row: any) => new Date(row.dueDate).toLocaleDateString() 
    },
    { key: 'points', header: 'Points' },
    { key: 'coefficient', header: 'Coefficient' },
    {
      key: 'actions',
      header: 'Action',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Link to={`/assignments/${row.id}`}>
            <Button variant="primary" size="sm" className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              Faire le devoir
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const filteredAssignments = assignments.filter((a: any) => {
    if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    
    if (filter === 'corrected') {
      return a.correction !== null && a.correction !== undefined;
    }
    if (filter === 'uncorrected') {
      return !a.correction;
    }
    return true; // For 'recent', we'll rely on the default sort order from API or sort it here
  });

  // Basic client-side sort for 'recent' just in case
  if (filter === 'recent') {
      filteredAssignments.sort((a: any, b: any) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime());
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Devoirs de niveau" 
        description="Consultez les devoirs programmés par la direction pour votre classe."
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-brand-card p-4 rounded-xl border border-brand-border">
          <input 
              type="text" 
              placeholder="Rechercher par titre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
          />
          <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-brand-sidebar p-1 rounded-lg border border-brand-border/50 mr-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-card shadow-sm text-brand-text' : 'text-brand-text-muted hover:text-brand-text'}`}
                  title="Vue Liste"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-brand-card shadow-sm text-brand-text' : 'text-brand-text-muted hover:text-brand-text'}`}
                  title="Vue Grille"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button 
                  onClick={() => setFilter('recent')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'recent' ? 'bg-brand-accent text-white' : 'bg-brand-sidebar text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent'}`}
              >
                  Récentes
              </button>
              <button 
                  onClick={() => setFilter('corrected')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'corrected' ? 'bg-brand-accent text-white' : 'bg-brand-sidebar text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent'}`}
              >
                  Corrigé
              </button>
              <button 
                  onClick={() => setFilter('uncorrected')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'uncorrected' ? 'bg-brand-accent text-white' : 'bg-brand-sidebar text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent'}`}
              >
                  Non corrigé
              </button>
          </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-brand-card rounded-xl border border-brand-border overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredAssignments}
            loading={loading}
            emptyMessage="Aucun devoir trouvé."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.length === 0 && !loading && (
            <div className="col-span-full text-center text-brand-text-muted italic py-10 bg-brand-card rounded-xl border border-dashed border-brand-border">Aucun devoir trouvé.</div>
          )}
          {loading && (
            <div className="col-span-full text-center py-10 text-brand-text-muted">Chargement...</div>
          )}
          {!loading && filteredAssignments.map((assignment: any) => (
            <div key={assignment.id} className="bg-brand-card p-6 rounded-xl border border-brand-border/50 hover:shadow-lg transition-all duration-300 hover:border-brand-accent/50 group relative">
                <Link to={`/assignments/${assignment.id}`} className="block h-full">
                <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-brand-accent/10 p-2 rounded-lg text-brand-accent">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-bold bg-brand-sidebar border border-brand-border/50 text-brand-text px-2 py-1 rounded">
                              Coef: {assignment.coefficient}
                          </span>
                        </div>
                    </div>
                    <h3 className="font-semibold text-brand-text mb-1 line-clamp-1 group-hover:text-brand-accent transition-colors">{assignment.title}</h3>
                    <p className="text-sm font-medium text-brand-accent/80 mb-4">{assignment.niveau?.name || 'N/A'}</p>
                    
                    <div className="mt-auto pt-4 border-t border-brand-border/50 space-y-3">
                        <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-brand-text-muted">Limite: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                            <span className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-full font-bold">{assignment.points} pts</span>
                        </div>
                        <Button variant="primary" size="sm" className="w-full flex items-center justify-center gap-1">
                            <Eye className="w-4 h-4" />
                            Faire le devoir
                        </Button>
                    </div>
                </div>
                </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
