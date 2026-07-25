import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      // Pour l'instant, on récupère un tableau vide ou une route si elle existe
      const res = await api.get('/assignments'); // S'assure que la route existe dans le backend (elle pourrait avoir besoin de filtres)
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
      key: 'course',
      header: 'Cours', 
      render: (row: any) => row.course?.subject?.name || 'N/A' 
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
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Link to={`/assignments/${row.id}`}>
            <Button variant="ghost" size="sm" className="text-brand-accent">
              <Eye className="w-4 h-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Devoirs" 
        description="Gérez les devoirs, consultez les détails et corrigez les soumissions."
      >
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Programmer un devoir
        </Button>
      </PageHeader>

      <div className="bg-brand-card rounded-xl border border-brand-border overflow-hidden">
        <DataTable
          columns={columns}
          data={assignments}
          loading={loading}
          emptyMessage="Aucun devoir trouvé."
        />
      </div>
    </div>
  );
}
