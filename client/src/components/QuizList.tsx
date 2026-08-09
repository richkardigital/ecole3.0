import { useState } from 'react';
import { Plus, CheckCircle, Clock, PlayCircle, Edit2, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';

interface Quiz {
    id: string;
    title: string;
    description?: string;
    type: string;
    _count: { questions: number };
    attempts?: { id: string, score: number }[];
    questions?: any[];
    startDate?: string;
    endDate?: string;
    timeLimit?: number;
}

interface QuizListProps {
    courseId: string;
    isTeacher: boolean;
    quizzes: Quiz[];
    onUpdate: () => void;
}

const QuizList = ({ courseId, isTeacher, quizzes, onUpdate }: QuizListProps) => {
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (!deletingQuizId) return;
        try {
            setIsDeleting(true);
            await api.delete(`/quizzes/${deletingQuizId}`);
            onUpdate();
            setDeletingQuizId(null);
        } catch (error) {
            console.error("Error deleting quiz", error);
            alert("Erreur lors de la suppression du QCM.");
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (quizId: string) => {
        navigate(`/enseignant/courses/${courseId}/quizzes/${quizId}/edit`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Évaluations en ligne</h2>
                {isTeacher && (
                    <button
                        onClick={() => navigate(`/enseignant/courses/${courseId}/quizzes/new`)}
                        className="bg-brand-accent text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-accent/90 transition"
                    >
                        <Plus className="w-4 h-4" />
                        Nouvelle Évaluation
                    </button>
                )}
            </div>

            <div className="grid gap-4">
                {quizzes.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">Aucune évaluation disponible pour le moment.</p>
                    </div>
                )}
                
                {quizzes.map((quiz) => {
                    const hasAttempted = !isTeacher && quiz.attempts && quiz.attempts.length > 0;
                    const attemptId = hasAttempted ? quiz.attempts![0].id : null;
                    
                    const now = new Date();
                    const isBeforeStart = quiz.startDate ? now < new Date(quiz.startDate) : false;
                    const isAfterEnd = quiz.endDate ? now > new Date(quiz.endDate) : false;
                    
                    return (
                        <div key={quiz.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{quiz.title}</h3>
                                        <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded">
                                            {quiz.type === 'EXERCICE_MAISON' ? 'Exercice (Non noté)' : 
                                             quiz.type === 'DEVOIR_CLASSE' ? 'Devoir de classe' : 
                                             quiz.type === 'DEVOIR_NIVEAU' ? 'Devoir de niveau' : 'Devoir maison'}
                                        </span>
                                    </div>
                                    {quiz.description && <p className="text-gray-600 dark:text-gray-300 mt-1">{quiz.description}</p>}
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {quiz._count.questions} questions {quiz.timeLimit ? `(${quiz.timeLimit} min)` : ''}
                                        </span>
                                        {quiz.startDate && (
                                            <span className="flex items-center gap-1 text-blue-500">
                                                Ouvre: {new Date(quiz.startDate).toLocaleDateString()} {new Date(quiz.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                        {hasAttempted && (
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                                                <CheckCircle className="w-4 h-4" />
                                                Note: {quiz.attempts![0].score.toFixed(1)}/20
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {isTeacher ? (
                                        <>
                                            <button
                                                onClick={() => navigate(`/quizzes/${quiz.id}/attempts`)}
                                                className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                                                title="Voir les résultats"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(quiz.id)}
                                                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                                                title="Modifier"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingQuizId(quiz.id)}
                                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        hasAttempted ? (
                                            <Link
                                                to={`/quizzes/attempts/${attemptId}`}
                                                className="px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg font-medium flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Voir mes erreurs
                                            </Link>
                                        ) : isBeforeStart ? (
                                            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed">
                                                <Clock className="w-4 h-4" />
                                                Pas encore ouvert
                                            </button>
                                        ) : isAfterEnd ? (
                                            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-400 rounded-lg font-medium cursor-not-allowed">
                                                <AlertTriangle className="w-4 h-4" />
                                                Terminé
                                            </button>
                                        ) : (
                                            <Link
                                                to={`/quizzes/${quiz.id}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium"
                                            >
                                                <PlayCircle className="w-4 h-4" />
                                                Commencer
                                            </Link>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Deletion Confirmation Modal */}
            {deletingQuizId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">Confirmer la suppression</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Êtes-vous sûr de vouloir supprimer ce QCM ? Cette action est irréversible et supprimera également toutes les tentatives des élèves.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingQuizId(null)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                                disabled={isDeleting}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuizList;
