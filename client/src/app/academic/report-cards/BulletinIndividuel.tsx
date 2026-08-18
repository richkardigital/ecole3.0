import { useRef, useState } from 'react';
import { Download, CheckCircle, XCircle, Clock, Award, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSystemSettings, formatAssetUrl } from '@/contexts/SystemSettingsContext';
import { exportBulletinPdf } from '@/lib/bulletinPdfGenerator';

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
    valideAdminPar?: { firstName: string; lastName: string } | null;
  } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    birthDate?: string | Date | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    photo?: string | null;
    gender?: string | null;
    class: string;
    niveau?: string | null;
  };
  school: {
    name: string;
    address?: string;
    postalAddress?: string;
    ville?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    signatureUrl?: string;
    stampUrl?: string;
    manager?: { firstName: string; lastName: string } | null;
  } | null;
  systemSettings?: {
    platformName?: string;
    signatureUrl?: string;
    stampUrl?: string;
    email?: string;
    phone?: string;
    address?: string;
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
  SOUMIS_ENSEIGNANT: { label: 'Soumis par enseignant', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  VALIDE_EDUCATEUR: { label: 'Validé par Éducateur', color: 'text-orange-700', bg: 'bg-orange-100', icon: CheckCircle },
  VALIDE_DIRECTEUR: { label: 'Validé par Directeur', color: 'text-purple-700', bg: 'bg-purple-100', icon: CheckCircle },
  VALIDE_SUPER_ADMIN: { label: 'Bulletin Officiel Certifié', color: 'text-green-700', bg: 'bg-green-100', icon: ShieldCheck },
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

const getStudentPhotoUrl = (student: any): string | null => {
  const photo = student?.photoUrl || student?.avatarUrl || student?.photo;
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://') || photo.startsWith('data:') || photo.startsWith('blob:')) {
    return photo;
  }
  if (photo.startsWith('/uploads')) {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiBase}${photo}`;
  }
  return photo;
};

interface Props {
  data: BulletinData;
  onClose?: () => void;
}

export default function BulletinIndividuel({ data, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const { settings: globalSettings } = useSystemSettings();
  const { bulletin, student, school, systemSettings, term, subjects, overallAverage, rangClasse, nombreEleves,
    conduct, totalAbsences, absencesJustifiees, termsSummary, annualAverage } = data;

  const statut = bulletin?.statut ?? 'BROUILLON';
  const statutConfig = STATUT_CONFIG[statut] ?? STATUT_CONFIG.BROUILLON;
  const StatutIcon = statutConfig.icon;

  const anneeLabel = term?.academicYear?.name ?? (
    term ? `${new Date(term.startDate).getFullYear()}–${new Date(term.endDate).getFullYear()}` : '2025–2026'
  );

  // Logos et signatures
  const displayLogo = school?.logoUrl ? formatAssetUrl(school.logoUrl) : (globalSettings?.logoUrl ? formatAssetUrl(globalSettings.logoUrl) : null);
  
  // Signatures Directeur
  const directorSignature = school?.signatureUrl ? formatAssetUrl(school.signatureUrl) : null;
  const schoolStamp = school?.stampUrl ? formatAssetUrl(school.stampUrl) : null;

  // Signatures Super Admin / SEEEC Platform
  const adminSignature = systemSettings?.signatureUrl ? formatAssetUrl(systemSettings.signatureUrl) : (globalSettings?.signatureUrl ? formatAssetUrl(globalSettings.signatureUrl) : null);
  const adminStamp = systemSettings?.stampUrl ? formatAssetUrl(systemSettings.stampUrl) : (globalSettings?.stampUrl ? formatAssetUrl(globalSettings.stampUrl) : null);

  const conductGrade = conduct?.grade ?? bulletin?.noteConduite ?? null;
  const unjustifiedAbsences = Math.max(0, totalAbsences - absencesJustifiees);
  const studentPhoto = getStudentPhotoUrl(student);

  const formattedBirthDate = student?.birthDate
    ? new Date(student.birthDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  // ── Téléchargement PDF Vectoriel Direct (1 Page A4 Strict, Sans boîte d'impression) ──
  const handleDownloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await exportBulletinPdf(data);
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen pb-10">
      {/* Barre d'actions (cachée à l'impression) */}
      <div className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statutConfig.bg} ${statutConfig.color}`}>
            <StatutIcon className="w-3.5 h-3.5" />
            {statutConfig.label}
          </span>
          <span className="text-sm text-gray-800 font-bold hidden sm:inline">
            {student.lastName} {student.firstName} — {term?.name ?? 'Trimestre 1'} ({student.class})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose} disabled={downloading}>
              Fermer
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            isLoading={downloading}
            leftIcon={downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            className="bg-pink-600 hover:bg-pink-700 text-white font-black shadow-md shadow-pink-600/25 cursor-pointer text-xs sm:text-sm px-4 py-2"
          >
            {downloading ? 'Génération du PDF...' : 'Télécharger le Bulletin (PDF)'}
          </Button>
        </div>
      </div>

      {/* Visualisation Document Bulletin (1 Page A4 exacte) */}
      <div className="flex justify-center p-2 sm:p-4">
        <div
          ref={printRef}
          id="bulletin-document"
          className="bulletin-print-wrapper bg-white shadow-2xl rounded-xl border border-gray-300 text-gray-900 overflow-hidden"
          style={{
            width: '210mm',
            minHeight: '297mm',
            maxWidth: '100%',
            padding: '7mm 9mm 7mm 9mm',
            boxSizing: 'border-box',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div className="bulletin-content flex flex-col justify-between h-full text-[11px] leading-tight">
            
            {/* 1. En-tête officiel */}
            <div className="border-b-2 border-gray-900 pb-2 mb-2.5">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 max-w-[70%]">
                  {displayLogo ? (
                    <img
                      src={displayLogo}
                      alt="Logo École"
                      className="h-11 max-w-[130px] object-contain shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-700 font-black text-[10px] shrink-0">
                      ECOLE
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-tight">
                      {school?.name ?? globalSettings?.platformName ?? 'Établissement Scolaire'}
                    </h1>
                    <p className="text-[10px] text-gray-600 font-medium leading-tight">
                      {school?.address ? school.address : 'Plateau'}{school?.ville ? `, ${school.ville}` : ', Abidjan'}
                      {school?.postalAddress && ` • BP : ${school.postalAddress}`}
                    </p>
                    <div className="flex flex-wrap gap-x-2 text-[9px] text-gray-500 mt-0.5 font-medium">
                      {school?.phone && <span>Tél : {school.phone}</span>}
                      {school?.phone && school?.email && <span>•</span>}
                      {school?.email && <span>Email : {school.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-block border border-gray-900 px-3 py-1 rounded-lg bg-gray-50 text-right">
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider">BULLETIN SCOLAIRE</p>
                    <p className="text-xs font-black text-gray-900 leading-tight">{term?.name ?? 'Trimestre 1'}</p>
                    <p className="text-[9px] text-gray-600 font-medium leading-tight">Année {anneeLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Bloc Informations Élève & Photo */}
            <div className="mb-2.5 bg-gray-50/90 rounded-lg p-2 border border-gray-200 flex items-center justify-between gap-3">
              
              {/* Photo élève & Nom */}
              <div className="flex items-center gap-3">
                <div className="w-13 h-13 rounded-lg bg-white border border-gray-300 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  {studentPhoto ? (
                    <img
                      src={studentPhoto}
                      alt={`${student.firstName} ${student.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-600 to-purple-700 text-white flex items-center justify-center font-black text-sm">
                      {student.firstName?.[0] || 'E'}{student.lastName?.[0] || 'L'}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Nom & Prénoms de l'élève</p>
                  <p className="font-black text-gray-900 text-xs leading-snug uppercase">
                    {student.lastName} <span className="capitalize font-bold text-gray-800">{student.firstName}</span>
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium mt-0.5">
                    <span>Matricule : <strong className="font-mono text-gray-900 font-bold">{student.matricule || 'N/A'}</strong></span>
                    {formattedBirthDate && (
                      <>
                        <span>•</span>
                        <span>Né(e) le : <strong className="text-gray-900 font-semibold">{formattedBirthDate}</strong></span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Classe & Niveau */}
              <div className="border-l border-gray-200 pl-3">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Classe & Effectif</p>
                <p className="font-bold text-gray-900 text-[11px] leading-snug">{student.class}</p>
                <p className="text-[9px] text-gray-500 font-medium">
                  {student.niveau ? `${student.niveau}` : 'Enseignement Général'}
                  {nombreEleves ? ` • ${nombreEleves} élèves` : ''}
                </p>
              </div>

              {/* Rang & Moyenne */}
              <div className="border-l border-gray-200 pl-3 text-right">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Rang au Trimestre</p>
                {rangClasse ? (
                  <div className="flex items-center justify-end gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <p className="font-black text-gray-900 text-xs">
                      {rangClasse}<sup>{rangClasse === 1 ? 'er' : 'e'}</sup>
                      <span className="text-[9px] font-normal text-gray-500"> / {nombreEleves || '—'}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-[10px] font-medium">En cours</p>
                )}
                <p className="text-[9px] font-bold text-emerald-700 mt-0.5">
                  {overallAverage !== null ? (overallAverage >= 14 ? '★ Tableau d\'Honneur' : overallAverage >= 10 ? '✓ Admis' : 'En session') : 'Évalué'}
                </p>
              </div>
            </div>

            {/* 3. Tableau Récapitulatif des Matières */}
            <div className="mb-2.5">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-[9px] uppercase">
                    <th className="py-1 px-2 text-left font-bold rounded-tl-md">Matières Enseignées</th>
                    <th className="py-1 px-1 text-center font-bold">Coef.</th>
                    <th className="py-1 px-1 text-center font-bold">Devoirs</th>
                    <th className="py-1 px-1 text-center font-bold">Éval.</th>
                    <th className="py-1 px-1 text-center font-bold">Quiz</th>
                    <th className="py-1 px-1 text-center font-bold">Partic.</th>
                    <th className="py-1 px-1.5 text-center font-bold bg-gray-800">Moy./20</th>
                    <th className="py-1 px-2 text-left font-bold rounded-tr-md">Appréciation Pédagogique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                  {subjects.map((s, idx) => (
                    <tr
                      key={s.courseId}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} leading-tight`}
                    >
                      <td className="py-1 px-2">
                        <p className="font-bold text-gray-900 text-[10px] leading-tight">{s.subjectName}</p>
                        <p className="text-[8px] text-gray-500 leading-tight">{s.teacher}</p>
                      </td>
                      <td className="py-1 px-1 text-center font-bold text-gray-700 text-[10px]">{s.coefficient}</td>
                      <td className="py-1 px-1 text-center text-[9px]">
                        <span className={`font-semibold ${getAvgColor(s.avgDevoirs)}`}>
                          {formatAvg(s.avgDevoirs)}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-[9px]">
                        <span className={`font-semibold ${getAvgColor(s.avgEval)}`}>
                          {formatAvg(s.avgEval)}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-[9px]">
                        <span className={`font-semibold ${getAvgColor(s.avgQuiz)}`}>
                          {formatAvg(s.avgQuiz)}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-center text-[9px]">
                        <span className={`font-semibold ${getAvgColor(s.avgParticipation)}`}>
                          {formatAvg(s.avgParticipation)}
                        </span>
                      </td>
                      <td className="py-1 px-1.5 text-center bg-gray-50/80 font-black text-[11px]">
                        <span className={getAvgColor(s.average)}>
                          {formatAvg(s.average)}
                        </span>
                      </td>
                      <td className="py-1 px-2 text-[9px] italic text-gray-600 truncate max-w-[180px]">
                        {s.appreciation || (s.average !== null && s.average >= 14 ? 'Très bon travail' : s.average !== null && s.average >= 10 ? 'Travail convenable' : 'Doit progresser')}
                      </td>
                    </tr>
                  ))}

                  {/* Ligne Conduite & Discipline (Coef 1) */}
                  <tr className="bg-amber-50/50 border-t border-amber-200 leading-tight">
                    <td className="py-1 px-2">
                      <p className="font-black text-gray-900 text-[10px] flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-600" />
                        Conduite, Assiduité & Discipline
                      </p>
                      <p className="text-[8px] text-gray-500">Registre absences & vie scolaire</p>
                    </td>
                    <td className="py-1 px-1 text-center font-black text-amber-700 text-[10px]">1</td>
                    <td colSpan={4} className="py-1 px-1 text-center text-[9px] text-gray-600 font-medium">
                      {unjustifiedAbsences}h injustifiée{unjustifiedAbsences > 1 ? 's' : ''} • {absencesJustifiees}h justifiée{absencesJustifiees > 1 ? 's' : ''}
                    </td>
                    <td className="py-1 px-1.5 text-center bg-amber-50 font-black text-[11px]">
                      <span className={getAvgColor(conductGrade)}>
                        {formatAvg(conductGrade)}
                      </span>
                    </td>
                    <td className="py-1 px-2 text-[9px] italic font-medium text-gray-700">
                      {conduct?.appreciation || 'Comportement satisfaisant'}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={6} className="py-1.5 px-2 text-right font-bold uppercase text-[9px] rounded-bl-md tracking-wider">
                      Moyenne Générale Trimestrielle
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <span className={`text-xs font-black ${overallAverage !== null && overallAverage >= 10 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {formatAvg(overallAverage)}
                      </span>
                      <span className="text-[8px] text-gray-400 ml-0.5">/20</span>
                    </td>
                    <td className="py-1.5 px-2 text-[9px] text-gray-300 rounded-br-md font-bold">
                      {overallAverage !== null ? (overallAverage >= 14 ? 'Tableau d\'Honneur' : overallAverage >= 10 ? 'Admis' : 'Non Admis') : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. Section Assiduité & Appréciation du Conseil (2 colonnes compactes) */}
            <div className="grid grid-cols-2 gap-2.5 mb-2">
              {/* Assiduité */}
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                <h4 className="text-[8px] font-bold uppercase tracking-wider text-gray-600 mb-1">Bilan d'Assiduité</h4>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-white p-1 rounded border border-gray-200">
                    <p className="text-xs font-black text-gray-900">{totalAbsences}h</p>
                    <p className="text-[7px] text-gray-500 font-bold uppercase">Total</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-gray-200">
                    <p className="text-xs font-black text-emerald-600">{absencesJustifiees}h</p>
                    <p className="text-[7px] text-gray-500 font-bold uppercase">Justifiées</p>
                  </div>
                  <div className="bg-white p-1 rounded border border-gray-200">
                    <p className="text-xs font-black text-red-500">{unjustifiedAbsences}h</p>
                    <p className="text-[7px] text-gray-500 font-bold uppercase">Injustifiées</p>
                  </div>
                </div>
              </div>

              {/* Appréciation Générale */}
              <div className="border border-gray-200 rounded-lg p-2 bg-gray-50/50 flex flex-col justify-between">
                <div>
                  <h4 className="text-[8px] font-bold uppercase tracking-wider text-gray-600 mb-0.5">Appréciation du Conseil des Professeurs</h4>
                  <p className="text-[9px] text-gray-700 italic leading-snug">
                    "{bulletin?.appreciationGenerale || 'Trimestre satisfaisant dans l\'ensemble. Poursuivez vos efforts.'}"
                  </p>
                </div>
                {bulletin?.commentaireEducateur && (
                  <p className="text-[8px] text-gray-500 italic border-t border-gray-200 pt-0.5 mt-0.5">
                    Vie scolaire : {bulletin.commentaireEducateur}
                  </p>
                )}
              </div>
            </div>

            {/* Synthèse Annuelle Compacte (si plusieurs trimestres) */}
            {termsSummary && termsSummary.length > 1 && (
              <div className="mb-2 bg-gray-50 rounded-lg p-1 border border-gray-200 flex items-center justify-between text-[10px]">
                <span className="text-[8px] font-bold uppercase tracking-wider text-gray-600">Synthèse Annuelle :</span>
                <div className="flex gap-2 items-center">
                  {termsSummary.map((ts) => (
                    <span
                      key={ts.termId}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        ts.termId === term?.id
                          ? 'bg-gray-900 text-white'
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      {ts.termName} : {ts.overallAverage !== null ? ts.overallAverage.toFixed(2) : '—'}
                    </span>
                  ))}
                  {annualAverage !== null && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                      Moy. Annuelle : {annualAverage.toFixed(2)}/20
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 5. Doubles Signatures Officielles & Cachets (M. Koné en Bleu, DG Ecole 3.0 (Sec.)) */}
            <div className="grid grid-cols-4 gap-2 pt-1.5 border-t-2 border-gray-900">
              {/* L'Élève */}
              <div className="text-center">
                <div className="h-9 border-b border-dashed border-gray-300 mb-0.5 flex items-center justify-center" />
                <p className="text-[8px] font-black text-gray-700 uppercase">L'Élève</p>
              </div>

              {/* Les Parents */}
              <div className="text-center">
                <div className="h-9 border-b border-dashed border-gray-300 mb-0.5 flex items-center justify-center" />
                <p className="text-[8px] font-black text-gray-700 uppercase">Les Parents / Tuteur</p>
              </div>

              {/* Le Chef d'Établissement (M. Koné / Directeur en bleu) */}
              <div className="text-center relative">
                <div className="h-9 border-b border-gray-400 mb-0.5 flex items-center justify-center relative overflow-hidden">
                  {directorSignature && (
                    <img
                      src={directorSignature}
                      alt="Signature Directeur"
                      className="max-h-8 max-w-[100px] object-contain z-10"
                    />
                  )}
                  {schoolStamp && (
                    <img
                      src={schoolStamp}
                      alt="Cachet Établissement"
                      className="max-h-8 max-w-[100px] object-contain absolute opacity-70 z-0 pointer-events-none"
                    />
                  )}
                </div>
                <p className="text-[8px] font-black text-gray-900 uppercase">Le Chef d'Établissement</p>
                <p className="text-[9px] text-blue-700 font-bold leading-tight">
                  {bulletin?.valideDirecteurPar
                    ? `${bulletin.valideDirecteurPar.firstName} ${bulletin.valideDirecteurPar.lastName}`
                    : school?.manager
                    ? `${school.manager.firstName} ${school.manager.lastName}`
                    : 'M. Koné (Directeur des Études)'}
                </p>
              </div>

              {/* Direction Générale / Super Admin SEEEC (DG / Directeur Général Ecole 3.0 (Sec.)) */}
              <div className="text-center relative">
                <div className="h-9 border-b border-gray-400 mb-0.5 flex items-center justify-center relative overflow-hidden">
                  {adminSignature && (
                    <img
                      src={adminSignature}
                      alt="Signature DG"
                      className="max-h-8 max-w-[100px] object-contain z-10"
                    />
                  )}
                  {adminStamp && (
                    <img
                      src={adminStamp}
                      alt="Sceau SEEEC"
                      className="max-h-8 max-w-[100px] object-contain absolute opacity-75 z-0 pointer-events-none"
                    />
                  )}
                </div>
                <p className="text-[8px] font-black text-gray-900 uppercase">Directeur Général Ecole 3.0 (Sec.)</p>
                <p className="text-[8px] text-emerald-600 font-bold leading-tight">
                  Certification Plateforme Officielle
                </p>
              </div>
            </div>

            {/* 6. Pied de page */}
            <div className="text-center text-[8px] text-gray-400 mt-1.5 pt-1 border-t border-gray-100 flex items-center justify-between">
              <span>Édité le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span>Système National d'Éducation Connectée — École 3.0 / SEEEC</span>
              <span className="font-semibold text-emerald-600">Document Officiel Vérifié ✓</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
