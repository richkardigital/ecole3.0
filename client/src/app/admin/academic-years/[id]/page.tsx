import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Building2, CheckCircle2, XCircle, ArrowLeft, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDateShort = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export default function AcademicYearDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [year, setYear] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchYear = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/academic/years/${id}`);
        setYear(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchYear();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-500">Chargement des détails...</span>
      </div>
    );
  }

  if (!year) {
    return (
      <div className="p-12 text-center">
        <span className="text-sm font-bold text-slate-500">Année scolaire introuvable.</span>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/admin/academic-years')}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Détails de l'Année Scolaire"
        description={`Consultez les informations et le découpage de l'année scolaire`}
      >
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/academic-years')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Retour
          </Button>
          <Link to={`/admin/academic-years/${id}/stats`}>
            <Button variant="primary" leftIcon={<BarChart className="w-4 h-4" />}>
              Statistiques Globales
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8">
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={year.status === 'EN_COURS' ? 'success' : year.status === 'CREE' ? 'warning' : 'neutral'}>
                {year.status === 'EN_COURS' ? 'En cours' : year.status === 'CREE' ? 'Créée' : 'Achevée'}
              </Badge>
              {year.isCurrent && (
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                  ★ Année en cours
                </span>
              )}
              {!year.isActive && <Badge variant="danger">Inactive</Badge>}
            </div>
            <span className="text-[11px] font-bold text-slate-400 font-mono">ID: {year.id}</span>
          </div>
          
          <h3 className="text-3xl font-black text-slate-900 mb-2">{year.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-200/60">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Date de début</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(year.startDate)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Date de fin</span>
              <span className="font-semibold text-slate-800 text-sm">{formatDate(year.endDate)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">Classes rattachées</span>
              <span className="font-bold text-slate-900 text-lg">{year._count?.classes ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" /> Trimestres / Découpage ({year.terms?.length || 0})
          </h4>
          
          {year.terms && year.terms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {year.terms.map((t: any) => (
                <div key={t.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900">{t.name}</p>
                    <Badge variant={t.status === 'OPEN' ? 'success' : 'neutral'}>
                      {t.status === 'OPEN' ? 'Ouvert' : 'Fermé'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {formatDateShort(t.startDate)} → {formatDateShort(t.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-sm text-slate-500 font-medium">Aucun trimestre n'a été défini pour cette année scolaire.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
