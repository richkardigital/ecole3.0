import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { CheckSquare, Download, ExternalLink } from 'lucide-react';
import api from '@/lib/api';

interface CorrectionItem {
  id: string;
  title: string;
  correctionUrl: string | null;
  dueDate: string;
  course: {
    id: string;
    subject: { name: string };
    class: { name: string };
  };
  _count?: { submissions: number };
}

const Corrections = () => {
  const { user } = useAuth();
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCorrections = async () => {
      try {
        // Fetch assignments that have corrections
        const res = await api.get('/assignments/corrections');
        setCorrections(res.data || []);
      } catch (error) {
        console.error('Error fetching corrections:', error);
        // Fallback: try to get all courses and their assignments
        try {
          const coursesRes = await api.get('/courses');
          const courses = coursesRes.data || [];
          const allAssignments: CorrectionItem[] = [];
          
          for (const course of courses.slice(0, 10)) {
            try {
              const assignRes = await api.get(`/assignments?courseId=${course.id}`);
              const assignments = assignRes.data || [];
              assignments
                .filter((a: any) => a.correctionUrl)
                .forEach((a: any) => {
                  allAssignments.push({
                    ...a,
                    course: {
                      id: course.id,
                      subject: course.subject || { name: 'N/A' },
                      class: course.class || { name: 'N/A' },
                    }
                  });
                });
            } catch { /* skip */ }
          }
          setCorrections(allAssignments);
        } catch { /* final fallback */ }
      } finally {
        setLoading(false);
      }
    };
    fetchCorrections();
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const columns = [
    {
      key: 'title',
      header: 'Devoir',
      sortable: true,
      render: (item: CorrectionItem) => (
        <div>
          <p className="font-medium text-brand-text">{item.title}</p>
          <p className="text-xs text-brand-text-muted">{item.course.subject.name} — {item.course.class.name}</p>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Échéance',
      sortable: true,
      render: (item: CorrectionItem) => (
        <span className="text-brand-text-muted text-sm">{formatDate(item.dueDate)}</span>
      ),
    },
    {
      key: 'correctionUrl',
      header: 'Corrigé',
      render: (item: CorrectionItem) => (
        item.correctionUrl ? (
          <a
            href={item.correctionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-brand-accent hover:text-brand-accent-hover text-sm transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
            Télécharger
          </a>
        ) : (
          <Badge variant="neutral">Non disponible</Badge>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Corrigés" 
        subtitle="Consultez les corrigés des devoirs et évaluations"
      />

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          data={corrections}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher un devoir..."
          pageSize={10}
          emptyTitle="Aucun corrigé disponible"
          emptyDescription="Les corrigés seront visibles ici une fois publiés par les enseignants."
        />
      )}
    </div>
  );
};

export default Corrections;
