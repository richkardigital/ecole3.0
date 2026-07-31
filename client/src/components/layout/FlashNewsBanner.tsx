import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { AlertTriangle, X, Info, Zap, Flame } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  content: string;
  priority: 'INFO' | 'NORMAL' | 'URGENT' | 'FLASH';
  createdAt: string;
}

const FlashNewsBanner = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchFlashNews = async () => {
      try {
        const res = await api.get('/news'); 
        // L'API backend filtre déjà par actif et par rôle.
        // On ne garde que les 'FLASH' ou 'URGENT' pour la bannière
        const bannerNews = res.data.filter((n: NewsItem) => 
            n.priority === 'FLASH' || n.priority === 'URGENT'
        );
        setNews(bannerNews);
      } catch (error) {
        console.error("Error fetching flash news", error);
      }
    };
    fetchFlashNews();
  }, []);

  if (!isVisible || news.length === 0) return null;

  const currentNews = news[currentIndex];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'FLASH': return 'bg-red-500 text-white';
      case 'URGENT': return 'bg-amber-500 text-white';
      case 'INFO': return 'bg-blue-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'FLASH': return <Flame className="w-5 h-5" />;
      case 'URGENT': return <AlertTriangle className="w-5 h-5" />;
      case 'INFO': return <Info className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const nextNews = () => {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  return (
    <div className={`w-full ${getPriorityStyle(currentNews.priority)} px-4 py-3 flex items-center justify-between shadow-md relative z-40 animate-fade-in-down`}>
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <div className="shrink-0 animate-pulse">
          {getPriorityIcon(currentNews.priority)}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
            <span className="font-bold uppercase tracking-wider text-sm shrink-0">
              {currentNews.priority === 'FLASH' ? 'Flash Info' : 'Important'}
            </span>
            <span className="hidden sm:block opacity-50 shrink-0">|</span>
            <span className="truncate text-sm font-medium">
              <strong className="mr-2">{currentNews.title}:</strong>
              {currentNews.content}
            </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        {news.length > 1 && (
            <div className="text-xs font-medium opacity-80 cursor-pointer hover:opacity-100 px-2 py-1 bg-white/10 rounded" onClick={nextNews}>
                {currentIndex + 1} / {news.length}
            </div>
        )}
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors focus:outline-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FlashNewsBanner;
