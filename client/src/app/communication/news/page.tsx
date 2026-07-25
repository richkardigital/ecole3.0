import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Newspaper, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function News() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data } = await api.get('/news');
      setNewsList(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Actualités" 
        subtitle="Restez informé des annonces de l'établissement"
        icon={<Newspaper className="w-8 h-8" />}
        action={
            (user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR') ? (
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Nouvelle Annonce
                </Button>
            ) : null
        }
      />
      
      <div className="space-y-6">
        {newsList.length === 0 ? (
            <div className="text-center py-12 text-brand-text-muted bg-brand-card rounded-xl border border-brand-border/50">
                Aucune actualité disponible.
            </div>
        ) : newsList.map(news => (
          <div key={news.id} className="bg-brand-card border border-brand-border/50 rounded-xl p-6 hover:border-brand-accent/50 transition-all">
            <h3 className="font-bold text-xl text-brand-text mb-2">{news.title}</h3>
            <p className="text-xs text-brand-text-muted mb-4">
                Publié le {new Date(news.createdAt).toLocaleDateString()} par {news.author?.firstName} {news.author?.lastName}
            </p>
            <p className="text-brand-text whitespace-pre-line">{news.content}</p>
            {news.imageUrl && (
                <img src={news.imageUrl} alt={news.title} className="mt-4 rounded-lg max-h-64 object-cover" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
