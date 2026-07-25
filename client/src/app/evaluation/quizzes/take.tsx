import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import ConfirmationModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE';
    points: number;
    options: Option[];
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    questions: Question[];
}

const QuizTake = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [currentStep, setCurrentStep] = useState(0); // 0 = Intro, 1...N = Questions, N+1 = Review
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [result, setResult] = useState<{ score: number, totalPoints: number, attemptId: string } | null>(null);
    const { toast, success, error: toastError } = useToast();

    useEffect(() => {
        if (id) {
            api.get(`/quizzes/${id}`).then(res => setQuiz(res.data)).catch(err => console.error(err));
        }
    }, [id]);

    const handleOptionSelect = (questionId: string, optionId: string, type: 'SINGLE' | 'MULTIPLE') => {
        setAnswers(prev => {
            const current = prev[questionId] || [];
            if (type === 'SINGLE') {
                return { ...prev, [questionId]: [optionId] };
            } else {
                if (current.includes(optionId)) {
                    return { ...prev, [questionId]: current.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [questionId]: [...current, optionId] };
                }
            }
        });
    };

    const submitQuiz = async () => {
        try {
            setIsSubmitting(true);
            const res = await api.post(`/quizzes/${id}/submit`, { answers });
            setResult({
                score: res.data.attempt.score,
                totalPoints: 20, // Always scaled to 20
                attemptId: res.data.attempt.id
            });
            setShowConfirmModal(false);
            success("Quiz envoyé avec succès !");
        } catch (error: any) {
            console.error("Submission error", error);
            toastError(error.response?.data?.message || "Erreur lors de l'envoi du quiz.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!quiz) return <div className="p-10 text-center text-brand-text">Chargement...</div>;

    // Intro Screen
    if (currentStep === 0) {
        return (
            <div className="max-w-2xl mx-auto p-6 mt-10">
                <div className="bg-brand-card p-8 rounded-xl shadow-lg text-center border border-brand-border/50">
                    <h1 className="text-3xl font-bold text-brand-text mb-4">{quiz.title}</h1>
                    {quiz.description && <p className="text-brand-text-muted mb-8 text-lg">{quiz.description}</p>}
                    
                    <div className="bg-brand-accent/10 p-4 rounded-lg inline-block mb-8 text-brand-accent text-sm border border-brand-accent/20">
                        <p className="font-semibold">Ce QCM contient {quiz.questions.length} questions.</p>
                        <p>Attention: Une seule tentative est autorisée.</p>
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setCurrentStep(1)}
                        className="w-full md:w-auto px-8 py-3 font-bold text-lg flex items-center justify-center gap-2 mx-auto"
                        rightIcon={<ArrowRight className="w-5 h-5" />}
                    >
                        Commencer
                    </Button>
                </div>
            </div>
        );
    }

    // Result Screen
    if (result) {
        return (
            <div className="max-w-xl mx-auto p-6 mt-10">
                <div className="bg-brand-card p-8 rounded-xl shadow-lg text-center border border-brand-border/50">
                    <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-brand-text mb-2">Quiz Terminé !</h2>
                    <p className="text-brand-text-muted mb-6">Vos réponses ont été enregistrées avec succès.</p>
                    
                    <div className="text-5xl font-bold text-brand-accent mb-2">
                        {result.score.toFixed(1)}<span className="text-2xl text-brand-text-muted">/20</span>
                    </div>
                    <p className="text-sm text-brand-text-muted mb-8">Votre note finale</p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="primary"
                            onClick={() => navigate(`/quizzes/attempts/${result.attemptId}`)}
                            leftIcon={<Info className="w-5 h-5" />}
                        >
                            Voir mes erreurs
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => navigate(-1)}
                        >
                            Retour au cours
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestionIndex = currentStep - 1;
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    return (
        <div className="max-w-3xl mx-auto p-6 mt-6">
            <div className="mb-6 flex justify-between items-center text-sm text-brand-text-muted font-medium">
                <span>Question {currentStep} / {quiz.questions.length}</span>
                <span>Progression: {Math.round((currentQuestionIndex / quiz.questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-brand-sidebar h-2 rounded-full mb-8 overflow-hidden border border-brand-border/30">
                <div 
                    className="bg-brand-accent h-full transition-all duration-300" 
                    style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
                ></div>
            </div>

            <div className="bg-brand-card p-8 rounded-xl shadow-sm border border-brand-border/50">
                <h2 className="text-xl font-bold text-brand-text mb-6">{currentQuestion.text}</h2>
                
                <div className="space-y-3">
                    {currentQuestion.options.map(option => {
                        const isSelected = (answers[currentQuestion.id] || []).includes(option.id);
                        return (
                            <div 
                                key={option.id}
                                onClick={() => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                                    isSelected 
                                        ? 'border-brand-accent bg-brand-accent/10' 
                                        : 'border-brand-border/50 hover:border-brand-accent/50 hover:bg-brand-sidebar/50'
                                }`}
                            >
                                <span className={`font-medium ${isSelected ? 'text-brand-accent' : 'text-brand-text'}`}>{option.text}</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected 
                                        ? 'border-brand-accent bg-brand-accent' 
                                        : 'border-brand-text-muted'
                                }`}>
                                    {isSelected && <div className="w-2 h-2 bg-brand-bg rounded-full"></div>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 flex justify-between">
                    <Button
                        variant="secondary"
                        onClick={() => setCurrentStep(prev => prev - 1)}
                        className={`${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Précédent
                    </Button>

                    {isLastQuestion ? (
                        <Button
                            variant="primary"
                            onClick={() => setShowConfirmModal(true)}
                            disabled={isSubmitting}
                            className="!bg-emerald-500 hover:!bg-emerald-600 !text-white"
                        >
                            Terminer le Quiz
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            rightIcon={<ArrowRight className="w-4 h-4" />}
                        >
                            Suivant
                        </Button>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={submitQuiz}
                title="Confirmer l'envoi"
                message="Êtes-vous sûr de vouloir envoyer vos réponses ? Vous ne pourrez plus revenir en arrière ou modifier vos choix après confirmation."
                confirmText={isSubmitting ? 'Envoi...' : 'Confirmer et Envoyer'}
                variant="primary"
            />
        </div>
    );
};

export default QuizTake;
