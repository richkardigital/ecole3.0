import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import api from '@/lib/api';

interface CreateQuizModalProps {
    courseId: string;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // For editing
}

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
    questions: Question[];
}

const CreateQuizModal = ({ courseId, onClose, onSuccess, initialData }: CreateQuizModalProps) => {
    const isEditing = !!initialData;
    const { register, control, handleSubmit, formState: { errors } } = useForm<QuizForm>({
        defaultValues: initialData || {
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

            if (isEditing) {
                await api.put(`/quizzes/${initialData.id}`, { ...data, courseId });
            } else {
                await api.post('/quizzes', { ...data, courseId });
            }
            onSuccess();
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.response?.data?.message || err.message || `Erreur lors de la ${isEditing ? 'modification' : 'création'} du QCM.`;
            const validationErrors = err.response?.data?.errors;
            
            if (validationErrors) {
                // Construct a more detailed error message from Zod errors
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold dark:text-white">{isEditing ? 'Modifier le QCM' : 'Créer un nouveau QCM'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre du QCM</label>
                            <input
                                {...register('title', { required: 'Titre requis' })}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="Ex: Évaluation Chapitre 1"
                            />
                            {errors.title && <span className="text-red-500 text-sm">{errors.title.message}</span>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optionnel)</label>
                            <textarea
                                {...register('description')}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                                placeholder="Instructions..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="font-bold text-gray-800 dark:text-white">Questions</h3>
                        
                        {questions.map((question, qIndex) => (
                            <QuestionField 
                                key={question.id} 
                                qIndex={qIndex} 
                                control={control} 
                                register={register} 
                                onRemove={() => removeQuestion(qIndex)}
                            />
                        ))}

                        <button
                            type="button"
                            onClick={() => appendQuestion({ 
                                text: '', 
                                type: 'SINGLE', 
                                points: 1, 
                                options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] 
                            })}
                            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter une question
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? (isEditing ? 'Modification...' : 'Création...') : (isEditing ? 'Modifier le QCM' : 'Créer le QCM')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Sub-component for individual question fields to handle nested array logic cleanly
const QuestionField = ({ qIndex, control, register, onRemove }: any) => {
    const { fields: options, append: appendOption, remove: removeOption } = useFieldArray({
        control,
        name: `questions.${qIndex}.options`
    });

    return (
        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 relative">
            <button
                type="button"
                onClick={onRemove}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                title="Supprimer la question"
            >
                <Trash2 className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="md:col-span-8">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Question {qIndex + 1}</label>
                    <input
                        {...register(`questions.${qIndex}.text`, { required: true })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        placeholder="Intitulé de la question"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select
                        {...register(`questions.${qIndex}.type`)}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    >
                        <option value="SINGLE">Choix unique</option>
                        <option value="MULTIPLE">Choix multiple</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Points</label>
                    <input
                        type="number"
                        min="1"
                        {...register(`questions.${qIndex}.points`, { valueAsNumber: true })}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                </div>
            </div>

            <div className="space-y-3 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                {options.map((option: any, oIndex: number) => (
                    <div key={option.id} className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            {...register(`questions.${qIndex}.options.${oIndex}.isCorrect`)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            title="Cocher si c'est une bonne réponse"
                        />
                        <input
                            {...register(`questions.${qIndex}.options.${oIndex}.text`, { required: true })}
                            className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            placeholder={`Réponse ${oIndex + 1}`}
                        />
                        <button
                            type="button"
                            onClick={() => removeOption(oIndex)}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            disabled={options.length <= 2}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={() => appendOption({ text: '', isCorrect: false })}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2 dark:text-blue-400"
                >
                    <Plus className="w-3 h-3" /> Ajouter une réponse
                </button>
            </div>
        </div>
    );
};

export default CreateQuizModal;
