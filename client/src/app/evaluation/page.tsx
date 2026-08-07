import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ClipboardList, FileText, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

const EvaluationHub = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHubData = async () => {
            try {
                // Here we can fetch stats related to evaluation
                // For now we mock or fetch from existing dashboard if applicable
                // Since this is a new hub, we can fetch assignments and quizzes to aggregate stats
                const [assignmentsRes, quizzesRes] = await Promise.all([
                    api.get('/assignments'),
                    api.get('/quizzes') // Assuming this endpoint exists, otherwise we mock for UI completeness
                ]);
                
                const assignments = assignmentsRes.data || [];
                const quizzes = quizzesRes.data || [];
                
                setStats({
                    totalAssignments: assignments.length,
                    totalQuizzes: quizzes.length,
                    pending: assignments.filter((a: any) => new Date(a.dueDate) > new Date()).length
                });
            } catch (error) {
                console.error("Error fetching evaluation stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHubData();
    }, [user]);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Hub des Évaluations" 
                subtitle="Gérez tous vos devoirs, QCM et examens depuis cet espace centralisé."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Devoirs"
                    label="Total Devoirs" 
                    count={stats?.totalAssignments || 0} 
                    icon={<FileText className="w-6 h-6 text-brand-accent" />} 
                    badgeColor="bg-brand-accent/10 border-brand-accent/20"
                />
                <StatCard 
                    title="Total QCM"
                    label="Total QCM" 
                    count={stats?.totalQuizzes || 0} 
                    icon={<CheckCircle className="w-6 h-6 text-green-500" />} 
                    badgeColor="bg-green-50 border-green-200"
                />
                <StatCard 
                    title="En attente"
                    label="En attente" 
                    count={stats?.pending || 0} 
                    icon={<Clock className="w-6 h-6 text-orange-500" />} 
                    badgeColor="bg-orange-50 border-orange-200"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Section Devoirs */}
                <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-brand-accent/10">
                                <FileText className="w-6 h-6 text-brand-accent" />
                            </div>
                            <h2 className="text-lg font-bold text-brand-text">Devoirs & Examens</h2>
                        </div>
                        <Link to="/assignments" className="text-sm font-medium text-brand-accent hover:underline">Voir tout</Link>
                    </div>
                    <p className="text-brand-text-muted text-sm mb-6">Consultez, créez ou corrigez les devoirs classiques et les examens de niveau.</p>
                    <Link to="/assignments">
                        <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-brand-accent hover:text-brand-accent transition-all shadow-sm">
                            Accéder aux devoirs
                        </button>
                    </Link>
                </div>

                {/* Section Quiz */}
                <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-green-500/10">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <h2 className="text-lg font-bold text-brand-text">Quiz & QCM</h2>
                        </div>
                        {/* Remarque: Le lien existant pour les quiz dépend souvent du cours. S'il y a un global on l'utilise. */}
                        <Link to="/courses" className="text-sm font-medium text-green-500 hover:underline">Via les cours</Link>
                    </div>
                    <p className="text-brand-text-muted text-sm mb-6">Créez des QCM interactifs (choix multiples, textes à trous) avec correction automatique.</p>
                    <Link to="/courses">
                        <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-green-500 hover:text-green-500 transition-all shadow-sm">
                            Voir les cours (pour QCM)
                        </button>
                    </Link>
                </div>
            </div>
            
            {/* Notes Section for Teachers/Admin */}
            {user?.role !== 'APPRENANT' && (
                 <div className="mt-6 bg-brand-sidebar p-6 rounded-2xl border border-brand-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <ClipboardList className="w-6 h-6 text-purple-500" />
                        <h2 className="text-lg font-bold text-brand-text">Validation & Bulletins</h2>
                    </div>
                    <p className="text-brand-text-muted text-sm mb-4">
                        Toutes les notes issues des devoirs et des quiz auto-corrigés sont centralisées pour la génération des bulletins.
                    </p>
                    <Link to="/report-cards">
                        <button className="px-6 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors shadow-sm">
                            Gérer les bulletins
                        </button>
                    </Link>
                 </div>
            )}
        </div>
    );
};

export default EvaluationHub;
