import { useState, useEffect } from 'react';
import { ClipboardList, Plus, Calendar, XCircle, Trash2, Edit, Filter, Award, Zap, Save, CheckCircle, Clock, AlertTriangle, ShieldCheck, CheckCheck } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  matricule?: string;
}

interface ClassItem {
  id: string;
  name: string;
}

interface TermItem {
  id: string;
  name: string;
  status: string;
}

interface StudentAbsenceSummary {
  studentId: string;
  totalHours: number;
  justifiedHours: number;
  unjustifiedHours: number;
}

export default function ConductPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  
  const [conductsMap, setConductsMap] = useState<Record<string, { grade: string; appreciation: string; comment: string }>>({});
  const [absenceSummaries, setAbsenceSummaries] = useState<Record<string, StudentAbsenceSummary>>({});
  
  const [loading, setLoading] = useState(false);
  const [calculatingClass, setCalculatingClass] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const { success, error, info } = useToast();

  useEffect(() => {
    fetchClasses();
    fetchTerms();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassData(selectedClassId, selectedTermId);
    } else {
      setStudents([]);
      setConductsMap({});
      setAbsenceSummaries({});
    }
  }, [selectedClassId, selectedTermId]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const cls = res.data || [];
      setClasses(cls);
      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    } catch (err) {
      console.error("Erreur chargement classes:", err);
    }
  };

  const fetchTerms = async () => {
    try {
      const res = await api.get('/academic/years');
      const allTerms = (res.data || []).flatMap((y: any) => y.terms || []);
      setTerms(allTerms);
      const openTerm = allTerms.find((t: any) => t.status === 'OPEN') || allTerms[0];
      if (openTerm && !selectedTermId) {
        setSelectedTermId(openTerm.id);
      }
    } catch (err) {
      console.error("Erreur chargement trimestres:", err);
    }
  };

  const fetchClassData = async (classId: string, termId: string) => {
    if (!classId) return;
    setLoading(true);
    try {
      // 1. Récupérer les élèves de la classe
      const studentsRes = await api.get(`/classes/${classId}/students`);
      const studentList: Student[] = studentsRes.data || [];
      setStudents(studentList);

      // 2. Récupérer les conduites existantes pour cette classe et ce trimestre
      const conductParams: any = { classId };
      if (termId) conductParams.termId = termId;
      const conductsRes = await api.get('/conducts', { params: conductParams });
      const conducts: any[] = conductsRes.data || [];

      // 3. Récupérer les absences pour calculer le résumé par élève
      const absenceParams: any = { classId };
      if (termId) absenceParams.termId = termId;
      const absencesRes = await api.get('/absences', { params: absenceParams });
      const absences: any[] = absencesRes.data || [];

      // Agréger les absences par élève
      const absMap: Record<string, StudentAbsenceSummary> = {};
      studentList.forEach(s => {
        absMap[s.id] = {
          studentId: s.id,
          totalHours: 0,
          justifiedHours: 0,
          unjustifiedHours: 0,
        };
      });

      absences.forEach(a => {
        const sid = a.student?.id || a.studentId;
        if (absMap[sid]) {
          const h = a.hours || 1;
          absMap[sid].totalHours += h;
          if (a.justified) {
            absMap[sid].justifiedHours += h;
          } else {
            absMap[sid].unjustifiedHours += h;
          }
        }
      });
      setAbsenceSummaries(absMap);

      // Mapper les conduites dans le state
      const map: Record<string, { grade: string; appreciation: string; comment: string }> = {};
      studentList.forEach(s => {
        const existing = conducts.find((c: any) => (c.student?.id || c.studentId) === s.id);
        if (existing) {
          map[s.id] = {
            grade: existing.grade !== null && existing.grade !== undefined ? String(existing.grade) : '',
            appreciation: existing.appreciation || '',
            comment: existing.comment || '',
          };
        } else {
          // Calculer la note théorique par défaut si pas encore enregistrée
          const studentAbs = absMap[s.id];
          const penalty = (studentAbs?.unjustifiedHours || 0) * 1.0 + (studentAbs?.justifiedHours || 0) * 0.25;
          const defaultGrade = Math.max(0, Math.min(20, parseFloat((20 - penalty).toFixed(2))));
          
          let defaultApprec = "Excellente assiduité et conduite irréprochable.";
          if (defaultGrade < 10) defaultApprec = "Conduite insuffisante. Trop d'absences injustifiées constatées.";
          else if (defaultGrade < 12) defaultApprec = "Conduite moyenne. Avertissement d'assiduité.";
          else if (defaultGrade < 15) defaultApprec = "Conduite passable. Des absences à justifier et limiter.";
          else if (defaultGrade < 18) defaultApprec = "Bonne assiduité et comportement satisfaisant.";

          map[s.id] = {
            grade: String(defaultGrade),
            appreciation: defaultApprec,
            comment: studentAbs?.totalHours ? `${studentAbs.unjustifiedHours}h injustifiées, ${studentAbs.justifiedHours}h justifiées.` : 'Aucune absence constatée.',
          };
        }
      });

      setConductsMap(map);
    } catch (err) {
      console.error("Erreur chargement données classe conduite:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (studentId: string, field: 'grade' | 'appreciation' | 'comment', value: string) => {
    setConductsMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      }
    }));
  };

  // 1. Calcul Automatique Individuel
  const handleCalculateSingle = async (studentId: string) => {
    if (!selectedTermId) {
      error("Veuillez sélectionner une période / trimestre");
      return;
    }
    try {
      const res = await api.post('/conducts/calculate-student', {
        studentId,
        termId: selectedTermId,
      });
      const cond = res.data?.conduct;
      if (cond) {
        setConductsMap(prev => ({
          ...prev,
          [studentId]: {
            grade: String(cond.grade),
            appreciation: cond.appreciation || '',
            comment: cond.comment || '',
          }
        }));
        success(`Conduite calculée pour l'élève : ${cond.grade}/20 et synchronisée avec le bulletin !`);
      }
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors du calcul automatique");
    }
  };

  // 2. Calcul Automatique pour TOUTE la classe
  const handleCalculateClass = async () => {
    if (!selectedClassId || !selectedTermId) {
      error("Veuillez sélectionner une classe et un trimestre");
      return;
    }
    setCalculatingClass(true);
    try {
      const res = await api.post('/conducts/calculate-class', {
        classId: selectedClassId,
        termId: selectedTermId,
      });
      success(res.data?.message || "Conduite calculée pour toute la classe avec succès !");
      await fetchClassData(selectedClassId, selectedTermId);
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors du calcul de la classe");
    } finally {
      setCalculatingClass(false);
    }
  };

  // 3. Enregistrement Individuel
  const handleSaveSingle = async (studentId: string) => {
    if (!selectedTermId) {
      error("Sélectionnez un trimestre");
      return;
    }
    const data = conductsMap[studentId];
    if (!data) return;

    setSavingStudentId(studentId);
    try {
      await api.post('/conducts/save-class', {
        classId: selectedClassId,
        termId: selectedTermId,
        conducts: [{
          studentId,
          grade: data.grade !== '' ? parseFloat(data.grade) : null,
          appreciation: data.appreciation || null,
          comment: data.comment || null,
        }]
      });
      success("Note de conduite enregistrée et synchronisée avec le bulletin !");
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSavingStudentId(null);
    }
  };

  // 4. Enregistrement Global de TOUTE la classe
  const handleSaveAll = async () => {
    if (!selectedTermId || !selectedClassId || students.length === 0) {
      error("Veuillez sélectionner une classe et un trimestre valides");
      return;
    }
    setSavingAll(true);
    try {
      const conductsPayload = students.map(s => {
        const data = conductsMap[s.id] || { grade: '', appreciation: '', comment: '' };
        return {
          studentId: s.id,
          grade: data.grade !== '' ? parseFloat(data.grade) : null,
          appreciation: data.appreciation || null,
          comment: data.comment || null,
        };
      });

      const res = await api.post('/conducts/save-class', {
        classId: selectedClassId,
        termId: selectedTermId,
        conducts: conductsPayload,
      });

      success(res.data?.message || "Toutes les notes de conduite ont été enregistrées et transmises aux bulletins !");
      await fetchClassData(selectedClassId, selectedTermId);
    } catch (err: any) {
      error(err.response?.data?.message || "Erreur lors de l'enregistrement de la classe");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
      <PageHeader 
        title="Gestion de la Conduite"
        subtitle="Barème officiel de conduite sur 20/20 calculé à partir des absences. Matière Coefficient 1 sur les bulletins scolaires."
        icon={<ClipboardList className="w-8 h-8 text-brand-accent" />}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCalculateClass}
              isLoading={calculatingClass}
              leftIcon={<Zap className="w-4 h-4 text-amber-500" />}
              className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
            >
              Calcul Automatique (Toute la classe)
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveAll}
              isLoading={savingAll}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer Toute la Classe
            </Button>
          </div>
        }
      />

      {/* Règle de calcul & Barème officiel */}
      <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/70 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-brand-accent/15 text-brand-accent rounded-xl shrink-0 mt-0.5">
            <Award className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-brand-text text-sm flex items-center gap-2">
              Règle Officielle de Calcul de la Conduite (MENA / SEEEC)
            </h4>
            <p className="text-xs text-brand-text-muted leading-relaxed">
              • Chaque élève débute avec une <strong>note de conduite de départ fixée à 20.00 / 20</strong> au début du trimestre.<br />
              • Déductions d'assiduité : <strong>-1.0 point par heure d'absence injustifiée</strong> | <strong>-0.25 point par heure justifiée</strong>.<br />
              • La note de conduite est comptabilisée comme une <strong>matière à part entière de Coefficient 1</strong> sur le bulletin scolaire officiel.
            </p>
          </div>
        </div>
      </div>

      {/* Barre de sélection de la classe et du trimestre */}
      <div className="bg-brand-card p-5 rounded-2xl shadow-sm border border-brand-border/60 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-brand-text font-semibold text-sm">
          <Filter className="w-4 h-4 text-brand-accent" />
          <span>Sélection :</span>
        </div>

        <div className="min-w-[220px]">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
          >
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-[220px]">
          <select
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer font-medium"
          >
            {terms.map(t => (
              <option key={t.id} value={t.id}>{t.name} {t.status === 'OPEN' ? '(En cours)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-xs text-brand-text-muted font-medium">
          {students.length} élève{students.length > 1 ? 's' : ''} dans la classe
        </div>
      </div>

      {/* Tableau des notes de conduite */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-accent"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-brand-card rounded-2xl p-12 text-center border border-dashed border-brand-border/60 shadow-sm">
          <Award className="w-10 h-10 text-brand-accent/40 mx-auto mb-3" />
          <h3 className="font-bold text-brand-text">Aucun élève trouvé</h3>
          <p className="text-sm text-brand-text-muted">Sélectionnez une classe comportant des élèves inscrits.</p>
        </div>
      ) : (
        <div className="bg-brand-card rounded-2xl shadow-sm border border-brand-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-brand-sidebar/80 border-b border-brand-border/60">
                <tr>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider">Élève</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider text-center">Absences du Trimestre</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider w-28 text-center">Note /20</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider min-w-[220px]">Appréciation</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider min-w-[220px]">Observations / Justificatifs</th>
                  <th className="p-4 font-semibold text-brand-text-muted text-xs uppercase tracking-wider text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40 text-sm">
                {students.map((student) => {
                  const state = conductsMap[student.id] || { grade: '', appreciation: '', comment: '' };
                  const abs = absenceSummaries[student.id] || { totalHours: 0, justifiedHours: 0, unjustifiedHours: 0 };
                  const gradeNum = parseFloat(state.grade);

                  return (
                    <tr key={student.id} className="hover:bg-brand-sidebar/30 transition-colors">
                      {/* Élève */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent font-bold text-xs shrink-0">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-brand-text leading-snug">
                              {student.lastName} {student.firstName}
                            </p>
                            {student.matricule && (
                              <p className="text-xs text-brand-text-muted">Matr. {student.matricule}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Résumé des Absences */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-brand-text text-sm">
                            {abs.totalHours}h <span className="text-[11px] font-normal text-brand-text-muted">totales</span>
                          </span>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                              {abs.justifiedHours}h just.
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-bold">
                              {abs.unjustifiedHours}h injust.
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Note sur 20 */}
                      <td className="p-4">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            value={state.grade}
                            onChange={(e) => handleFieldChange(student.id, 'grade', e.target.value)}
                            placeholder="20"
                            className={`w-full text-center font-black text-base py-2 rounded-xl border outline-none transition-all ${
                              !isNaN(gradeNum) && gradeNum >= 14 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 focus:border-emerald-500' 
                                : !isNaN(gradeNum) && gradeNum >= 10
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 focus:border-amber-500'
                                : 'bg-red-500/10 text-red-600 border-red-500/30 focus:border-red-500'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Appréciation */}
                      <td className="p-4">
                        <select
                          value={state.appreciation}
                          onChange={(e) => handleFieldChange(student.id, 'appreciation', e.target.value)}
                          className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
                        >
                          <option value="">Sélectionner une appréciation...</option>
                          <option value="Excellente assiduité et conduite irréprochable.">Excellente assiduité et conduite irréprochable (≥ 18)</option>
                          <option value="Bonne assiduité et comportement satisfaisant.">Bonne assiduité et comportement satisfaisant (15 - 17.9)</option>
                          <option value="Conduite passable. Des absences à justifier et limiter.">Conduite passable (12 - 14.9)</option>
                          <option value="Conduite moyenne. Avertissement d'assiduité.">Conduite moyenne, avertissement (10 - 11.9)</option>
                          <option value="Conduite insuffisante. Trop d'absences injustifiées constatées.">Conduite insuffisante (&lt; 10)</option>
                          <option value="Félicitations du conseil pour son exemplarité.">Félicitations pour son exemplarité</option>
                          <option value="Blâme de conduite et retenues scolaires.">Blâme de conduite</option>
                        </select>
                      </td>

                      {/* Observations */}
                      <td className="p-4">
                        <input
                          type="text"
                          value={state.comment}
                          onChange={(e) => handleFieldChange(student.id, 'comment', e.target.value)}
                          placeholder="Observations particulières..."
                          className="w-full bg-brand-sidebar border border-brand-border/60 rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCalculateSingle(student.id)}
                            title="Recalculer automatiquement depuis les absences"
                            className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors border border-amber-500/20"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSaveSingle(student.id)}
                            isLoading={savingStudentId === student.id}
                            className="text-xs px-2.5 py-1.5 h-8"
                          >
                            Enregistrer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
