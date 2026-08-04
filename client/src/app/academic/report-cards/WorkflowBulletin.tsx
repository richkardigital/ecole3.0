import { useState } from 'react';
import {
  CheckCircle2, XCircle, Clock, ChevronRight, Eye, AlertCircle,
  Users, TrendingUp, Award, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

interface BulletinItem {
  id: string;
  statut: string;
  moyenneGenerale: number | null;
  rangClasse: number | null;
  nombreEleves: number | null;
  totalAbsences: number;
  rejetCommentaire: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    avatarUrl?: string;
  };
  class?: { id: string; name: string };
  term?: { id: string; name: string };
  soumisPar?: { firstName: string; lastName: string } | null;
  valideEducateurPar?: { firstName: string; lastName: string } | null;
  valideDirecteurPar?: { firstName: string; lastName: string } | null;
}

interface Props {
  bulletins: BulletinItem[];
  userRole: string;
  onAction: () => void; // Callback pour rafraîchir
  onViewBulletin?: (studentId: string, termId: string) => void;
  termId?: string;
  classId?: string;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  BROUILLON: { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  SOUMIS_ENSEIGNANT: { label: 'Soumis', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  VALIDE_EDUCATEUR: { label: 'Éducateur ✓', color: 'text-orange-700', bg: 'bg-orange-50', dot: 'bg-orange-500' },
  VALIDE_DIRECTEUR: { label: 'Directeur ✓', color: 'text-purple-700', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  VALIDE_SUPER_ADMIN: { label: 'Validé ✓', color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  REJETE: { label: 'Rejeté', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
};

const ROLE_ACTION: Record<string, { canValidate: string; actionLabel: string }> = {
  EDUCATEUR: { canValidate: 'SOUMIS_ENSEIGNANT', actionLabel: 'Valider (Éducateur)' },
  DIRECTEUR: { canValidate: 'VALIDE_EDUCATEUR', actionLabel: 'Valider (Directeur)' },
  SUPER_ADMIN: { canValidate: 'VALIDE_DIRECTEUR', actionLabel: 'Validation Finale' },
};

export default function WorkflowBulletin({ bulletins, userRole, onAction, onViewBulletin, termId, classId }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; open: boolean }>({ id: '', open: false });
  const [rejectComment, setRejectComment] = useState('');
  const [filterStatut, setFilterStatut] = useState<string>('ALL');
  const [comment, setComment] = useState('');
  const [showCommentModal, setShowCommentModal] = useState<{ id: string; type: 'educateur' | 'directeur' } | null>(null);

  const roleConfig = ROLE_ACTION[userRole];

  const filtered = filterStatut === 'ALL'
    ? bulletins
    : bulletins.filter(b => b.statut === filterStatut);

  const stats = {
    total: bulletins.length,
    brouillon: bulletins.filter(b => b.statut === 'BROUILLON').length,
    soumis: bulletins.filter(b => b.statut === 'SOUMIS_ENSEIGNANT').length,
    valideEducateur: bulletins.filter(b => b.statut === 'VALIDE_EDUCATEUR').length,
    valideDirecteur: bulletins.filter(b => b.statut === 'VALIDE_DIRECTEUR').length,
    valideFinal: bulletins.filter(b => b.statut === 'VALIDE_SUPER_ADMIN').length,
    rejete: bulletins.filter(b => b.statut === 'REJETE').length,
  };

  const handleValidate = async (bulletinId: string) => {
    setLoading(bulletinId);
    setError(null);
    try {
      const body: any = {};
      if (userRole === 'EDUCATEUR' && comment) body.commentaireEducateur = comment;
      if (userRole === 'DIRECTEUR' && comment) body.commentaireDirecteur = comment;

      await api.post(`/bulletins/${bulletinId}/valider`, body);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setLoading(null);
      setComment('');
      setShowCommentModal(null);
    }
  };

  const handleValidateAll = async () => {
    if (!termId || !classId) return;
    setLoading('batch');
    setError(null);
    try {
      const body: any = { termId, classId };
      if (userRole === 'EDUCATEUR' && comment) body.commentaireEducateur = comment;
      if (userRole === 'DIRECTEUR' && comment) body.commentaireDirecteur = comment;
      await api.post('/bulletins/valider-classe', body);
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la validation en lot');
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
    setLoading(rejectModal.id);
    try {
      await api.post(`/bulletins/${rejectModal.id}/rejeter`, {
        commentaire: rejectComment || 'Bulletin rejeté',
      });
      setRejectModal({ id: '', open: false });
      setRejectComment('');
      onAction();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setLoading(null);
    }
  };

  const pendingCount = bulletins.filter(b => b.statut === roleConfig?.canValidate).length;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Brouillon', value: stats.brouillon, color: 'text-gray-600', bg: 'bg-gray-100' },
          { label: 'Soumis', value: stats.soumis, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Éducateur ✓', value: stats.valideEducateur, color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Directeur ✓', value: stats.valideDirecteur, color: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'Validés ✓', value: stats.valideFinal, color: 'text-green-700', bg: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-gray-200/60`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Actions batch */}
      {roleConfig && pendingCount > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="font-semibold">{pendingCount} bulletin(s) en attente de votre validation</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleValidateAll}
            isLoading={loading === 'batch'}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Tout Valider
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Filtre statut */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['ALL', 'BROUILLON', 'SOUMIS_ENSEIGNANT', 'VALIDE_EDUCATEUR', 'VALIDE_DIRECTEUR', 'VALIDE_SUPER_ADMIN', 'REJETE'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatut(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              filterStatut === s
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {s === 'ALL' ? 'Tous' : STATUT_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      {/* Liste bulletins */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Élève</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Moyenne</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Rang</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Absences</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Statut</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((bulletin) => {
              const sConfig = STATUT_CONFIG[bulletin.statut] ?? STATUT_CONFIG.BROUILLON;
              const canValidate = roleConfig && bulletin.statut === roleConfig.canValidate;
              const canReject = ['EDUCATEUR', 'DIRECTEUR', 'SUPER_ADMIN'].includes(userRole) &&
                ['SOUMIS_ENSEIGNANT', 'VALIDE_EDUCATEUR', 'VALIDE_DIRECTEUR'].includes(bulletin.statut);

              return (
                <tr key={bulletin.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {bulletin.student.lastName} {bulletin.student.firstName}
                    </p>
                    {bulletin.student.matricule && (
                      <p className="text-xs text-gray-400">Matr. {bulletin.student.matricule}</p>
                    )}
                    {bulletin.rejetCommentaire && (
                      <p className="text-xs text-red-500 mt-0.5 italic">↩ {bulletin.rejetCommentaire}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {bulletin.moyenneGenerale !== null ? (
                      <span className={`font-bold text-base ${bulletin.moyenneGenerale >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {bulletin.moyenneGenerale.toFixed(2)}
                        <span className="text-xs text-gray-400 font-normal">/20</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Non calculé</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {bulletin.rangClasse ? (
                      <span className="font-semibold text-gray-700">
                        {bulletin.rangClasse}<sup>e</sup>/{bulletin.nombreEleves}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${bulletin.totalAbsences > 5 ? 'text-red-500' : 'text-gray-600'}`}>
                      {bulletin.totalAbsences}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sConfig.bg} ${sConfig.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sConfig.dot}`} />
                      {sConfig.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {onViewBulletin && bulletin.term && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewBulletin(bulletin.student.id, bulletin.term!.id)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Voir
                        </Button>
                      )}
                      {canValidate && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleValidate(bulletin.id)}
                          isLoading={loading === bulletin.id}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Valider
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectModal({ id: bulletin.id, open: true })}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Rejeter
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <Users className="w-10 h-10 opacity-20 mx-auto mb-2" />
                  <p>Aucun bulletin trouvé</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal rejet */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rejeter le bulletin</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ajoutez un commentaire expliquant les raisons du rejet.
            </p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Raison du rejet..."
              className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setRejectModal({ id: '', open: false }); setRejectComment(''); }}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleReject}
                isLoading={loading === rejectModal.id}
              >
                Confirmer le rejet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
