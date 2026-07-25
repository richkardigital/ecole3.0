import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface Attempt {
    id: string;
    score: number;
    completedAt: string;
    student: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

const QuizAttemptsList = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [quizTitle, setQuizTitle] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [quizRes, attemptsRes] = await Promise.all([
                    api.get(`/quizzes/${id}`),
                    api.get(`/quizzes/${id}/attempts`)
                ]);
                setQuizTitle(quizRes.data.title);
                setAttempts(attemptsRes.data);
            } catch (error) {
                console.error("Error fetching attempts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center dark:text-white">Chargement...</div>;

    return (
        <div className="space-y-6">
            <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
                Retour au cours
            </Button>

            <PageHeader
                title={`Résultats : ${quizTitle}`}
                subtitle={`${attempts.length} tentative(s) enregistrée(s)`}
            />

            <div className="bg-brand-card rounded-xl border border-brand-border/50 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-brand-sidebar border-b border-brand-border/50">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-brand-text-muted">Élève</th>
                            <th className="px-6 py-4 text-sm font-semibold text-brand-text-muted">Date</th>
                            <th className="px-6 py-4 text-sm font-semibold text-brand-text-muted">Note /20</th>
                            <th className="px-6 py-4 text-sm font-semibold text-brand-text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {attempts.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-brand-text-muted">
                                    Aucune tentative pour le moment.
                                </td>
                            </tr>
                        ) : (
                            attempts.map((attempt) => (
                                <tr key={attempt.id} className="hover:bg-brand-sidebar transition">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-brand-text">
                                                    {attempt.student.firstName} {attempt.student.lastName}
                                                </p>
                                                <p className="text-xs text-brand-text-muted">{attempt.student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-brand-text-muted">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(attempt.completedAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`font-bold text-lg ${
                                            attempt.score >= 10 ? 'text-emerald-500' : 'text-red-500'
                                        }`}>
                                            {attempt.score.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => navigate(`/quizzes/attempts/${attempt.id}`)}
                                            className="text-brand-accent hover:underline text-sm font-medium"
                                        >
                                            Voir détails
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default QuizAttemptsList;
