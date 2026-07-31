import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, ArrowLeft, Save, Building2, CheckSquare, Square } from 'lucide-react';

interface SchoolModel {
  id: string;
  name: string;
  ville?: string;
}

export default function AcademicYearSchoolsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolModel[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [yearName, setYearName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [schoolsRes, yearRes] = await Promise.all([
          api.get('/schools'),
          api.get(`/academic/years/${id}`)
        ]);
        
        setSchools(schoolsRes.data);
        setYearName(yearRes.data.name);
        
        const attachedSchools = yearRes.data.schools?.map((s: any) => s.id) || [];
        setSelectedSchoolIds(attachedSchools);
      } catch (err) {
        console.error(err);
        showToast("Erreur de chargement", 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleToggleSchool = (schoolId: string) => {
    setSelectedSchoolIds(prev => 
      prev.includes(schoolId) 
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSchoolIds.length === schools.length) {
      setSelectedSchoolIds([]);
    } else {
      setSelectedSchoolIds(schools.map(s => s.id));
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await api.put(`/academic/years/${id}`, { schoolIds: selectedSchoolIds });
      showToast("Les établissements ont été mis à jour avec succès.");
      setTimeout(() => navigate('/admin/academic-years'), 1500);
    } catch (error) {
      showToast("Erreur lors de l'enregistrement", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isAllSelected = schools.length > 0 && selectedSchoolIds.length === schools.length;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold flex items-center gap-3 animate-fade-in-up ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          {toastMessage.text}
        </div>
      )}

      <PageHeader
        title="Gérer les Établissements"
        description={`Ajoutez ou retirez des établissements pour l'année scolaire : ${yearName}`}
      >
        <Button variant="secondary" onClick={() => navigate('/admin/academic-years')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Retour
        </Button>
      </PageHeader>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Écoles disponibles</h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedSchoolIds.length} sur {schools.length} école(s) sélectionnée(s)
            </p>
          </div>
          <Button variant="secondary" onClick={handleSelectAll} leftIcon={isAllSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}>
            {isAllSelected ? 'Désélectionner tout' : 'Tout sélectionner'}
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-500">Chargement des établissements...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.map(school => {
              const isSelected = selectedSchoolIds.includes(school.id);
              return (
                <label 
                  key={school.id} 
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSchool(school.id)}
                    className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {school.name}
                    </span>
                    <span className="text-xs font-medium text-slate-500 mt-1 block">
                      Ville: {school.ville || 'Abidjan'}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/academic-years')}>Annuler</Button>
          <Button variant="glow" onClick={handleSave} isLoading={submitting} leftIcon={<Save className="w-4 h-4" />}>
            Enregistrer les modifications
          </Button>
        </div>
      </div>
    </div>
  );
}
