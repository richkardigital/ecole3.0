import { useRef } from 'react';
import { Printer, Download, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BulletinData {
  bulletin: {
    id: string;
    statut: string;
    moyenneGenerale: number | null;
    noteConduite: number | null;
    noteParticipation: number | null;
    rangClasse: number | null;
    nombreEleves: number | null;
    totalAbsences: number;
    absencesJustifiees: number;
    appreciationGenerale: string | null;
    commentaireEducateur: string | null;
    commentaireDirecteur: string | null;
    soumisPar?: { firstName: string; lastName: string } | null;
    valideEducateurPar?: { firstName: string; lastName: string } | null;
    valideDirecteurPar?: { firstName: string; lastName: string } | null;
  } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    class: string;
    niveau?: string | null;
  };
  school: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  } | null;
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    academicYear?: { name: string };
  } | null;
  subjects: {
    courseId: string;
    subjectName: string;
    subjectCode?: string;
    coefficient: number;
    teacher: string;
    average: number | null;
    appreciation: string;
    avgDevoirs: number | null;
    avgEval: number | null;
    avgQuiz: number | null;
    avgParticipation: number | null;
  }[];
  overallAverage: number | null;
  rangClasse: number | null;
  nombreEleves: number | null;
  conduct: {
    appreciation?: string;
    comment?: string;
    grade?: number | null;
  } | null;
  totalAbsences: number;
  absencesJustifiees: number;
  termsSummary?: {
    termId: string;
    termName: string;
    overallAverage: number | null;
    statut: string | null;
  }[];
  annualAverage: number | null;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  BROUILLON: { label: 'Brouillon', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  SOUMIS_ENSEIGNANT: { label: 'Soumis', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  VALIDE_EDUCATEUR: { label: 'Validé (Éducateur)', color: 'text-orange-700', bg: 'bg-orange-100', icon: CheckCircle },
  VALIDE_DIRECTEUR: { label: 'Validé (Directeur)', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle },
  VALIDE_SUPER_ADMIN: { label: 'Bulletin Final', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
  REJETE: { label: 'Rejeté', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

const getAvgColor = (avg: number | null): string => {
  if (avg === null) return 'text-gray-400';
  if (avg >= 14) return 'text-emerald-600';
  if (avg >= 10) return 'text-blue-600';
  return 'text-red-500';
};

const formatAvg = (avg: number | null): string =>
  avg !== null ? avg.toFixed(2) : '—';

interface Props {
  data: BulletinData;
  onClose?: () => void;
}

export default function BulletinIndividuel({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { bulletin, student, school, term, subjects, overallAverage, rangClasse, nombreEleves,
    conduct, totalAbsences, absencesJustifiees, termsSummary, annualAverage } = data;

  const statut = bulletin?.statut ?? 'BROUILLON';
  const statutConfig = STATUT_CONFIG[statut] ?? STATUT_CONFIG.BROUILLON;
  const StatutIcon = statutConfig.icon;

  const handlePrint = () => window.print();

  const anneeLabel = term?.academicYear?.name ?? (
    term ? `${new Date(term.startDate).getFullYear()}–${new Date(term.endDate).getFullYear()}` : ''
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Barre d'actions (cachée à l'impression) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statutConfig.bg} ${statutConfig.color}`}>
            <StatutIcon className="w-3.5 h-3.5" />
            {statutConfig.label}
          </span>
          <span className="text-sm text-gray-500">
            {student.firstName} {student.lastName} — {term?.name}
          </span>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Retour
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Imprimer
          </Button>
        </div>
      </div>

      {/* Bulletin imprimable */}
      <div
        ref={printRef}
        className="print-area max-w-[210mm] mx-auto bg-white p-8 my-6 shadow-lg rounded-xl border border-gray-200"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* En-tête */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              {school?.logoUrl && (
                <img src={school.logoUrl} alt="Logo école" className="h-16 mb-2 object-contain" />
              )}
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">{school?.name ?? 'École'}</h1>
              {school?.address && <p className="text-xs text-gray-500 mt-0.5">{school.address}</p>}
              {school?.phone && <p className="text-xs text-gray-500">{school.phone}</p>}
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-gray-800 px-4 py-2 rounded">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bulletin de Notes</p>
                <p className="text-lg font-black text-gray-900">{term?.name}</p>
                <p className="text-xs text-gray-500">Année Scolaire {anneeLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Infos élève */}
        <div className="grid grid-cols-3 gap-4 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Élève</p>
            <p className="font-bold text-gray-900">{student.lastName} {student.firstName}</p>
            {student.matricule && <p className="text-xs text-gray-500">Matr. {student.matricule}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Classe</p>
            <p className="font-bold text-gray-900">{student.class}</p>
            {student.niveau && <p className="text-xs text-gray-500">{student.niveau}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Rang</p>
            {rangClasse ? (
              <div className="flex items-center justify-end gap-1">
                <Award className="w-4 h-4 text-amber-500" />
                <p className="font-bold text-gray-900">{rangClasse}<sup>e</sup> / {nombreEleves}</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Non classé</p>
            )}
          </div>
        </div>

        {/* Tableau des matières */}
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-2.5 text-left font-semibold rounded-tl-lg">Matière</th>
                <th className="p-2.5 text-center font-semibold">Coef.</th>
                <th className="p-2.5 text-center font-semibold">Devoirs</th>
                <th className="p-2.5 text-center font-semibold">Éval.</th>
                <th className="p-2.5 text-center font-semibold">Quiz</th>
                <th className="p-2.5 text-center font-semibold">Particip.</th>
                <th className="p-2.5 text-center font-semibold bg-gray-700">Moyenne*</th>
                <th className="p-2.5 text-left font-semibold rounded-tr-lg">Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, idx) => (
                <tr
                  key={s.courseId}
                  className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="p-2.5">
                    <p className="font-semibold text-gray-900">{s.subjectName}</p>
                    {s.subjectCode && <p className="text-xs text-gray-400">{s.subjectCode}</p>}
                    <p className="text-xs text-gray-400">{s.teacher}</p>
                  </td>
                  <td className="p-2.5 text-center text-gray-500">{s.coefficient}</td>
                  <td className="p-2.5 text-center">
                    <span className={`font-medium ${getAvgColor(s.avgDevoirs)}`}>
                      {formatAvg(s.avgDevoirs)}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`font-medium ${getAvgColor(s.avgEval)}`}>
                      {formatAvg(s.avgEval)}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`font-medium ${getAvgColor(s.avgQuiz)}`}>
                      {formatAvg(s.avgQuiz)}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`font-medium ${getAvgColor(s.avgParticipation)}`}>
                      {formatAvg(s.avgParticipation)}
                    </span>
                  </td>
                  <td className="p-2.5 text-center bg-gray-50">
                    <span className={`text-lg font-black ${getAvgColor(s.average)}`}>
                      {formatAvg(s.average)}
                    </span>
                    <span className="text-xs text-gray-400">/20</span>
                  </td>
                  <td className="p-2.5 text-xs italic text-gray-500">{s.appreciation}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800 text-white">
                <td colSpan={6} className="p-3 text-right font-bold uppercase text-sm rounded-bl-lg">
                  Moyenne Générale
                </td>
                <td className="p-3 text-center">
                  <span className={`text-xl font-black ${overallAverage !== null && overallAverage >= 10 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {formatAvg(overallAverage)}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/20</span>
                </td>
                <td className="p-3 rounded-br-lg" />
              </tr>
            </tfoot>
          </table>
          <div className="mt-2 text-[10px] text-gray-500 italic flex items-center gap-1">
            <span className="font-bold">* Note de calcul :</span> La moyenne par matière est calculée avec une pondération stricte : 60% pour les évaluations spéciales et 40% pour les évaluations de classe (contrôle continu).
          </div>
        </div>

        {/* Section Conduite & Absences */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Conduite */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Conduite</h4>
            <div className="flex items-center gap-3">
              {conduct?.grade !== null && conduct?.grade !== undefined ? (
                <div className="text-center">
                  <span className={`text-2xl font-black ${getAvgColor(conduct.grade)}`}>{conduct.grade.toFixed(1)}</span>
                  <span className="text-xs text-gray-400">/20</span>
                </div>
              ) : null}
              <div>
                {conduct?.appreciation && (
                  <p className="font-semibold text-gray-800">{conduct.appreciation}</p>
                )}
                {conduct?.comment && (
                  <p className="text-xs text-gray-500 italic mt-1">{conduct.comment}</p>
                )}
                {!conduct && <p className="text-gray-400 text-sm">Non évaluée</p>}
              </div>
            </div>
          </div>

          {/* Absences */}
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Absences</h4>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-black text-red-500">{totalAbsences}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-orange-500">{totalAbsences - absencesJustifiees}</p>
                <p className="text-xs text-gray-500">Injustifiées</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-green-500">{absencesJustifiees}</p>
                <p className="text-xs text-gray-500">Justifiées</p>
              </div>
            </div>
          </div>
        </div>

        {/* Appréciations */}
        {(bulletin?.appreciationGenerale || bulletin?.commentaireEducateur || bulletin?.commentaireDirecteur) && (
          <div className="mb-6 border border-gray-200 rounded-xl divide-y divide-gray-200">
            {bulletin?.appreciationGenerale && (
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Appréciation Générale</p>
                <p className="text-sm text-gray-700 italic">"{bulletin.appreciationGenerale}"</p>
              </div>
            )}
            {bulletin?.commentaireEducateur && (
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Commentaire de l'Éducateur</p>
                <p className="text-sm text-gray-700 italic">"{bulletin.commentaireEducateur}"</p>
              </div>
            )}
            {bulletin?.commentaireDirecteur && (
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Commentaire du Directeur</p>
                <p className="text-sm text-gray-700 italic">"{bulletin.commentaireDirecteur}"</p>
              </div>
            )}
          </div>
        )}

        {/* Récap annuel */}
        {termsSummary && termsSummary.length > 1 && (
          <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Récapitulatif Annuel</h4>
            <div className="flex gap-4 flex-wrap">
              {termsSummary.map((ts) => (
                <div
                  key={ts.termId}
                  className={`text-center px-4 py-2 rounded-lg border ${
                    ts.termId === term?.id
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <p className={`text-xs font-medium ${ts.termId === term?.id ? 'text-gray-300' : 'text-gray-500'}`}>
                    {ts.termName}
                  </p>
                  <p className={`text-base font-black mt-1 ${
                    ts.termId === term?.id ? 'text-white' :
                    ts.overallAverage === null ? 'text-gray-400' :
                    ts.overallAverage >= 10 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {ts.overallAverage !== null ? ts.overallAverage.toFixed(2) : '—'}
                  </p>
                </div>
              ))}
              {annualAverage !== null && (
                <div className="text-center px-4 py-2 rounded-lg border border-amber-300 bg-amber-50">
                  <p className="text-xs font-medium text-amber-600">Moy. Annuelle</p>
                  <p className={`text-base font-black mt-1 ${annualAverage >= 10 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {annualAverage.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t-2 border-gray-200">
          {[
            { label: "L'Élève", sublabel: '' },
            { label: 'Les Parents / Tuteurs', sublabel: '' },
            { label: 'Le Directeur', sublabel: bulletin?.valideDirecteurPar ? `${bulletin.valideDirecteurPar.firstName} ${bulletin.valideDirecteurPar.lastName}` : '' },
          ].map((sig) => (
            <div key={sig.label} className="text-center">
              <div className="h-16 border-b border-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-600 uppercase">{sig.label}</p>
              {sig.sublabel && <p className="text-xs text-gray-400 mt-0.5">{sig.sublabel}</p>}
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-gray-400 mt-6">
          Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} via Ecole Connectée
          {bulletin?.statut === 'VALIDE_SUPER_ADMIN' && (
            <span className="ml-2 text-green-600 font-semibold">• Bulletin Officiel Validé</span>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; padding: 20px; box-shadow: none !important;
            border: none !important; border-radius: 0 !important;
          }
          #root > div > div.fixed { display: none; }
        }
      `}</style>
    </div>
  );
}
