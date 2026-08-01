import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MessageSquare, Plus, Search, Trash2, Paperclip, FileText, ImageIcon, Send, ArrowLeft, MoreVertical, X } from 'lucide-react';
import api, { getFileUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
}

interface ForumComment {
  id: string;
  content: string;
  createdAt: string;
  author: User;
}

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  author: User;
  comments: ForumComment[];
}

const CATEGORIES = [
  { id: 'GENERAL', label: 'Général', color: 'bg-blue-500' },
  { id: 'PEDAGOGIE', label: 'Pédagogie', color: 'bg-emerald-500' },
  { id: 'ADMINISTRATION', label: 'Administration', color: 'bg-purple-500' },
  { id: 'ETUDIANTS', label: 'Vie Étudiante', color: 'bg-amber-500' },
];

const Forum = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  
  // Create Post
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comment
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/forum');
      setPosts(res.data);
    } catch (err) {
      toastError("Erreur lors du chargement du forum");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const refreshPost = async (postId: string) => {
    try {
      const res = await api.get(`/forum/${postId}`);
      setSelectedPost(res.data);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch (err) {
      console.error(err);
    }
  };

  const onSubmitPost = async (data: any) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('category', data.category);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      
      const res = await api.post('/forum', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      success("Discussion créée avec succès");
      setPosts([res.data, ...posts]);
      setIsCreateModalOpen(false);
      reset();
      setSelectedFile(null);
    } catch (err) {
      toastError("Erreur lors de la création de la discussion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;
    
    setIsSubmittingComment(true);
    try {
      await api.post(`/forum/${selectedPost.id}/comments`, { content: commentText });
      setCommentText('');
      await refreshPost(selectedPost.id);
    } catch (err) {
      toastError("Erreur lors de l'envoi du commentaire");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deletePost = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer cette discussion ?")) return;
    try {
      await api.delete(`/forum/${id}`);
      setPosts(posts.filter(p => p.id !== id));
      if (selectedPost?.id === id) setSelectedPost(null);
      success("Discussion supprimée");
    } catch (err) {
      toastError("Erreur lors de la suppression");
    }
  };
  
  const deleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    try {
      await api.delete(`/forum/comments/${commentId}`);
      if (selectedPost) await refreshPost(selectedPost.id);
      success("Commentaire supprimé");
    } catch (err) {
      toastError("Erreur lors de la suppression");
    }
  };

  const filteredPosts = posts.filter(p => 
    (activeCategory === 'ALL' || p.category === activeCategory) &&
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getInitials = (fName: string, lName: string) => `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase();

  const renderFilePreview = (url: string, type: string) => {
    if (!url) return null;
    const isImage = type?.includes('image');
    return (
      <a href={getFileUrl(url)} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors w-fit group">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
          {isImage ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <FileText className="w-5 h-5 text-red-500" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700 group-hover:text-brand-accent transition-colors">Pièce jointe</p>
          <p className="text-xs text-slate-500">Cliquez pour ouvrir</p>
        </div>
      </a>
    );
  };

  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <button 
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Retour aux discussions
        </button>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-sidebar border-2 border-slate-100 flex items-center justify-center font-bold text-brand-accent text-lg shrink-0 overflow-hidden">
                {selectedPost.author.avatarUrl ? (
                   <img src={selectedPost.author.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                   getInitials(selectedPost.author.firstName, selectedPost.author.lastName)
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{selectedPost.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Par <span className="font-semibold text-slate-700">{selectedPost.author.firstName} {selectedPost.author.lastName}</span> • {new Date(selectedPost.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
            {CATEGORIES.find(c => c.id === selectedPost.category) && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${CATEGORIES.find(c => c.id === selectedPost.category)?.color}`}>
                {CATEGORIES.find(c => c.id === selectedPost.category)?.label}
              </span>
            )}
          </div>
          <div className="mt-6 text-slate-700 whitespace-pre-wrap leading-relaxed">
            {selectedPost.content}
          </div>
          {selectedPost.fileUrl && renderFilePreview(selectedPost.fileUrl, selectedPost.fileType || '')}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-accent" />
            Réponses ({selectedPost.comments.length})
          </h3>
          
          <div className="space-y-6 mb-8">
            {selectedPost.comments.map(comment => (
              <div key={comment.id} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm shrink-0 overflow-hidden">
                    {comment.author.avatarUrl ? (
                        <img src={comment.author.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        getInitials(comment.author.firstName, comment.author.lastName)
                    )}
                </div>
                <div className="flex-1 bg-slate-50 rounded-2xl p-4 border border-slate-100 relative">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-slate-800">{comment.author.firstName} {comment.author.lastName}</span>
                    <span className="text-xs text-slate-400 font-medium">{new Date(comment.createdAt).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                  
                  {(user?.role === 'SUPER_ADMIN' || user?.id === comment.author.id) && (
                    <button 
                      onClick={() => deleteComment(comment.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {selectedPost.comments.length === 0 && (
              <p className="text-center text-slate-400 py-4 text-sm font-medium">Aucun commentaire pour l'instant. Soyez le premier !</p>
            )}
          </div>

          <form onSubmit={onSubmitComment} className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-brand-sidebar flex items-center justify-center font-bold text-brand-accent text-sm shrink-0 overflow-hidden">
                 {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                        getInitials(user?.firstName || '', user?.lastName || '')
                  )}
            </div>
            <div className="flex-1 relative">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Écrivez votre réponse..."
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none min-h-[100px]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !commentText.trim()}
                className="absolute bottom-3 right-3 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-sm"
              >
                <Send className="w-4 h-4" /> Envoyer
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Forum de Discussion"
        description="Échangez avec la communauté scolaire."
      >
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Nouvelle Discussion
        </Button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans le forum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Tous
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === cat.id ? `${cat.color} text-white` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-medium">Chargement des discussions...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3">
            <MessageSquare className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 font-medium">Aucune discussion trouvée.</p>
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(true)}>Lancer une discussion</Button>
          </div>
        ) : (
          filteredPosts.map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-accent/30 transition-all cursor-pointer group flex items-start gap-4 relative"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-lg shrink-0 overflow-hidden">
                {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    getInitials(post.author.firstName, post.author.lastName)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-brand-accent transition-colors">{post.title}</h3>
                  {CATEGORIES.find(c => c.id === post.category) && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase tracking-wider shrink-0 ${CATEGORIES.find(c => c.id === post.category)?.color}`}>
                      {CATEGORIES.find(c => c.id === post.category)?.label}
                    </span>
                  )}
                  {post.fileUrl && <Paperclip className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{post.content}</p>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> {post.comments.length} réponses</span>
                  <span>•</span>
                  <span>Par <strong className="text-slate-600">{post.author.firstName} {post.author.lastName}</strong></span>
                  <span>•</span>
                  <span>{new Date(post.createdAt).toLocaleDateString('fr-FR')} à {new Date(post.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit'})}</span>
                </div>
              </div>
              {(user?.role === 'SUPER_ADMIN' || user?.id === post.author.id) && (
                <button 
                  onClick={(e) => deletePost(post.id, e)}
                  className="absolute top-5 right-5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setIsCreateModalOpen(false)}></div>
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl relative z-10 animate-fade-in-down border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Nouvelle Discussion</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmitPost)} className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Titre de la discussion</label>
                <input 
                  {...register('title', { required: true })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                  placeholder="Ex: Question sur le TP de Mathématiques..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Catégorie</label>
                <select 
                  {...register('category', { required: true })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all appearance-none"
                >
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Message</label>
                <textarea 
                  {...register('content', { required: true })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all min-h-[120px] resize-none"
                  placeholder="Détaillez votre message..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Pièce jointe (Optionnel)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold cursor-pointer transition-colors border border-slate-200">
                    <Paperclip className="w-4 h-4" />
                    <span>Choisir un fichier</span>
                    <input type="file" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                  </label>
                  {selectedFile && <span className="text-sm font-medium text-brand-accent truncate max-w-[200px]">{selectedFile.name}</span>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>Annuler</Button>
                <Button variant="primary" type="submit" isLoading={isSubmitting}>Publier</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forum;
