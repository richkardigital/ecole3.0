import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getFileUrl } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Newspaper, Plus, Zap, AlertTriangle, Info, Calendar, User, School, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function News() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/news');
      setNewsList(data);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBroadcastRoute = () => {
    if (user?.role === 'SUPER_ADMIN') return '/admin/broadcast';
    if (user?.role === 'DIRECTEUR') return '/directeur/broadcast';
    if (user?.role === 'EDUCATEUR') return '/educateur/broadcast';
    return '/broadcast';
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'FLASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-red-400" />
            FLASH NEWS
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            URGENT
          </span>
        );
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Info className="w-3.5 h-3.5" />
            INFO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Nos Annonces" 
        subtitle="Consultez les informations officielles, annonces et événements de l'établissement."
        icon={<Newspaper className="w-7 h-7 text-brand-accent" />}
        action={
          (user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR') ? (
            <Button 
              variant="primary" 
              onClick={() => navigate(getBroadcastRoute())}
              className="flex items-center gap-2 shadow-lg shadow-brand-accent/20"
            >
              <Plus className="w-4 h-4" />
              Gérer / Diffuser une Annonce
            </Button>
          ) : null
        }
      />
      
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16 text-brand-muted bg-brand-card rounded-2xl border border-brand-border/50 animate-pulse">
            Chargement des actualités...
          </div>
        ) : newsList.length === 0 ? (
          <div className="text-center py-16 px-4 text-brand-muted bg-brand-card rounded-2xl border border-brand-border/50 space-y-3">
            <Newspaper className="w-12 h-12 mx-auto text-brand-border/60" />
            <p className="text-base font-semibold text-brand-text">Aucune actualité disponible</p>
            <p className="text-sm text-brand-muted max-w-md mx-auto">
              Toutes les nouvelles annonces et informations de la vie scolaire s'afficheront ici.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {newsList.map(news => (
              <div 
                key={news.id} 
                className="bg-brand-card border border-brand-border/60 rounded-2xl overflow-hidden hover:border-brand-accent/50 transition-all shadow-lg flex flex-col group"
              >
                {news.imageUrl && (
                  <div className="w-full h-52 overflow-hidden bg-slate-950 relative">
                    <img 
                      src={getFileUrl(news.imageUrl)} 
                      alt={news.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute top-3 left-3">
                      {renderPriorityBadge(news.priority)}
                    </div>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    {!news.imageUrl && (
                      <div className="mb-3">
                        {renderPriorityBadge(news.priority)}
                      </div>
                    )}
                    <h3 className="font-bold text-lg text-brand-text group-hover:text-brand-accent transition-colors leading-snug">
                      {news.title}
                    </h3>
                    <p className="text-sm text-brand-muted mt-3 whitespace-pre-line line-clamp-4 leading-relaxed">
                      {news.content}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-brand-border/40 flex items-center justify-between text-xs text-brand-muted">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent text-[10px] font-bold">
                        {news.author ? `${news.author.firstName[0]}${news.author.lastName[0]}` : 'EC'}
                      </div>
                      <span className="font-medium text-brand-text">
                        {news.author ? `${news.author.firstName} ${news.author.lastName}` : 'Administration'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(news.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
