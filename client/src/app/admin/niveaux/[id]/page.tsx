import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, School as SchoolIcon, Building2 } from 'lucide-react';

interface NiveauDetails {
  id: string;
  nom: string;
  rang: number;
  isActive: boolean;
  _count?: { classes: number };
  classes?: { id: string; name: string; school?: { name: string; ville?: string } }[];
}

export default function NiveauDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [niveau, setNiveau] = useState<NiveauDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNiveau = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/niveaux/${id}`);
        setNiveau(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNiveau();
  }, [id]);

  const generateSlug = (nom: string) =>
    nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-500">Chargement des détails du niveau...</span>
      </div>
    );
  }

  if (!niveau) {
    return (
      <div className="p-12 text-center">
        <span className="text-sm font-bold text-slate-500">Niveau scolaire introuvable.</span>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate('/admin/niveaux')}>Retour</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Détails du Niveau : ${niveau.nom}`}
        description="Consultez les informations de ce niveau scolaire et la liste des classes rattachées."
      >
        <Button variant="secondary" onClick={() => navigate('/admin/niveaux')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Retour aux niveaux
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8">
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <Badge variant={niveau.isActive ? 'success' : 'danger'}>
              {niveau.isActive ? 'Actif' : 'Inactif'}
            </Badge>
            <span className="text-[11px] font-bold text-slate-400 font-mono">Rang: #{niveau.rang || 0}</span>
          </div>
          
          <h3 className="text-3xl font-black text-slate-900 mb-2">{niveau.nom}</h3>
          <p className="text-sm font-mono text-emerald-700 font-bold mb-6">slug: {generateSlug(niveau.nom)}</p>
          
          <div className="pt-4 border-t border-slate-200/60">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">Nombre total de classes</span>
            <span className="font-bold text-slate-900 text-lg">{niveau._count?.classes ?? niveau.classes?.length ?? 0}</span>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-emerald-600" /> Liste des classes rattachées
          </h4>
          
          {niveau.classes && niveau.classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {niveau.classes.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:border-slate-300">
                  <span className="font-bold text-slate-900 text-base">{c.name}</span>
                  {c.school && (
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" /> 
                      {c.school.name} {c.school.ville && `(${c.school.ville})`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-sm text-slate-500 font-medium">Aucune classe n'est rattachée à ce niveau pour le moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
