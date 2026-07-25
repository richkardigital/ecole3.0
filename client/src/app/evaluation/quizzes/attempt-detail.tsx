import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface Option {
    id: string;
    text: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE';
    points: number;
    options: Option[];
}

interface Answer {
    questionId: string;
    selectedOptions: string[];
}

interface AttemptDetail {
    id: string;
    score: number;
    completedAt: string;
    student: {
        firstName: string;
        lastName: string;
    };
    quiz: {
        title: string;
        questions: Question[];
    };
    answers: Answer[];
}

const QuizAttemptDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/quizzes/attempts/${id}`)
            .then(res => setAttempt(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="p-10 text-center dark:text-white">Chargement...</div>;
    if (!attempt) return <div className="p-10 text-center dark:text-white">Tentative introuvable.</div>;

    return (
        <div className="space-y-6">
            <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
                Retour
            </Button>

            <div className="bg-brand-card p-8 rounded-2xl shadow-sm border border-brand-border/50 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-brand-text">{attempt.quiz.title}</h1>
                        <p className="text-brand-text-muted">
                            Par {attempt.student.firstName} {attempt.student.lastName} • 
                            Le {new Date(attempt.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="bg-brand-accent/10 px-6 py-3 rounded-xl border border-brand-accent/20 text-center">
                        <span className="block text-sm text-brand-accent font-medium uppercase tracking-wider">Note Finale</span>
                        <span className="text-4xl font-black text-brand-accent">
                            {attempt.score.toFixed(1)}<span className="text-xl opacity-60">/20</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-xl font-bold text-brand-text flex items-center gap-2">
                    <Info className="w-5 h-5 text-brand-accent" />
                    Détail des réponses
                </h2>

                {attempt.quiz.questions.map((question, index) => {
                    const studentAnswer = attempt.answers.find(a => a.questionId === question.id);
                    const selectedIds = studentAnswer?.selectedOptions || [];
                    const correctIds = question.options.filter(o => o.isCorrect).map(o => o.id);
                    
                    const isFullyCorrect = 
                        selectedIds.length === correctIds.length && 
                        selectedIds.every(id => correctIds.includes(id));

                    return (
                        <div key={question.id} className={`p-6 rounded-xl border-2 transition ${
                            isFullyCorrect 
                                ? 'bg-emerald-500/5 border-emerald-500/30' 
                                : 'bg-red-500/5 border-red-500/30'
                        }`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-sidebar border border-brand-border/50 flex items-center justify-center font-bold text-brand-text">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-lg font-bold text-brand-text pt-0.5">{question.text}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isFullyCorrect ? (
                                        <span className="flex items-center gap-1 text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1 rounded-full text-sm">
                                            <CheckCircle className="w-4 h-4" /> Correct
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full text-sm">
                                            <XCircle className="w-4 h-4" /> Erreur
                                        </span>
                                    )}
                                    <span className="text-sm text-brand-text-muted font-medium">
                                        {question.points} pt{question.points > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 ml-11">
                                {question.options.map(option => {
                                    const isSelected = selectedIds.includes(option.id);
                                    const isCorrect = option.isCorrect;
                                    
                                    let statusStyle = "border-brand-border/50 bg-brand-sidebar";
                                    let icon = null;

                                    if (isCorrect) {
                                        statusStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-500";
                                        icon = <CheckCircle className="w-4 h-4 text-emerald-500" />;
                                    } else if (isSelected && !isCorrect) {
                                        statusStyle = "border-red-500 bg-red-500/10 text-red-500";
                                        icon = <XCircle className="w-4 h-4 text-red-500" />;
                                    }

                                    return (
                                        <div key={option.id} className={`p-3 rounded-lg border flex items-center justify-between ${statusStyle}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                                    isSelected ? 'bg-brand-accent border-brand-accent' : 'border-brand-text-muted'
                                                }`}>
                                                    {isSelected && <div className="w-1.5 h-1.5 bg-brand-bg rounded-full"></div>}
                                                </div>
                                                <span className="font-medium text-brand-text">{option.text}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isSelected && <span className="text-xs font-bold uppercase tracking-tighter opacity-60">Votre réponse</span>}
                                                {icon}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {!isFullyCorrect && (
                                <div className="mt-4 ml-11 p-3 bg-brand-accent/10 rounded-lg border border-brand-accent/20 flex items-start gap-2 text-sm text-brand-accent">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>
                                        <strong className="text-brand-text">Solution correcte :</strong> {question.options.filter(o => o.isCorrect).map(o => o.text).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QuizAttemptDetail;
