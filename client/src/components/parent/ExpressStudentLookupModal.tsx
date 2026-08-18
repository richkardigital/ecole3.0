import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, UserCheck, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ExpressStudentLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (studentData: any) => void;
}

const DEMO_STUDENT_CHIPS = [
  { matricule: 'MAT-2026-4A00', name: 'Jean Koffi', birthDate: '2012-05-14' },
  { matricule: 'MAT-2026-4A02', name: 'Bamba Fatoumata', birthDate: '2012-08-22' },
  { matricule: 'MAT-2026-4A09', name: 'Sylla Mariam', birthDate: '2011-11-03' },
];

export const ExpressStudentLookupModal = ({
  isOpen,
  onClose,
}: ExpressStudentLookupModalProps) => {
  const navigate = useNavigate();
  const [matricule, setMatricule] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricule.trim()) {
      setError("Veuillez saisir le matricule de l'enfant.");
      return;
    }
    if (!birthDate) {
      setError("Veuillez renseigner la date de naissance de l'enfant.");
      return;
    }

    setError(null);
    onClose();
    navigate(`/suivi-enfant?matricule=${encodeURIComponent(matricule.trim().toUpperCase())}&birthDate=${encodeURIComponent(birthDate)}`);
  };

  const handleSelectChip = (chip: typeof DEMO_STUDENT_CHIPS[0]) => {
    setMatricule(chip.matricule);
    setBirthDate(chip.birthDate);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Accès direct parent • Suivez votre enfant"
      size="md"
      accentColor="cyan"
    >
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-sky-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-900">Suivi Scolaire</h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Consultez instantanément les présences, devoirs à faire, notes et bulletins certifiés de votre enfant en saisissant son matricule et sa date de naissance.
            </p>
          </div>
        </div>

        {/* Demo Quick Select */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Exemples démo rapides :</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_STUDENT_CHIPS.map((chip) => (
              <button
                key={chip.matricule}
                type="button"
                onClick={() => handleSelectChip(chip)}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-all flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>{chip.name}</span>
                <span className="text-[10px] font-mono text-slate-400">({chip.matricule})</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Matricule de l'Élève <span className="text-pink-600">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: MAT-2026-4A00"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-600/10 outline-none uppercase font-mono"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Fourni sur la carte scolaire ou le reçu d'inscription.</p>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
              Date de Naissance de l'Élève <span className="text-pink-600">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-pink-600 focus:ring-2 focus:ring-pink-600/10 outline-none"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Sert de clé de sécurité confidentielle.</p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              className="w-1/3"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-2/3 bg-pink-600 hover:bg-pink-700 text-white font-black shadow-md shadow-pink-600/20"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Consulter le Dossier
            </Button>
          </div>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Accès certifié & conforme aux normes du Ministère de l'Éducation Nationale</span>
        </div>
      </div>
    </Modal>
  );
};
