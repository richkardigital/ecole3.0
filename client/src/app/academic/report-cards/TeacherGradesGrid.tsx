import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Save, Plus, AlertCircle, Calculator } from 'lucide-react';
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
  type: string; // 'assignment' or 'quiz'
  maxPoints?: number;
}

interface Grade {
  studentId: string;
  assignmentId?: string; // used for assignments
  quizId?: string; // used for quizzes mapping
  value: number;
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
  const [error, setError] = useState<string | null>(null);
  
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({}); // studentId -> assessmentId -> value
  
  const [newColTitle, setNewColTitle] = useState('');
  const [newColCoeff, setNewColCoeff] = useState(1);
  const [isAddingCol, setIsAddingCol] = useState(false);

  useEffect(() => {
    if (classId && termId) {
      fetchGrid();
    }
  }, [classId, termId]);

  const fetchGrid = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/grades/teacher-grid/view?classId=${classId}&termId=${termId}`);
      
      const data = res.data;
      setCourse(data.course);
      setStudents(data.students);
      
      // Combine assignments and quizzes into generic assessments
      const combinedAssessments: Assessment[] = [
        ...data.assignments.map((a: any) => ({
          id: a.id,
          title: a.title,
          coefficient: a.coefficient,
          type: 'assignment'
        })),
        ...data.quizzes.map((q: any) => ({
          id: q.id,
          title: q.title + ' (Quiz)',
          coefficient: q.coefficient,
          type: 'quiz'
        }))
      ];
      setAssessments(combinedAssessments);

      // Build grades map
      const initialGradesMap: Record<string, Record<string, number | null>> = {};
      data.students.forEach((s: Student) => {
        initialGradesMap[s.id] = {};
        combinedAssessments.forEach(a => {
           initialGradesMap[s.id][a.id] = null;
        });
      });

      // Fill assignment grades
      data.grades.forEach((g: any) => {
        if (g.assignmentId && initialGradesMap[g.studentId]) {
          initialGradesMap[g.studentId][g.assignmentId] = g.value;
        }
      });

      // Fill quiz attempts (read-only technically, but we map them)
      data.quizAttempts.forEach((qa: any) => {
         if (qa.quizId && initialGradesMap[qa.studentId]) {
            initialGradesMap[qa.studentId][qa.quizId] = qa.score; // Assumption: score is out of 20 or normalized
         }
      });

      setGradesMap(initialGradesMap);

    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du chargement de la grille");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId: string, assessmentId: string, value: string) => {
    // Only allow for assignments (quizzes could be readonly, but we let them override for now or we disable it in UI)
    const numValue = value === '' ? null : parseFloat(value);
    
    if (numValue !== null && (numValue < 0 || numValue > 20)) {
        return; // Prevent invalid
    }
    
    setGradesMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assessmentId]: numValue
      }
    }));
  };

  const calculateStudentAverage = (studentId: string) => {
    const sGrades = gradesMap[studentId];
    if (!sGrades) return 0;
    
    let totalWeighted = 0;
    let totalCoeff = 0;

    assessments.forEach(a => {
      const val = sGrades[a.id];
      if (val !== null && val !== undefined) {
        totalWeighted += (val * a.coefficient);
        totalCoeff += a.coefficient;
      }
    });

    return totalCoeff > 0 ? (totalWeighted / totalCoeff).toFixed(2) : '-';
  };

  const handleSave = async () => {
    if (!course) return;
    
    try {
      setSaving(true);
      
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
      
      alert("Notes sauvegardées avec succès !");
      if (onRefresh) onRefresh();
      
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de la sauvegarde");
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleAddColumn = async () => {
    if (!course || !newColTitle.trim()) return;
    try {
      setIsAddingCol(true);
      await api.post('/assignments/quick-add', {
        title: newColTitle,
        courseId: course.id,
        termId: termId,
        coefficient: newColCoeff
      });
      
      setNewColTitle('');
      setNewColCoeff(1);
      fetchGrid(); // Refresh grid
    } catch (err) {
      alert("Erreur lors de l'ajout de la colonne");
    } finally {
      setIsAddingCol(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement de la grille...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>;
  if (!course) return <div className="p-8 text-center text-slate-500">Aucun cours trouvé pour cette classe.</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Matière : {course.subject?.name}</h3>
          <p className="text-sm text-slate-500">Saisissez les notes sur 20. Les moyennes sont calculées automatiquement.</p>
        </div>
        <Button variant="primary" onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
          Enregistrer les notes
        </Button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700 min-w-[200px] sticky left-0 bg-slate-50 shadow-[1px_0_0_#e2e8f0]">
                Élève
              </th>
              {assessments.map(a => (
                <th key={a.id} className="px-4 py-3 font-semibold text-slate-700 min-w-[120px] text-center border-l border-slate-200">
                  <div className="truncate" title={a.title}>{a.title}</div>
                  <div className="text-xs text-slate-400 font-normal mt-0.5">Coef. {a.coefficient}</div>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold text-emerald-700 min-w-[120px] text-center border-l border-slate-200 bg-emerald-50">
                Moyenne / 20
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {students.map((student, idx) => (
              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white shadow-[1px_0_0_#e2e8f0]">
                  {idx + 1}. {student.lastName} {student.firstName}
                </td>
                
                {assessments.map(a => (
                  <td key={a.id} className="px-4 py-2 border-l border-slate-200 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.25"
                      value={gradesMap[student.id]?.[a.id] ?? ''}
                      onChange={(e) => handleGradeChange(student.id, a.id, e.target.value)}
                      disabled={a.type === 'quiz'} // Quizzes are readonly for now
                      className={`w-20 text-center px-2 py-1.5 border rounded-lg outline-none transition-all focus:ring-2 focus:ring-emerald-500/50 ${
                          a.type === 'quiz' ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-transparent' : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                      placeholder="-"
                    />
                  </td>
                ))}
                
                <td className="px-4 py-2 border-l border-slate-200 text-center bg-emerald-50/30">
                  <span className="font-bold text-emerald-700 text-base">
                    {calculateStudentAverage(student.id)}
                  </span>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
                <tr>
                    <td colSpan={assessments.length + 2} className="p-8 text-center text-slate-500">Aucun élève dans cette classe.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add New Column */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-end gap-4 max-w-2xl">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nouvelle évaluation (Devoir, Interro...)</label>
          <input 
            type="text" 
            value={newColTitle}
            onChange={e => setNewColTitle(e.target.value)}
            placeholder="Titre (ex: Devoir de maison 1)" 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coeff.</label>
          <input 
            type="number" 
            min="1"
            value={newColCoeff}
            onChange={e => setNewColCoeff(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>
        <Button variant="secondary" onClick={handleAddColumn} disabled={!newColTitle.trim() || isAddingCol}>
           {isAddingCol ? 'Ajout...' : <><Plus className="w-4 h-4 mr-1" /> Colonne</>}
        </Button>
      </div>
      
    </div>
  );
}
