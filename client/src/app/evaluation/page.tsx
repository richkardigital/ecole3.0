import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ClipboardList, FileText, CheckCircle, Clock, UserX, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

const EvaluationHub = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHubData = async () => {
      try {
        const [assignmentsRes, quizzesRes, absencesRes] = await Promise.all([
          api.get('/assignments').catch(() => ({ data: [] })),
          api.get('/quizzes').catch(() => ({ data: [] })),
          api.get('/absences').catch(() => ({ data: [] }))
        ]);
        
        const assignments = assignmentsRes.data || [];
        const quizzes = quizzesRes.data || [];
        const absences = absencesRes.data || [];
        
        setStats({
          totalAssignments: assignments.length,
          totalQuizzes: quizzes.length,
          totalAbsences: absences.length,
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

  const assignmentsPath = user?.role === 'SUPER_ADMIN' ? '/admin/assignments' 
    : user?.role === 'DIRECTEUR' ? '/directeur/assignments' 
    : user?.role === 'ENSEIGNANT' ? '/enseignant/assignments' 
    : '/assignments';

  const coursesPath = user?.role === 'SUPER_ADMIN' ? '/admin/courses' 
    : user?.role === 'DIRECTEUR' ? '/directeur/courses' 
    : user?.role === 'ENSEIGNANT' ? '/enseignant/courses' 
    : user?.role === 'EDUCATEUR' ? '/educateur/courses' 
    : '/courses';

  const reportCardsPath = user?.role === 'SUPER_ADMIN' ? '/admin/report-cards' 
    : user?.role === 'DIRECTEUR' ? '/directeur/report-cards' 
    : user?.role === 'ENSEIGNANT' ? '/enseignant/report-cards' 
    : user?.role === 'EDUCATEUR' ? '/educateur/report-cards' 
    : user?.role === 'PARENT' ? '/parent/dashboard'
    : '/report-cards';

  const absencesPath = user?.role === 'SUPER_ADMIN' ? '/admin/absences' 
    : user?.role === 'DIRECTEUR' ? '/directeur/absences' 
    : user?.role === 'EDUCATEUR' ? '/educateur/absences' 
    : user?.role === 'ENSEIGNANT' ? '/enseignant/absences' 
    : '/absences';

  const conductPath = user?.role === 'SUPER_ADMIN' ? '/admin/conduct' 
    : user?.role === 'DIRECTEUR' ? '/directeur/conduct' 
    : user?.role === 'EDUCATEUR' ? '/educateur/conduct' 
    : '/conduct';

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Hub Central des Évaluations & Vie Scolaire" 
        subtitle="Devoirs, Quiz en ligne, Registre des Absences, Calcul automatique de la Conduite et Bulletins Scolaires."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard 
          title="Devoirs & Examens"
          label="Total Devoirs" 
          count={stats?.totalAssignments || 0} 
          icon={<FileText className="w-6 h-6 text-brand-accent" />} 
          badgeColor="bg-brand-accent/10 border-brand-accent/20"
        />
        <StatCard 
          title="Quiz & QCM"
          label="Total QCM" 
          count={stats?.totalQuizzes || 0} 
          icon={<CheckCircle className="w-6 h-6 text-green-500" />} 
          badgeColor="bg-green-50 border-green-200"
        />
        <StatCard 
          title="Évaluations en cours"
          label="En attente" 
          count={stats?.pending || 0} 
          icon={<Clock className="w-6 h-6 text-orange-500" />} 
          badgeColor="bg-orange-50 border-orange-200"
        />
        <StatCard 
          title="Registre Absences"
          label="Absences déclarées" 
          count={stats?.totalAbsences || 0} 
          icon={<UserX className="w-6 h-6 text-purple-500" />} 
          badgeColor="bg-purple-50 border-purple-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Section Devoirs */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between hover:border-brand-accent/40 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-brand-accent/10 text-brand-accent">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Devoirs & Évaluations</h2>
                <span className="text-xs text-brand-text-muted">40% Contrôle Continu / Devoirs</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm mb-6">Consultez, programmez et notez les devoirs à la maison, interrogations et contrôles continus.</p>
          </div>
          <Link to={assignmentsPath}>
            <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-brand-accent hover:text-brand-accent transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
              <span>Accéder aux devoirs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Section Quiz */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between hover:border-green-500/40 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Quiz & QCM Intelligents</h2>
                <span className="text-xs text-brand-text-muted">Auto-correction instantanée</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm mb-6">Évaluations interactives avec calcul automatique des points et intégration directe au carnet de notes.</p>
          </div>
          <Link to={coursesPath}>
            <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-green-500 hover:text-green-500 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
              <span>Voir les cours & Quiz</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Section Absences & Assiduité */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Gestion des Absences</h2>
                <span className="text-xs text-brand-text-muted">Saisie par cours & heures</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm mb-6">Enregistrez les absences par matière, date et justification pour alimenter automatiquement la note de conduite.</p>
          </div>
          <Link to={absencesPath}>
            <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-purple-500 hover:text-purple-500 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
              <span>Gérer les absences</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Section Conduite & Discipline */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-all">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Conduite & Discipline</h2>
                <span className="text-xs text-brand-text-muted">Base 20/20 • Coef 1 au bulletin</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm mb-6">Calcul automatique de la note de conduite depuis les absences avec appréciation et synchronisation bulletin.</p>
          </div>
          <Link to={conductPath}>
            <button className="w-full bg-brand-sidebar border border-brand-border text-brand-text font-medium py-3 rounded-xl hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
              <span>Grille de conduite</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        {/* Section Bulletins Trimestriels */}
        <div className="bg-brand-card rounded-2xl border border-brand-border p-6 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all md:col-span-2">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Bulletins Scolaires & Certification</h2>
                <span className="text-xs text-brand-text-muted">Workflow multi-signatures (Directeur & SEEEC)</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm mb-6">Génération automatisée des moyennes, intégration de la note de conduite coef 1, validation par les éducateurs et directeurs, et consultation certifiée pour les parents.</p>
          </div>
          <Link to={reportCardsPath}>
            <button className="w-full bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-sm">
              <span>Accéder aux Bulletins Scolaires</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EvaluationHub;
