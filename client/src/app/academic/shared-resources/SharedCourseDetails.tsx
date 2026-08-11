import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { ArrowLeft, BookOpen, Clock, FileText, Video, ExternalLink, Download, User, School } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

interface CourseModel {
  id: string;
  subject: { name: string };
  class?: { name: string; school?: { name: string } };
  teacher?: { firstName: string; lastName: string; avatarUrl?: string };
}

const SharedCourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseModel | null>(null);
  const [courseContent, setCourseContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true);
        // Fetch course details
        const resCourse = await api.get(`/courses/${id}`);
        setCourse(resCourse.data);

        // Fetch course chapters and resources
        const resContent = await api.get(`/courses/${id}/content`);
        setCourseContent(resContent.data);
      } catch (err: any) {
        console.error('Error fetching shared course details', err);
        setError("Erreur lors du chargement des détails du cours.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCourseData();
  }, [id]);

  const getIcon = (type: string) => {
    if (type === 'VIDEO' || type.toLowerCase().includes('video')) return <Video className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  if (loading) {
    return <div className="p-8 text-center text-brand-text-muted">Chargement du cours...</div>;
  }

  if (error || !course) {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center gap-4">
        <p>{error || "Cours introuvable."}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-brand-text hover:bg-brand-sidebar">
          Retour au réseau
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-brand-surface border border-brand-border rounded-full text-brand-text hover:bg-brand-sidebar transition-colors"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader 
          title="Détails du cours (Réseau SEEEC)"
          subtitle="Consultez le contenu de ce cours partagé sur le réseau"
        />
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden shadow-sm">
        {/* Course Header Banner */}
        <div className="h-48 relative overflow-hidden bg-brand-sidebar">
          <img 
            src={`https://source.unsplash.com/random/1200x400/?${encodeURIComponent(course.subject.name)}`}
            alt={course.subject.name}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-card via-brand-card/80 to-transparent"></div>
          
          <div className="absolute bottom-6 left-6 right-6 text-brand-text">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-brand-accent/20 text-brand-accent border border-brand-accent/30 backdrop-blur-md">
                {course.class?.name || 'N/A'}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-black/40 text-white backdrop-blur-md border border-white/10">
                <School className="w-3.5 h-3.5" />
                {course.class?.school?.name || 'École non spécifiée'}
              </span>
            </div>
            <h1 className="text-3xl font-bold drop-shadow-md text-white mb-2">{course.subject.name}</h1>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
          {/* Left Column: Chapters & Resources */}
          <div className="flex-1 space-y-6">
            <h2 className="text-xl font-bold text-brand-text flex items-center gap-2 mb-4 border-b border-brand-border/50 pb-2">
              <BookOpen className="w-6 h-6 text-brand-accent" />
              Chapitres & Contenu
            </h2>

            {courseContent?.chapters?.length > 0 ? (
              <div className="space-y-4">
                {courseContent.chapters.map((chapter: any, idx: number) => (
                  <div key={chapter.id} className="bg-brand-surface rounded-xl p-5 border border-brand-border shadow-sm">
                    <h3 className="font-bold text-lg text-brand-text mb-4 flex items-start gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center text-sm font-bold mt-0.5 border border-brand-accent/20">
                        {idx + 1}
                      </span>
                      <div>
                        {chapter.title}
                        {chapter.description && (
                          <p className="text-sm font-normal text-brand-text-muted mt-1">{chapter.description}</p>
                        )}
                      </div>
                    </h3>
                    
                    {chapter.resources?.length > 0 ? (
                      <ul className="space-y-3 pl-11">
                        {chapter.resources.map((res: any) => (
                          <li key={res.id} className="flex items-center justify-between p-3 rounded-lg bg-brand-sidebar border border-brand-border hover:border-brand-accent/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-brand-surface rounded-md border border-brand-border/50">
                                {getIcon(res.type)}
                              </div>
                              <div>
                                <span className="text-brand-text font-medium text-sm block">{res.title}</span>
                                <span className="text-xs text-brand-text-muted flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {new Date(res.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-accent hover:bg-brand-accent hover:text-white transition-colors flex items-center gap-1.5 bg-brand-accent/10 px-3 py-1.5 rounded-md border border-brand-accent/20"
                            >
                              {res.type === 'VIDEO' ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                              <span className="text-xs font-semibold">{res.type === 'VIDEO' ? 'Visionner' : 'Télécharger'}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-brand-text-muted italic pl-11">Aucun document partagé pour ce chapitre.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-brand-border rounded-xl bg-brand-surface">
                <BookOpen className="w-10 h-10 text-brand-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-brand-text-muted">Aucun chapitre n'a été publié pour ce cours.</p>
              </div>
            )}
          </div>

          {/* Right Column: Instructor Info */}
          <div className="w-full md:w-72 shrink-0">
            <div className="bg-brand-sidebar rounded-xl border border-brand-border p-5 sticky top-6">
              <h3 className="font-bold text-brand-text mb-4 text-sm uppercase tracking-wider text-brand-text-muted">Enseignant</h3>
              <div className="flex items-center gap-3 mb-4">
                {course.teacher?.avatarUrl ? (
                  <img src={getFileUrl(course.teacher.avatarUrl)} alt="Avatar" className="w-12 h-12 rounded-full border border-brand-border object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                    <User className="w-6 h-6 text-brand-accent" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-brand-text text-sm">
                    {course.teacher ? `${course.teacher.firstName} ${course.teacher.lastName}` : 'Non assigné'}
                  </p>
                  <p className="text-xs text-brand-text-muted">Professeur</p>
                </div>
              </div>
              <div className="pt-4 border-t border-brand-border/50">
                <p className="text-xs text-brand-text-muted mb-1">Matière</p>
                <p className="text-sm font-semibold text-brand-text">{course.subject?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedCourseDetails;
