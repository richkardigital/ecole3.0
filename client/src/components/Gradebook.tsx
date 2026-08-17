import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { 
  BookOpen, 
  CheckCircle2, 
  Search, 
  Filter, 
  Award, 
  Users, 
  FileText, 
  Layers, 
  HelpCircle, 
  RefreshCw,
  BarChart2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface GradebookProps {
  courseId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  matricule?: string;
}

interface Assignment {
  id: string;
  title: string;
  type?: string;
  coefficient?: number;
  dueDate?: string;
  points?: number;
  term?: { id: string; name: string };
  isNiveauWide?: boolean;
}

interface Quiz {
  id: string;
  title: string;
  type?: string;
  coefficient?: number;
  endDate?: string;
  points?: number;
}

interface Grade {
  id: string;
  studentId: string;
  assignmentId?: string;
  quizId?: string;
  value: number;
  comment?: string;
  assignment?: {
    id: string;
    title: string;
    type?: string;
    coefficient?: number;
  };
}

export const Gradebook = ({ courseId }: GradebookProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  // Filters & Search
  const [searchStudent, setSearchStudent] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'NIVEAU' | 'DEVOIR' | 'QUIZ'>('ALL');

  const fetchGradebook = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/grades/${courseId}/gradebook`);
      setStudents(response.data.students || []);
      setAssignments(response.data.assignments || []);
      setQuizzes(response.data.quizzes || []);
      setGrades(response.data.grades || []);
    } catch (err: any) {
      console.error("Error fetching gradebook", err);
      setError(err?.response?.data?.message || "Impossible de charger le cahier de notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchGradebook();
    }
  }, [courseId]);

  // Merge assignments and quizzes as evaluable items
  const allItems = useMemo(() => {
    const assignItems = assignments.map(a => ({
      id: a.id,
      key: `assign_${a.id}`,
      rawId: a.id,
      title: a.title,
      itemType: 'ASSIGNMENT' as const,
      type: a.type || 'DEVOIR_CLASSE',
      coefficient: a.coefficient || 1,
      dueDate: a.dueDate,
      termName: a.term?.name,
      isNiveauWide: a.isNiveauWide || a.type === 'DEVOIR_NIVEAU' || a.type === 'COMPOSITION_NIVEAU' || a.type === 'COMPO_NIVEAU'
    }));

    const quizItems = quizzes.map(q => ({
      id: q.id,
      key: `quiz_${q.id}`,
      rawId: q.id,
      title: q.title,
      itemType: 'QUIZ' as const,
      type: q.type || 'QUIZ',
      coefficient: q.coefficient || 1,
      dueDate: q.endDate,
      termName: undefined,
      isNiveauWide: false
    }));

    return [...assignItems, ...quizItems];
  }, [assignments, quizzes]);

  // Filtered evaluation items based on type filter
  const filteredItems = useMemo(() => {
    if (typeFilter === 'ALL') return allItems;
    if (typeFilter === 'NIVEAU') {
      return allItems.filter(i => 
        i.isNiveauWide || 
        i.type === 'DEVOIR_NIVEAU' || 
        i.type === 'COMPOSITION_NIVEAU' || 
        i.type === 'COMPO_NIVEAU'
      );
    }
    if (typeFilter === 'DEVOIR') {
      return allItems.filter(i => 
        i.itemType === 'ASSIGNMENT' && 
        i.type !== 'DEVOIR_NIVEAU' && 
        i.type !== 'COMPOSITION_NIVEAU' && 
        i.type !== 'COMPO_NIVEAU'
      );
    }
    if (typeFilter === 'QUIZ') {
      return allItems.filter(i => i.itemType === 'QUIZ');
    }
    return allItems;
  }, [allItems, typeFilter]);

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return students;
    const q = searchStudent.toLowerCase();
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.matricule && s.matricule.toLowerCase().includes(q))
    );
  }, [students, searchStudent]);

  // Get grade value for a student and item
  const getGradeValue = (studentId: string, itemRawId: string, itemType: 'ASSIGNMENT' | 'QUIZ') => {
    const grade = grades.find(g => {
      if (g.studentId !== studentId) return false;
      if (itemType === 'ASSIGNMENT') return g.assignmentId === itemRawId;
      if (itemType === 'QUIZ') return g.quizId === itemRawId;
      return false;
    });
    return grade !== undefined && grade.value !== null ? grade.value : '';
  };

  // Save grade handler
  const handleGradeChange = async (studentId: string, itemRawId: string, itemType: 'ASSIGNMENT' | 'QUIZ', valueStr: string) => {
    if (valueStr.trim() === '') return;
    const numVal = parseFloat(valueStr);
    if (isNaN(numVal) || numVal < 0 || numVal > 20) {
      alert("La note doit être un nombre compris entre 0 et 20.");
      return;
    }

    const key = `${itemType}_${itemRawId}_${studentId}`;
    setSavingKey(key);
    setSuccessKey(null);

    try {
      await api.post('/grades/save', {
        studentId,
        ...(itemType === 'ASSIGNMENT' ? { assignmentId: itemRawId } : { courseId }),
        value: numVal
      });

      // Update local state
      setGrades(prev => {
        const existingIndex = prev.findIndex(g => 
          g.studentId === studentId && 
          (itemType === 'ASSIGNMENT' ? g.assignmentId === itemRawId : g.quizId === itemRawId)
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], value: numVal };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: `temp_${Date.now()}`,
              studentId,
              assignmentId: itemType === 'ASSIGNMENT' ? itemRawId : undefined,
              quizId: itemType === 'QUIZ' ? itemRawId : undefined,
              value: numVal
            }
          ];
        }
      });

      setSuccessKey(key);
      setTimeout(() => setSuccessKey(null), 2500);
    } catch (err: any) {
      console.error("Error saving grade", err);
      alert(err?.response?.data?.message || "Erreur lors de l'enregistrement de la note.");
    } finally {
      setSavingKey(null);
    }
  };

  // Student average calculation
  const calculateStudentAverage = (studentId: string) => {
    let totalPoints = 0;
    let totalCoeff = 0;

    allItems.forEach(item => {
      const val = getGradeValue(studentId, item.rawId, item.itemType);
      if (val !== '' && typeof val === 'number') {
        const coeff = item.coefficient || 1;
        totalPoints += val * coeff;
        totalCoeff += coeff;
      }
    });

    if (totalCoeff === 0) return null;
    return (totalPoints / totalCoeff).toFixed(2);
  };

  // Global class stats
  const stats = useMemo(() => {
    let totalGrades = 0;
    let sumGrades = 0;
    let totalPossibleGrades = students.length * allItems.length;

    students.forEach(s => {
      allItems.forEach(item => {
        const val = getGradeValue(s.id, item.rawId, item.itemType);
        if (val !== '' && typeof val === 'number') {
          totalGrades++;
          sumGrades += val;
        }
      });
    });

    const classAverage = totalGrades > 0 ? (sumGrades / totalGrades).toFixed(2) : null;
    const fillRate = totalPossibleGrades > 0 ? Math.round((totalGrades / totalPossibleGrades) * 100) : 0;

    const niveauCount = allItems.filter(i => 
      i.isNiveauWide || 
      i.type === 'DEVOIR_NIVEAU' || 
      i.type === 'COMPOSITION_NIVEAU' || 
      i.type === 'COMPO_NIVEAU'
    ).length;

    return {
      totalStudents: students.length,
      totalEvaluations: allItems.length,
      niveauEvaluations: niveauCount,
      classAverage,
      fillRate
    };
  }, [students, allItems, grades]);

  const getItemBadge = (type: string, isNiveauWide?: boolean) => {
    if (isNiveauWide || type === 'DEVOIR_NIVEAU' || type === 'COMPOSITION_NIVEAU' || type === 'COMPO_NIVEAU') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
          Devoir de niveau
        </span>
      );
    }
    if (type === 'COMPOSITION' || type === 'EXAMEN') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          Composition
        </span>
      );
    }
    if (type === 'QUIZ') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          Quiz
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        Devoir
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-brand-card p-12 rounded-2xl border border-brand-border/60 text-center flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-brand-text">Chargement du cahier de notes...</p>
        <p className="text-xs text-brand-muted">Récupération des devoirs de niveau, évaluations et notes des élèves</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm font-bold text-red-400">{error}</p>
        <button
          onClick={fetchGradebook}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-brand-card p-6 rounded-2xl border border-brand-border/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text tracking-tight">
                Cahier de Notes & Évaluations
              </h2>
              <p className="text-xs text-brand-text-muted mt-0.5">
                Centralisation des notes : devoirs de niveau, devoirs de classe, compositions et quiz.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchGradebook}
            className="p-2.5 rounded-xl bg-brand-surface text-brand-text hover:text-emerald-400 border border-brand-border hover:border-emerald-500/40 transition cursor-pointer"
            title="Rafraîchir les notes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/70 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-brand-muted font-bold">Élèves Inscrits</div>
            <div className="text-xl font-black text-brand-text">{stats.totalStudents}</div>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/70 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-brand-muted font-bold">Devoirs de niveau</div>
            <div className="text-xl font-black text-purple-400">{stats.niveauEvaluations}</div>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/70 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-brand-muted font-bold">Moyenne Classe</div>
            <div className="text-xl font-black text-emerald-400">
              {stats.classAverage !== null ? `${stats.classAverage} / 20` : '—'}
            </div>
          </div>
        </div>

        <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/70 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-brand-muted font-bold">Taux de Saisie</div>
            <div className="text-xl font-black text-amber-400">{stats.fillRate}%</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-border/70 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un élève..."
            value={searchStudent}
            onChange={(e) => setSearchStudent(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-brand-surface border border-brand-border/80 rounded-xl text-brand-text placeholder-brand-muted outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { key: 'ALL', label: 'Toutes les évaluations', count: allItems.length },
            { key: 'NIVEAU', label: 'Devoirs de niveau', count: stats.niveauEvaluations },
            { key: 'DEVOIR', label: 'Devoirs de classe', count: allItems.filter(i => i.itemType === 'ASSIGNMENT' && !i.isNiveauWide && i.type !== 'DEVOIR_NIVEAU').length },
            { key: 'QUIZ', label: 'Quiz', count: quizzes.length }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                typeFilter === f.key
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-brand-surface text-brand-text-muted hover:text-brand-text border border-brand-border/80'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Gradebook Table Card */}
      <div className="bg-brand-card rounded-2xl border border-brand-border/80 shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
            <Users className="w-12 h-12 opacity-40 text-brand-border" />
            <p className="text-base font-bold text-brand-text">Aucun élève inscrit</p>
            <p className="text-xs text-brand-muted">Les élèves inscrits à ce cours apparaîtront automatiquement dans cette grille.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-brand-muted flex flex-col items-center gap-3">
            <FileText className="w-12 h-12 opacity-40 text-brand-border" />
            <p className="text-base font-bold text-brand-text">Aucune évaluation correspondante</p>
            <p className="text-xs text-brand-muted">
              {typeFilter === 'NIVEAU'
                ? "Aucun devoir de niveau n'a été créé pour ce cours ou ce niveau pour l'instant."
                : "Aucune évaluation n'a été créée pour ce cours."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-brand-sidebar border-b border-brand-border/80">
                  {/* Sticky Student Column */}
                  <th className="p-4 text-left text-xs font-black text-brand-text sticky left-0 bg-brand-sidebar z-20 min-w-[220px] border-r border-brand-border/60">
                    Élève ({filteredStudents.length})
                  </th>

                  {/* Dynamic Evaluation Columns */}
                  {filteredItems.map(item => (
                    <th
                      key={item.key}
                      className="p-3 text-center text-xs font-bold text-brand-text min-w-[140px] max-w-[190px] border-r border-brand-border/40"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="truncate max-w-full font-black text-brand-text" title={item.title}>
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1">
                          {getItemBadge(item.type, item.isNiveauWide)}
                          <span className="text-[10px] text-brand-muted font-bold">
                            (Coeff {item.coefficient})
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* Moyenne Column */}
                  <th className="p-4 text-center text-xs font-black text-emerald-400 min-w-[110px] bg-emerald-500/5">
                    Moyenne / 20
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-brand-border/50">
                {filteredStudents.map((student) => {
                  const studentAvg = calculateStudentAverage(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-brand-surface/60 transition-colors">
                      {/* Sticky Student Profile Cell */}
                      <td className="p-3.5 sticky left-0 bg-brand-card hover:bg-brand-surface/60 z-10 border-r border-brand-border/60">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                            {student.firstName?.[0]?.toUpperCase()}{student.lastName?.[0]?.toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-brand-text truncate">
                              {student.lastName} {student.firstName}
                            </div>
                            {student.matricule && (
                              <div className="text-[10px] font-mono text-brand-muted">
                                Mat: {student.matricule}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Evaluation Grade Inputs */}
                      {filteredItems.map(item => {
                        const gradeVal = getGradeValue(student.id, item.rawId, item.itemType);
                        const key = `${item.itemType}_${item.rawId}_${student.id}`;
                        const isSaving = savingKey === key;
                        const isSuccess = successKey === key;

                        return (
                          <td
                            key={item.key}
                            className="p-2.5 text-center border-r border-brand-border/40 relative"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="20"
                                step="0.25"
                                defaultValue={gradeVal}
                                placeholder="—"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value;
                                  const currentVal = gradeVal;
                                  if (val !== '' && parseFloat(val) !== currentVal) {
                                    handleGradeChange(student.id, item.rawId, item.itemType, val);
                                  }
                                }}
                                className={`w-16 py-1.5 px-2 text-center text-xs font-bold rounded-lg border outline-none transition bg-brand-surface text-brand-text focus:ring-2 focus:ring-emerald-500/40 ${
                                  isSuccess
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                    : 'border-brand-border/80 hover:border-brand-accent/50'
                                }`}
                              />
                              {isSaving && (
                                <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0"></span>
                              )}
                              {isSuccess && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Student Calculated Average */}
                      <td className="p-3 text-center bg-emerald-500/5">
                        {studentAvg !== null ? (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${
                              parseFloat(studentAvg) >= 10
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : parseFloat(studentAvg) >= 8
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }`}
                          >
                            {studentAvg}
                          </span>
                        ) : (
                          <span className="text-xs text-brand-muted font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gradebook;
