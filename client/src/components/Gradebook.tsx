import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Save, CheckCircle } from 'lucide-react';

interface GradebookProps {
  courseId: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
}

interface Grade {
  id: string;
  studentId: string;
  assignmentId: string;
  value: number;
  comment?: string;
}

const Gradebook = ({ courseId }: GradebookProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // assignmentId-studentId
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchGradebook();
  }, [courseId]);

  const fetchGradebook = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/grades/${courseId}/gradebook`);
      setStudents(response.data.students);
      setAssignments(response.data.assignments);
      setGrades(response.data.grades);
    } catch (err) {
      console.error("Error fetching gradebook", err);
      setError("Impossible de charger le carnet de notes.");
    } finally {
      setLoading(false);
    }
  };

  const getGradeValue = (studentId: string, assignmentId: string) => {
    const grade = grades.find(g => g.studentId === studentId && g.assignmentId === assignmentId);
    return grade ? grade.value : '';
  };

  const handleGradeChange = async (studentId: string, assignmentId: string, value: string) => {
    // Basic validation
    if (value === '') return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
        alert("La note doit être comprise entre 0 et 20");
        return;
    }

    const key = `${assignmentId}-${studentId}`;
    setSaving(key);
    setSaveSuccess(null);

    try {
      await api.post('/grades/save', {
        studentId,
        assignmentId,
        value: numValue
      });

      // Update local state
      setGrades(prev => {
        const existing = prev.find(g => g.studentId === studentId && g.assignmentId === assignmentId);
        if (existing) {
          return prev.map(g => g.studentId === studentId && g.assignmentId === assignmentId ? { ...g, value: numValue } : g);
        } else {
          return [...prev, { id: 'temp', studentId, assignmentId, value: numValue }];
        }
      });
      
      setSaveSuccess(key);
      setTimeout(() => setSaveSuccess(null), 2000);

    } catch (err) {
      console.error("Error saving grade", err);
      alert("Erreur lors de l'enregistrement de la note.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-800 dark:text-gray-200">Chargement du carnet de notes...</div>;
  if (error) return <div className="p-4 text-center text-red-500 dark:text-red-400">{error}</div>;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        Carnet de Notes
      </h2>
      
      {students.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">Aucun élève inscrit dans ce cours.</p>
      ) : assignments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 italic">Aucun devoir créé pour ce cours.</p>
      ) : (
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700">
              <th className="p-3 text-left border dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">Élève</th>
              {assignments.map(assignment => (
                <th key={assignment.id} className="p-3 text-center border dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 min-w-[100px]">
                  <div className="flex flex-col">
                    <span className="text-gray-800 dark:text-white">{assignment.title}</span>
                    <span className="text-xs font-normal text-gray-400 dark:text-gray-500">/20</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="p-3 border dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-800">
                  {student.lastName} {student.firstName}
                </td>
                {assignments.map(assignment => {
                  const key = `${assignment.id}-${student.id}`;
                  const isSaving = saving === key;
                  const isSuccess = saveSuccess === key;
                  
                  return (
                    <td key={assignment.id} className="p-2 border dark:border-gray-600 text-center relative">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          className={`w-16 p-1 text-center border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:text-white ${isSuccess ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                          defaultValue={getGradeValue(student.id, assignment.id)}
                          onBlur={(e) => {
                            const val = e.target.value;
                            const currentVal = getGradeValue(student.id, assignment.id);
                            if (val !== '' && parseFloat(val) !== currentVal) {
                                handleGradeChange(student.id, assignment.id, val);
                            }
                          }}
                        />
                        {isSaving && <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>}
                        {isSuccess && <CheckCircle className="w-4 h-4 text-green-500" />}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Gradebook;
