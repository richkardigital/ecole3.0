import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Save, Plus, RefreshCw, Star, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  matricule?: string;
}

interface Assessment {
  id: string;
  title: string;
  coefficient: number;
  type: 'assignment' | 'quiz' | 'participation';
  maxPoints?: number;
}

interface Grade {
  studentId: string;
  assessmentId: string;
  value: number | null;
}

interface CourseOption {
  id: string;
  subjectName: string;
  subjectId: string;
}

interface TeacherGradesGridProps {
  classId: string;
  termId: string;
  onRefresh?: () => void;
}

export default function TeacherGradesGrid({ classId, termId, onRefresh }: TeacherGradesGridProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingParticipation, setSavingParticipation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Multi-cours
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});
  const [participationMap, setParticipationMap] = useState<Record<string, number | null>>({});

  const [newColTitle, setNewColTitle] = useState('');
  const [newColCoeff, setNewColCoeff] = useState(1);
  const [newColType, setNewColType] = useState<'DEVOIR' | 'EVALUATION' | 'EXAMEN' | 'INTERRO'>('DEVOIR');
  const [isAddingCol, setIsAddingCol] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'participation'>('notes');

  // Charger les cours disponibles pour l'enseignant dans cette classe
  useEffect(() => {
    if (classId) fetchAvailableCourses();
  }, [classId]);

  useEffect(() => {
    if (selectedCourseId && termId) fetchGrid();
  }, [selectedCourseId, termId]);

  const fetchAvailableCourses = async () => {
    try {
      const res = await api.get(`/courses?classId=${classId}`);
      const courses = res.data;

      // Filtrer par enseignant si rôle ENSEIGNANT
      const filtered = user?.role === 'ENSEIGNANT'
        ? courses.filter((c: any) => c.teacherId === user.id)
        : courses;

      const options: CourseOption[] = filtered.map((c: any) => ({
        id: c.id,
        subjectName: c.subject?.name ?? 'Matière inconnue',
        subjectId: c.subjectId,
      }));

      setAvailableCourses(options);
      if (options.length > 0 && !selectedCourseId) {
        setSelectedCourseId(options[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement cours', err);
    }
  };

  const fetchGrid = async () => {
    try {
      setLoading(true);
      setError(null);

      const [gridRes, participationRes] = await Promise.all([
        api.get(`/grades/teacher-grid/view?classId=${classId}&termId=${termId}&courseId=${selectedCourseId}`),
        api.get(`/grades/${selectedCourseId}/participation?termId=${termId}`),
      ]);

      const data = gridRes.data;
      setCourse(data.course);
      setStudents(data.students);

      // Combiner devoirs + quizzes, mais exclure les exercices (non notés)
      const combinedAssessments: Assessment[] = [
        ...data.assignments.filter((a: any) => a.type !== 'EXERCICE_MAISON').map((a: any) => ({
          id: a.id,
          title: a.title,
          coefficient: a.coefficient,
          type: 'assignment' as const,
        })),
        ...data.quizzes.filter((q: any) => q.type !== 'EXERCICE_MAISON').map((q: any) => ({
          id: q.id,
          title: q.title + ' (Quiz)',
          coefficient: q.coefficient,
          type: 'quiz' as const,
        })),
      ];
      setAssessments(combinedAssessments);

      // Grille notes
      const initialGradesMap: Record<string, Record<string, number | null>> = {};
      data.students.forEach((s: Student) => {
        initialGradesMap[s.id] = {};
        combinedAssessments.forEach(a => {
          initialGradesMap[s.id][a.id] = null;
        });
      });

      data.grades.forEach((g: any) => {
        if (g.assignmentId && initialGradesMap[g.studentId]) {
          initialGradesMap[g.studentId][g.assignmentId] = g.value;
        }
      });

      data.quizAttempts?.forEach((qa: any) => {
        if (qa.quizId && initialGradesMap[qa.studentId]) {
          initialGradesMap[qa.studentId][qa.quizId] = qa.score;
        }
      });

      setGradesMap(initialGradesMap);

      // Notes de participation
      const partMap: Record<string, number | null> = {};
      data.students.forEach((s: Student) => { partMap[s.id] = null; });
      participationRes.data.grades?.forEach((g: any) => {
        if (partMap[g.studentId] !== undefined) {
          partMap[g.studentId] = g.value;
        }
      });
      setParticipationMap(partMap);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement de la grille');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, assessmentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (numValue < 0 || numValue > 20)) return;
    setGradesMap(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [assessmentId]: numValue }
    }));
  };

  const handleParticipationChange = (studentId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (numValue < 0 || numValue > 20)) return;
    setParticipationMap(prev => ({ ...prev, [studentId]: numValue }));
  };

  const calculateStudentAverage = (studentId: string): string => {
    const sGrades = gradesMap[studentId];
    if (!sGrades) return '—';
    let totalWeighted = 0;
    let totalCoeff = 0;
    assessments.forEach(a => {
      const val = sGrades[a.id];
      if (val !== null && val !== undefined) {
        totalWeighted += val * a.coefficient;
        totalCoeff += a.coefficient;
      }
    });
    // Ajouter participation si disponible
    const partVal = participationMap[studentId];
    if (partVal !== null && partVal !== undefined) {
      totalWeighted += partVal * 1;
      totalCoeff += 1;
    }
    return totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(2) : '—';
  };

  const handleSaveNotes = async () => {
    if (!course) return;
    setSaving(true);
    setError(null);
    try {
      const gradesToSave: any[] = [];
      students.forEach(s => {
        assessments.forEach(a => {
          if (a.type === 'assignment') {
            gradesToSave.push({
              studentId: s.id,
              assignmentId: a.id,
              value: gradesMap[s.id]?.[a.id] ?? null
            });
          }
        });
      });

      await api.post('/grades/teacher-grid/save', {
        termId,
        courseId: course.id,
        grades: gradesToSave
      });

      setSuccess('Notes sauvegardées !');
      setTimeout(() => setSuccess(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveParticipation = async () => {
    if (!course) return;
    setSavingParticipation(true);
    setError(null);
    try {
      const grades = students.map(s => ({
        studentId: s.id,
        value: participationMap[s.id] ?? null
      }));

      await api.post('/grades/participation/save', {
        courseId: course.id,
        termId,
        grades
      });

      setSuccess('Notes de participation sauvegardées !');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde de la participation');
    } finally {
      setSavingParticipation(false);
    }
  };

  const handleAddColumn = async () => {
    if (!course || !newColTitle.trim()) return;
    setIsAddingCol(true);
    try {
      await api.post('/assignments/quick-add', {
        title: newColTitle,
        courseId: course.id,
        termId,
        coefficient: newColCoeff,
        type: newColType,
      });
      setNewColTitle('');
      setNewColCoeff(1);
      setNewColType('DEVOIR');
      await fetchGrid();
    } catch {
      setError('Erreur lors de l\'ajout de la colonne');
    } finally {
      setIsAddingCol(false);
    }
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-3">
      <RefreshCw className="w-5 h-5 animate-spin" />
      Chargement de la grille...
    </div>
  );

  if (!course && !loading) return (
    <div className="p-8 text-center text-gray-400">
      {availableCourses.length === 0
        ? 'Vous n\'avez aucun cours assigné dans cette classe.'
        : 'Sélectionnez un cours ci-dessus.'
      }
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm space-y-0 overflow-hidden">

      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {/* Sélecteur de cours */}
          {availableCourses.length > 1 && (
            <div className="relative">
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer font-semibold"
              >
                {availableCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.subjectName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
          {availableCourses.length === 1 && (
            <h3 className="text-lg font-bold text-gray-900">{course?.subject?.name}</h3>
          )}
          <span className="text-sm text-gray-500">{students.length} élève(s)</span>
        </div>

        {/* Onglets */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'notes' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('participation')}
            className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'participation' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            Participation
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          {success}
        </div>
      )}

      {/* ── TAB NOTES ─────────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[200px] sticky left-0 bg-gray-50 shadow-[1px_0_0_#e5e7eb]">
                    Élève
                  </th>
                  {assessments.map(a => (
                    <th key={a.id} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[110px] border-l border-gray-200">
                      <div className="truncate max-w-[100px] mx-auto" title={a.title}>{a.title}</div>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className="text-xs text-gray-400 font-normal">Coef. {a.coefficient}</span>
                        {a.type === 'quiz' && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded font-normal">Quiz</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-emerald-700 min-w-[110px] border-l border-gray-200 bg-emerald-50">
                    Moy. /20
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white shadow-[1px_0_0_#e5e7eb]">
                      <span className="text-gray-400 mr-1 text-xs">{idx + 1}.</span>
                      {student.lastName} {student.firstName}
                    </td>
                    {assessments.map(a => (
                      <td key={a.id} className="px-3 py-2 border-l border-gray-100 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={gradesMap[student.id]?.[a.id] ?? ''}
                          onChange={e => handleGradeChange(student.id, a.id, e.target.value)}
                          disabled={a.type === 'quiz'}
                          className={`w-20 text-center px-2 py-1.5 border rounded-lg text-sm outline-none transition-all ${
                            a.type === 'quiz'
                              ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-transparent'
                              : 'bg-white border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }`}
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 border-l border-gray-200 text-center bg-emerald-50/40">
                      <span className="font-bold text-emerald-700 text-base">
                        {calculateStudentAverage(student.id)}
                      </span>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={assessments.length + 2} className="p-8 text-center text-gray-400">
                      Aucun élève dans cette classe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ajouter colonne */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Ajouter une évaluation
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={newColTitle}
                  onChange={e => setNewColTitle(e.target.value)}
                  placeholder="Titre (ex: Devoir de maison 1)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="w-32">
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 bg-white cursor-pointer"
                >
                  <option value="DEVOIR">Devoir</option>
                  <option value="EVALUATION">Évaluation</option>
                  <option value="EXAMEN">Examen</option>
                  <option value="INTERRO">Interro</option>
                </select>
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={newColCoeff}
                  onChange={e => setNewColCoeff(parseInt(e.target.value) || 1)}
                  placeholder="Coef."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleAddColumn}
                disabled={!newColTitle.trim() || isAddingCol}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {isAddingCol ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </div>

          {/* Bouton save */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveNotes}
              isLoading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer les notes
            </Button>
          </div>
        </>
      )}

      {/* ── TAB PARTICIPATION ─────────────────────────────────────────────── */}
      {activeTab === 'participation' && (
        <>
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              Notes de participation pour la matière <strong>{course?.subject?.name}</strong>.
              Saisie par le professeur — note globale par élève sur ce trimestre.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 min-w-[250px]">Élève</th>
                  <th className="px-4 py-3 text-center font-semibold text-amber-700 min-w-[150px]">
                    Note Participation /20
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <span className="text-gray-400 mr-1 text-xs">{idx + 1}.</span>
                      {student.lastName} {student.firstName}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={participationMap[student.id] ?? ''}
                        onChange={e => handleParticipationChange(student.id, e.target.value)}
                        className="w-24 text-center px-3 py-2 border border-amber-300 rounded-xl text-base font-semibold outline-none transition-all bg-white hover:border-amber-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30"
                        placeholder="—"
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-gray-400">Aucun élève.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveParticipation}
              isLoading={savingParticipation}
              leftIcon={<Star className="w-4 h-4" />}
              className="bg-amber-500 hover:bg-amber-600 border-amber-500"
            >
              Sauvegarder la participation
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
