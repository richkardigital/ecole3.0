import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Users, GraduationCap, Calendar, BookOpen, AlertCircle, FileText } from 'lucide-react';

interface ChildProgress {
  id: string;
  firstName: string;
  lastName: string;
  class: string;
  niveau: string;
  school: string;
  progress: {
    overallAverage: number | null;
    totalAbsences: number;
    completedAssignments: number;
    pendingAssignments: number;
    recentGrades: any[];
    bulletin: any;
  };
}

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/parents/children');
      const childrenData = res.data;

      // Fetch progress for each child
      const childrenWithProgress = await Promise.all(
        childrenData.map(async (child: any) => {
          try {
            const progRes = await api.get(`/parents/children/${child.id}/progress`);
            return {
              ...child,
              class: child.enrollments?.[0]?.class?.name || 'Non assigné',
              niveau: child.enrollments?.[0]?.class?.niveau?.nom || 'N/A',
              school: child.school?.name || 'N/A',
              progress: progRes.data
            };
          } catch (err) {
            console.error(`Erreur chargement progression pour ${child.firstName}`, err);
            return {
              ...child,
              class: child.enrollments?.[0]?.class?.name || 'Non assigné',
              niveau: 'N/A',
              school: 'N/A',
              progress: null
            };
          }
        })
      );

      setChildren(childrenWithProgress);
    } catch (err: any) {
      setError(err.response?.data?.message || "Impossible de charger la liste de vos enfants.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-brand-text">Chargement de votre espace...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 md:p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <PageHeader 
        title={`Bienvenue, ${user?.firstName}`}
        description="Suivez la scolarité de vos enfants et leur progression."
        icon={<Users className="w-8 h-8 text-brand-accent" />}
      />

      {children.length === 0 ? (
        <div className="bg-brand-card p-8 rounded-xl border border-brand-border/50 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-brand-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-bold text-brand-text mb-2">Aucun enfant lié à votre compte</h3>
          <p className="text-brand-text-muted">
            Veuillez contacter l'administration de l'école pour lier vos enfants à votre compte parent.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {children.map((child) => (
            <div key={child.id} className="bg-brand-card rounded-2xl border border-brand-border/50 shadow-sm overflow-hidden">
              <div className="bg-brand-sidebar p-6 border-b border-brand-border/50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-brand-text flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-brand-accent" />
                    {child.firstName} {child.lastName}
                  </h2>
                  <p className="text-brand-text-muted mt-1">
                    Classe : <span className="font-semibold text-brand-text">{child.class}</span> • 
                    École : {child.school}
                  </p>
                </div>
              </div>

              {child.progress ? (
                <div className="p-6 space-y-8">
                  {/* Stats globales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                      <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Moyenne Générale</p>
                      <p className={`text-2xl font-black ${child.progress.overallAverage && child.progress.overallAverage >= 10 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {child.progress.overallAverage ? `${child.progress.overallAverage}/20` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                      <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Absences</p>
                      <p className="text-2xl font-black text-orange-500">{child.progress.totalAbsences}</p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                      <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Devoirs en attente</p>
                      <p className="text-2xl font-black text-brand-accent">{child.progress.pendingAssignments}</p>
                    </div>
                    <div className="bg-brand-sidebar p-4 rounded-xl border border-brand-border/50 text-center">
                      <p className="text-xs font-bold text-brand-text-muted uppercase mb-1">Devoirs rendus</p>
                      <p className="text-2xl font-black text-brand-text">{child.progress.completedAssignments}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Dernières Notes */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                        <FileText className="w-5 h-5 text-brand-accent" />
                        Dernières Notes
                      </h3>
                      {child.progress.recentGrades?.length === 0 ? (
                        <p className="text-brand-text-muted italic">Aucune note enregistrée récemment.</p>
                      ) : (
                        <div className="bg-brand-sidebar rounded-xl border border-brand-border/50 overflow-hidden divide-y divide-brand-border/50">
                          {child.progress.recentGrades?.map((grade: any) => (
                            <div key={grade.id} className="p-4 flex justify-between items-center">
                              <div>
                                <p className="font-medium text-brand-text">{grade.assignment?.title || grade.course?.subject?.name || 'Évaluation'}</p>
                                <p className="text-xs text-brand-text-muted">{new Date(grade.createdAt).toLocaleDateString('fr-FR')}</p>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold text-lg ${grade.value >= 10 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {grade.value}/20
                                </span>
                                <p className="text-xs text-brand-text-muted">Coef. {grade.coefficient}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Résumé du Bulletin */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-brand-accent" />
                        Résumé du Bulletin Actuel
                      </h3>
                      {child.progress.bulletin ? (
                        <div className="bg-brand-sidebar rounded-xl border border-brand-border/50 p-6 space-y-4">
                          <div className="flex justify-between items-center border-b border-brand-border/50 pb-4">
                            <span className="text-brand-text-muted font-medium">Statut</span>
                            <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full text-xs font-bold uppercase">
                              {child.progress.bulletin.statut}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-brand-border/50 pb-4">
                            <span className="text-brand-text-muted font-medium">Appréciation Générale</span>
                            <span className="font-medium text-brand-text">
                              {child.progress.bulletin.appreciationGenerale || '-'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-brand-border/50 pb-4">
                            <span className="text-brand-text-muted font-medium">Absences Justifiées</span>
                            <span className="font-medium text-brand-text">
                              {child.progress.bulletin.absencesJustifiees} / {child.progress.bulletin.totalAbsences}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-brand-text-muted font-medium">Note de Conduite</span>
                            <span className="font-medium text-brand-text">
                              {child.progress.bulletin.noteConduite !== null ? `${child.progress.bulletin.noteConduite}/20` : '-'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-brand-sidebar rounded-xl border border-brand-border/50 p-6 text-center text-brand-text-muted">
                          Aucun bulletin disponible pour le trimestre en cours.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-red-500">
                  Données indisponibles pour cet enfant.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
