import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';

interface Option {
    id?: string;
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
}

interface Question {
    id?: string;
    text: string;
    type: 'SINGLE' | 'MULTIPLE' | 'FILL_IN_BLANK';
    points: number;
    options?: Option[];
    expectedAnswer?: string;
    imageUrl?: string;
}

interface QuizForm {
    title: string;
    description: string;
    startDate?: string;
    endDate?: string;
    timeLimit?: number;
    imageUrl?: string;
    type?: string;
    niveauId?: string;
    autoGrade?: boolean;
    questions: Question[];
}

const QuestionField = ({ qIndex, control, register, onRemove, watch }: any) => {
    const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
        control,
        name: `questions.${qIndex}.options`
    });
    
    const questionType = watch(`questions.${qIndex}.type`);

    return (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Question {qIndex + 1}</label>
                        <input
                            {...register(`questions.${qIndex}.text`, { required: 'La question est requise' })}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                            placeholder="Entrez votre question..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Type de question</label>
                            <select
                                {...register(`questions.${qIndex}.type`)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                            >
                                <option value="SINGLE">Choix unique</option>
                                <option value="MULTIPLE">Choix multiple</option>
                                <option value="FILL_IN_BLANK">Texte à trous</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Points</label>
                            <input
                                type="number"
                                min="1"
                                {...register(`questions.${qIndex}.points`)}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                            />
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition mt-6"
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Image optionnelle (URL)</label>
                <input
                    {...register(`questions.${qIndex}.imageUrl`)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                    placeholder="URL de l'image (optionnel)"
                />
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-500">Réponse(s) attendue(s)</label>
                
                {questionType === 'FILL_IN_BLANK' ? (
                    <div>
                        <input
                            {...register(`questions.${qIndex}.expectedAnswer`, { required: 'La réponse attendue est requise' })}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                            placeholder="Entrez la réponse exacte attendue"
                        />
                    </div>
                ) : (
                    <>
                        {options.map((option: any, oIndex: number) => (
                            <div key={option.id} className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    {...register(`questions.${qIndex}.options.${oIndex}.isCorrect`)}
                                    className="w-5 h-5 text-indigo-600 rounded border-slate-200 focus:ring-indigo-600"
                                />
                                <div className="flex-1 space-y-2">
                                    <input
                                        {...register(`questions.${qIndex}.options.${oIndex}.text`, { required: 'Option requise' })}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900"
                                        placeholder={`Option ${oIndex + 1}`}
                                    />
                                    <input
                                        {...register(`questions.${qIndex}.options.${oIndex}.imageUrl`)}
                                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-white text-slate-900 text-sm"
                                        placeholder="URL de l'image de l'option (optionnel)"
                                    />
                                </div>
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(oIndex)}
                                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => appendOption({ text: '', isCorrect: false })}
                            className="text-indigo-600 text-sm font-medium flex items-center gap-1 hover:underline"
                        >
                            <Plus className="w-4 h-4" /> Ajouter une option
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default function NewQuizPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { toast: addToast } = useToast();
    const { user } = useAuth();
    const rolePrefix = user?.role === 'SUPER_ADMIN' ? '/admin' : user?.role === 'DIRECTEUR' ? '/directeur' : '/enseignant';
    
    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<QuizForm>({
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
                if (q.type !== 'FILL_IN_BLANK' && (!q.options || !q.options.some(o => o.isCorrect))) {
                    setError(`La question "${q.text}" n'a aucune réponse correcte.`);
                    setIsSubmitting(false);
                    return;
                }
                if (q.type === 'FILL_IN_BLANK' && !q.expectedAnswer) {
                    setError(`La question "${q.text}" nécessite une réponse attendue.`);
                    setIsSubmitting(false);
                    return;
                }
            }

            await api.post('/quizzes', { ...data, courseId });
            addToast("success", "QCM créé avec succès");
            navigate(`${rolePrefix}/courses/${courseId}`);
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
        <div className="p-6 md:p-8 lg:p-10 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center gap-4 mb-4">
                <Link to={`${rolePrefix}/courses/${courseId}?tab=QUIZZES`} className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-sidebar rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <span className="text-sm font-medium text-brand-text-muted">Retour au cours</span>
            </div>

            <PageHeader 
                title="Nouvelle Évaluation"
                description="Créez un questionnaire interactif pour vos élèves"
            />

            <div className="bg-brand-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)} className="divide-y divide-brand-border/50">
                    <div className="p-6 space-y-6">
                        <h3 className="text-lg font-bold text-slate-900">Informations générales</h3>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Titre de l'évaluation <span className="text-red-500">*</span></label>
                        <input
                            {...register('title', { required: 'Titre requis' })}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                            placeholder="Ex: Évaluation Chapitre 1"
                        />
                        {errors.title && <span className="text-red-500 text-sm mt-1">{errors.title.message}</span>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Image d'illustration (Optionnel)</label>
                        <input
                            {...register('imageUrl')}
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                            placeholder="URL de l'image (optionnel)"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Type d'évaluation</label>
                            <select
                                {...register('type')}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                            >
                                <option value="EXERCICE_MAISON">Exercice Maison (Non noté)</option>
                                <option value="DEVOIR_MAISON">Devoir Maison (Noté)</option>
                                <option value="DEVOIR_CLASSE">Devoir en Classe (Noté)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 mt-7">
                            <input
                                type="checkbox"
                                {...register('autoGrade')}
                                className="w-5 h-5 text-indigo-600 rounded border-slate-200 focus:ring-indigo-600"
                            />
                            <label className="text-sm font-medium text-slate-900">Correction & Notation Automatique</label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Date d'ouverture <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                {...register('startDate', { required: 'Date de début requise' })}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                            />
                            {errors.startDate && <span className="text-red-500 text-sm mt-1">{errors.startDate.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Date de fermeture <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                {...register('endDate', { required: 'Date de fin requise' })}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                            />
                            {errors.endDate && <span className="text-red-500 text-sm mt-1">{errors.endDate.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 mb-1">Durée (minutes)</label>
                            <input
                                type="number"
                                min="1"
                                {...register('timeLimit')}
                                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/50 outline-none bg-slate-50 text-slate-900"
                                placeholder="Ex: 30"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 space-y-4 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-900">Questions</h3>
                    </div>
                    
                    {error && (
                        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {questions.map((question, qIndex) => (
                            <QuestionField 
                                key={question.id || qIndex} 
                                qIndex={qIndex} 
                                control={control} 
                                register={register} 
                                watch={watch}
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
                        className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-indigo-600 rounded-xl text-slate-500 hover:text-indigo-600 transition flex items-center justify-center gap-2 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Ajouter une nouvelle question
                    </button>
                </div>
                <div className="p-6 flex justify-end gap-4 border-t border-slate-200">
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
    </div>
);
}
