import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Printer, User, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface ReportCardData {
  student: {
    firstName: string;
    lastName: string;
    class: string;
  };
  school: {
    name: string;
    address?: string;
  };
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
  subjects: {
    id: string;
    subject: string;
    subjectCode?: string;
    teacher: string;
    average: number | null;
    coefficient: number;
    grades: {
      value: number;
      assignment?: string;
    }[];
  }[];
  overallAverage: number | null;
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

const StudentReportCards = () => {
  const { user } = useAuth();
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  
  // Admin/Teacher Selection State
  const [classes, setClasses] = useState<{id: string, name: string}[]>([]);
  const [students, setStudents] = useState<{id: string, firstName: string, lastName: string}[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTerms();
    if (user?.role !== 'APPRENANT') {
        fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
        fetchClassStudents(selectedClassId);
    } else {
        setStudents([]);
        setSelectedStudentId('');
    }
  }, [selectedClassId]);

  useEffect(() => {
    // Logic for triggering fetch
    if (user?.role === 'APPRENANT') {
        if (selectedTermId) fetchReportCard(selectedTermId);
    } else {
        // For Admin/Teacher, need both student and term
        if (selectedTermId && selectedStudentId) {
            fetchReportCard(selectedTermId, selectedStudentId);
        } else if (selectedStudentId && terms.length > 0 && !selectedTermId) {
             // Auto-select term if student selected but term not (unlikely due to initial load)
             const openTerm = terms.find(t => t.status === 'OPEN') || terms[0];
             if (openTerm) setSelectedTermId(openTerm.id);
        }
    }
  }, [terms, selectedTermId, selectedStudentId, user]);

  const fetchClasses = async () => {
      try {
          const response = await api.get('/classes');
          setClasses(response.data);
      } catch (err) {
          console.error("Error fetching classes", err);
      }
  };

  const fetchClassStudents = async (classId: string) => {
      try {
          const response = await api.get(`/classes/${classId}/students`);
          setStudents(response.data);
      } catch (err) {
          console.error("Error fetching students", err);
      }
  };


  const fetchTerms = async () => {
    try {
      const response = await api.get('/academic-years'); // Returns years with terms
      // Flatten terms from years
      const allTerms: Term[] = [];
      response.data.forEach((year: any) => {
        if (year.terms) {
            allTerms.push(...year.terms);
        }
      });
      // Sort terms by date desc
      allTerms.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      setTerms(allTerms);
    } catch (err) {
      console.error("Error fetching terms", err);
    }
  };

  const fetchReportCard = async (termId: string, studentId?: string) => {
    try {
      setLoading(true);
      setError(null);
      let url = `/grades/report-card?termId=${termId}`;
      if (studentId) {
          url = `/grades/report-card/${studentId}?termId=${termId}`;
      }
      
      const response = await api.get(url);
      setReportCard(response.data);
    } catch (err) {
      console.error("Error fetching report card", err);
      setError("Impossible de charger le bulletin.");
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
            <PageHeader
                title="Bulletins de Notes"
                subtitle={user?.role !== 'APPRENANT' ? "Consultez les bulletins des élèves" : undefined}
            />
            
            <div className="flex flex-wrap gap-3 items-center">
                {user?.role !== 'APPRENANT' && (
                    <>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-brand-text-muted" />
                            <select 
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="p-2 border rounded-md shadow-sm bg-brand-sidebar border-brand-border/50 text-brand-text outline-none focus:ring-2 focus:ring-brand-accent min-w-[150px]"
                            >
                                <option value="">Choisir une classe...</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-brand-text-muted" />
                            <select 
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                disabled={!selectedClassId}
                                className="p-2 border rounded-md shadow-sm bg-brand-sidebar border-brand-border/50 text-brand-text outline-none focus:ring-2 focus:ring-brand-accent min-w-[200px] disabled:opacity-50"
                            >
                                <option value="">Choisir un élève...</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <select 
                    value={selectedTermId} 
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="p-2 border rounded-md shadow-sm bg-brand-sidebar border-brand-border/50 text-brand-text outline-none focus:ring-2 focus:ring-brand-accent"
                >
                    {terms.map(term => (
                        <option key={term.id} value={term.id}>{term.name}</option>
                    ))}
                </select>
                <Button 
                    variant="primary"
                    onClick={handlePrint}
                    disabled={!reportCard}
                    leftIcon={<Printer className="w-4 h-4" />}
                >
                    Imprimer
                </Button>
            </div>
        </div>

        {user?.role !== 'APPRENANT' && !selectedStudentId && (
            <div className="text-center py-12 bg-brand-card rounded-xl border border-dashed border-brand-border text-brand-text-muted">
                <User className="w-12 h-12 opacity-20 mx-auto mb-3" />
                <p>Veuillez sélectionner une classe et un élève pour voir le bulletin</p>
            </div>
        )}

        {loading && <div className="text-center py-8 text-brand-text-muted">Chargement du bulletin...</div>}
        {error && <div className="text-center py-8 text-red-500">{error}</div>}

        {reportCard && !loading && (
            <div className="bg-brand-card p-8 shadow-lg rounded-xl max-w-4xl mx-auto print-area border border-brand-border/50" ref={printRef}>
                {/* Header */}
                <div className="flex justify-between border-b border-brand-border/50 pb-6 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-brand-text uppercase">{reportCard.school.name}</h2>
                        <p className="text-brand-text-muted">{reportCard.school.address}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xl font-semibold text-brand-text">BULLETIN DE NOTES</h3>
                        <p className="text-brand-text-muted">{reportCard.term.name}</p>
                        <p className="text-sm text-brand-text-muted mt-2">Année Scolaire {new Date(reportCard.term.startDate).getFullYear()}-{new Date(reportCard.term.endDate).getFullYear()}</p>
                    </div>
                </div>

                {/* Student Info */}
                <div className="mb-8 p-4 bg-brand-sidebar rounded-xl border border-brand-border/50">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-brand-text-muted uppercase text-xs font-semibold">Élève</span>
                            <p className="text-lg font-bold text-brand-text">{reportCard.student.firstName} {reportCard.student.lastName}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-brand-text-muted uppercase text-xs font-semibold">Classe</span>
                            <p className="text-lg font-bold text-brand-text">{reportCard.student.class}</p>
                        </div>
                    </div>
                </div>

                {/* Grades Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse mb-8">
                        <thead>
                            <tr className="bg-brand-sidebar border-b border-brand-border/50">
                                <th className="p-3 text-left text-sm font-bold text-brand-text uppercase">Matière</th>
                                <th className="p-3 text-left text-sm font-bold text-brand-text uppercase">Enseignant</th>
                                <th className="p-3 text-center text-sm font-bold text-brand-text uppercase">Coef.</th>
                                <th className="p-3 text-center text-sm font-bold text-brand-text uppercase">Moyenne</th>
                                <th className="p-3 text-left text-sm font-bold text-brand-text uppercase">Appréciation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportCard.subjects.map((subject) => (
                                <tr key={subject.id} className="border-b border-brand-border/30">
                                    <td className="p-3">
                                        <p className="font-semibold text-brand-text">{subject.subject}</p>
                                        <p className="text-xs text-brand-text-muted">{subject.subjectCode}</p>
                                    </td>
                                    <td className="p-3 text-brand-text-muted">{subject.teacher}</td>
                                    <td className="p-3 text-center font-medium text-brand-text-muted">{subject.coefficient || 1}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-bold ${
                                            subject.average === null ? 'text-brand-text-muted opacity-50' :
                                            subject.average >= 10 ? 'text-emerald-500' : 'text-red-500'
                                        }`}>
                                            {subject.average !== null ? subject.average.toFixed(2) : '-'}
                                        </span>
                                        <span className="text-xs text-brand-text-muted ml-1">/20</span>
                                    </td>
                                    <td className="p-3 text-sm text-brand-text-muted italic">
                                        {subject.average !== null 
                                            ? (subject.average >= 15 ? "Très bien" : subject.average >= 12 ? "Bien" : subject.average >= 10 ? "Passable" : "Insuffisant")
                                            : "Aucune note"
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-brand-sidebar font-bold">
                                <td colSpan={3} className="p-4 text-right uppercase text-brand-text">Moyenne Générale</td>
                                <td className="p-4 text-center text-xl border-t border-brand-border/50">
                                    <span className={
                                        reportCard.overallAverage === null ? 'text-brand-text-muted opacity-50' :
                                        reportCard.overallAverage >= 10 ? 'text-brand-accent' : 'text-red-500'
                                    }>
                                        {reportCard.overallAverage !== null ? reportCard.overallAverage.toFixed(2) : '-'}
                                    </span>
                                    <span className="text-sm text-brand-text-muted ml-1">/20</span>
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer / Signatures */}
                <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-brand-border/50 text-center text-sm text-brand-text-muted">
                     <div>
                        <p className="mb-8 font-semibold uppercase">L'Élève</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase">Les Parents</p>
                     </div>
                     <div>
                        <p className="mb-8 font-semibold uppercase">Le Directeur</p>
                     </div>
                </div>
                
                <div className="text-center text-xs text-brand-text-muted mt-8">
                    Bulletin généré le {new Date().toLocaleDateString()} via Ecole Connectée
                </div>
            </div>
        )}
        
        {/* CSS for print */}
        <style>{`
            @media print {
                .no-print { display: none !important; }
                body * { visibility: hidden; }
                .print-area, .print-area * { visibility: visible; }
                .print-area { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                /* Sidebar handling - might need to target specific classes if body * covers it */
                #root > div > div.fixed { display: none; } /* Sidebar */
            }
        `}</style>
    </div>
  );
};

export default StudentReportCards;
