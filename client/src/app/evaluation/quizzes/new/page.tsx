import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface Option {
    id?: string;
    text: string;
    isCorrect: boolean;
}

interface Question {
    id?: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE';
    points: number;
    options: Option[];
}

interface QuizForm {
    title: string;
    description: string;
    startDate?: string;
    endDate?: string;
    timeLimit?: number;
    questions: Question[];
}

const QuestionField = ({ qIndex, control, register, onRemove }: any) => {
    const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
        control,
        name: `questions.${qIndex}.options`
    });

    return (
        <div className="bg-brand-sidebar p-6 rounded-xl border border-brand-border/50 space-y-4">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-muted mb-1">Question {qIndex + 1}</label>
                        <input
                            {...register(`questions.${qIndex}.text`, { required: 'La question est requise' })}
                            className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-card text-brand-text"
                            placeholder="Entrez votre question..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1">Type de question</label>
                            <select
                                {...register(`questions.${qIndex}.type`)}
                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-card text-brand-text"
                            >
                                <option value="SINGLE">Choix unique</option>
                                <option value="MULTIPLE">Choix multiple</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1">Points</label>
                            <input
                                type="number"
                                min="1"
                                {...register(`questions.${qIndex}.points`)}
                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-card text-brand-text"
                            />
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition mt-6"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-brand-text-muted">Options de réponse</label>
                {options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            {...register(`questions.${qIndex}.options.${oIndex}.isCorrect`)}
                            className="w-5 h-5 text-brand-accent rounded border-brand-border/50 focus:ring-brand-accent"
                        />
                        <input
                            {...register(`questions.${qIndex}.options.${oIndex}.text`, { required: 'Option requise' })}
                            className="flex-1 p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-card text-brand-text"
                            placeholder={`Option ${oIndex + 1}`}
                        />
                        {options.length > 2 && (
                            <button
                                type="button"
                                onClick={() => removeOption(oIndex)}
                                className="p-2 text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => appendOption({ text: '', isCorrect: false })}
                    className="text-brand-accent text-sm font-medium flex items-center gap-1 hover:underline"
                >
                    <Plus className="w-4 h-4" /> Ajouter une option
                </button>
            </div>
        </div>
    );
};

export default function NewQuizPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { toast: addToast } = useToast();
    
    const { register, control, handleSubmit, formState: { errors } } = useForm<QuizForm>({
        defaultValues: {
            questions: [{ 
                text: '', 
                type: 'SINGLE', 
                points: 1, 
                options: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false }
                ] 
            }]
        }
    });

    const { fields: questions, append: appendQuestion, remove: removeQuestion } = useFieldArray({
        control,
        name: "questions"
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (data: QuizForm) => {
        try {
            setIsSubmitting(true);
            setError(null);
            
            // Basic validation
            for (const q of data.questions) {
                if (!q.options.some(o => o.isCorrect)) {
                    setError(`La question "${q.text}" n'a aucune réponse correcte.`);
                    setIsSubmitting(false);
                    return;
                }
            }

            await api.post('/quizzes', { ...data, courseId });
            addToast("success", "QCM créé avec succès");
            navigate(`/enseignant/courses/${courseId}`);
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || `Erreur lors de la création du QCM.`;
            const validationErrors = err.response?.data?.errors;
            
            if (validationErrors) {
                const details = validationErrors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
                setError(`${errorMessage} (${details})`);
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Link to={`/enseignant/courses/${courseId}`} className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <PageHeader 
                    title="Nouvelle Évaluation"
                    description="Créez un questionnaire interactif pour vos élèves"
                />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto">
                <div className="bg-brand-card p-6 rounded-xl border border-brand-border/50 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-brand-text">Informations générales</h3>
                    <div>
                        <label className="block text-sm font-medium text-brand-text-muted mb-1">Titre de l'évaluation <span className="text-red-500">*</span></label>
                        <input
                            {...register('title', { required: 'Titre requis' })}
                            className="w-full p-3 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                            placeholder="Ex: Évaluation Chapitre 1"
                        />
                        {errors.title && <span className="text-red-500 text-sm mt-1">{errors.title.message}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-brand-text-muted mb-1">Description (Optionnel)</label>
                        <textarea
                            {...register('description')}
                            className="w-full p-3 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text resize-y"
                            placeholder="Instructions pour les élèves..."
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1">Date d'ouverture <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                {...register('startDate', { required: 'Date de début requise' })}
                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                            />
                            {errors.startDate && <span className="text-red-500 text-sm mt-1">{errors.startDate.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1">Date de fermeture <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                {...register('endDate', { required: 'Date de fin requise' })}
                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                            />
                            {errors.endDate && <span className="text-red-500 text-sm mt-1">{errors.endDate.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-brand-text-muted mb-1">Durée (minutes)</label>
                            <input
                                type="number"
                                min="1"
                                {...register('timeLimit')}
                                className="w-full p-2 border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 outline-none bg-brand-sidebar text-brand-text"
                                placeholder="Ex: 30"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-brand-text">Questions</h3>
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {questions.map((question, qIndex) => (
                            <QuestionField 
                                key={question.id} 
                                qIndex={qIndex} 
                                control={control} 
                                register={register} 
                                onRemove={() => removeQuestion(qIndex)}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => appendQuestion({ 
                            text: '', 
                            type: 'SINGLE', 
                            points: 1, 
                            options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] 
                        })}
                        className="w-full py-4 border-2 border-dashed border-brand-border hover:border-brand-accent rounded-xl text-brand-text-muted hover:text-brand-accent transition flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Ajouter une nouvelle question
                    </button>
                </div>

                <div className="flex justify-end gap-4 sticky bottom-6 bg-brand-card/80 backdrop-blur-md p-4 rounded-xl border border-brand-border/50 shadow-lg">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(`/enseignant/courses/${courseId}`)}
                        disabled={isSubmitting}
                    >
                        Annuler
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        leftIcon={<Save className="w-4 h-4" />}
                    >
                        {isSubmitting ? 'Création en cours...' : 'Enregistrer le QCM'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
