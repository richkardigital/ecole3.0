import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSocket } from '@/context/SocketContext';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Paperclip, 
  FileText, 
  ImageIcon, 
  Send, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  UserCheck
} from 'lucide-react';
import api, { getFileUrl } from '@/lib/api';

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
  updatedAt?: string;
  author: User;
  comments?: ForumComment[];
  _count?: {
    comments: number;
  };
}

const CATEGORIES = [
  { id: 'GENERAL', label: 'Général', color: 'bg-blue-600', lightColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'PEDAGOGIE', label: 'Pédagogie & Cours', color: 'bg-emerald-600', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'ADMINISTRATION', label: 'Administration', color: 'bg-purple-600', lightColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'ETUDIANTS', label: 'Vie Scolaire & Entraide', color: 'bg-amber-600', lightColor: 'bg-amber-50 text-amber-700 border-amber-200' },
];

type ViewMode = 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS';

const Forum = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { socket } = useSocket();
  
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  
  // Active/selected post
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  
  // Create / Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('GENERAL');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileType, setExistingFileType] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Check admin rights
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR';

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

  // Socket real-time updates for Forum
  useEffect(() => {
    if (!socket) return;

    const handlePostCreated = (newPost: ForumPost) => {
      setPosts(prev => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostUpdated = (updatedPost: ForumPost) => {
      setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
      setSelectedPost(curr => (curr && curr.id === updatedPost.id ? { ...curr, ...updatedPost } : curr));
    };

    const handlePostDeleted = (deletedId: string) => {
      setPosts(prev => prev.filter(p => p.id !== deletedId));
      setSelectedPost(curr => (curr && curr.id === deletedId ? null : curr));
      if (selectedPost?.id === deletedId) {
        setViewMode('LIST');
      }
    };

    const handleCommentCreated = (newComment: ForumComment & { postId: string }) => {
      setSelectedPost(curr => {
        if (!curr) return null;
        const exists = curr.comments?.some(c => c.id === newComment.id);
        if (exists) return curr;
        const newComments = [...(curr.comments || []), newComment];
        return {
          ...curr,
          comments: newComments,
          _count: { comments: newComments.length }
        };
      });

      setPosts(prev => prev.map(p => {
        return p.id === (newComment as any).postId ? {
          ...p,
          _count: { comments: (p._count?.comments || 0) + 1 }
        } : p;
      }));
    };

    const handleCommentDeleted = (data: { id: string; postId: string }) => {
      setSelectedPost(curr => {
        if (!curr || curr.id !== data.postId) return curr;
        const newComments = (curr.comments || []).filter(c => c.id !== data.id);
        return {
          ...curr,
          comments: newComments,
          _count: { comments: newComments.length }
        };
      });

      setPosts(prev => prev.map(p => {
        return p.id === data.postId ? {
          ...p,
          _count: { comments: Math.max(0, (p._count?.comments || 1) - 1) }
        } : p;
      }));
    };

    socket.on('forum:post_created', handlePostCreated);
    socket.on('forum:post_updated', handlePostUpdated);
    socket.on('forum:post_deleted', handlePostDeleted);
    socket.on('forum:comment_created', handleCommentCreated);
    socket.on('forum:comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('forum:post_created', handlePostCreated);
      socket.off('forum:post_updated', handlePostUpdated);
      socket.off('forum:post_deleted', handlePostDeleted);
      socket.off('forum:comment_created', handleCommentCreated);
      socket.off('forum:comment_deleted', handleCommentDeleted);
    };
  }, [socket, selectedPost]);

  const refreshPost = async (postId: string) => {
    try {
      const res = await api.get(`/forum/${postId}`);
      setSelectedPost(res.data);
      setPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch (err) {
      console.error("Error refreshing post:", err);
    }
  };

  const handleSelectPost = async (post: ForumPost) => {
    setSelectedPost(post);
    setViewMode('DETAILS');
    await refreshPost(post.id);
  };

  const handleOpenCreatePage = () => {
    setFormTitle('');
    setFormContent('');
    setFormCategory('GENERAL');
    setFormFile(null);
    setExistingFileUrl(null);
    setExistingFileType(null);
    setRemoveExistingFile(false);
    setViewMode('CREATE');
  };

  const handleOpenEditPage = (post: ForumPost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedPost(post);
    setFormTitle(post.title);
    setFormContent(post.content);
    setFormCategory(post.category || 'GENERAL');
    setFormFile(null);
    setExistingFileUrl(post.fileUrl || null);
    setExistingFileType(post.fileType || null);
    setRemoveExistingFile(false);
    setViewMode('EDIT');
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toastError("Veuillez renseigner le titre et le contenu de la discussion");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', formTitle.trim());
      formData.append('content', formContent.trim());
      formData.append('category', formCategory);

      if (formFile) {
        formData.append('file', formFile);
      }
      if (removeExistingFile) {
        formData.append('removeAttachment', 'true');
      }

      if (viewMode === 'CREATE') {
        const res = await api.post('/forum', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        success("Discussion publiée avec succès !");
        setPosts(prev => [res.data, ...prev.filter(p => p.id !== res.data.id)]);
        setSelectedPost(res.data);
        setViewMode('DETAILS');
      } else if (viewMode === 'EDIT' && selectedPost) {
        const res = await api.put(`/forum/${selectedPost.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        success("Discussion modifiée avec succès !");
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? res.data : p));
        setSelectedPost(res.data);
        setViewMode('DETAILS');
      }
    } catch (err) {
      toastError(viewMode === 'CREATE' ? "Erreur lors de la création de la discussion" : "Erreur lors de la modification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedPost) return;
    
    const textToSend = commentText.trim();
    setIsSubmittingComment(true);
    
    // Optimistic comment
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: ForumComment = {
      id: tempId,
      content: textToSend,
      createdAt: new Date().toISOString(),
      author: {
        id: user?.id || '',
        firstName: user?.firstName || 'Moi',
        lastName: user?.lastName || '',
        role: user?.role || 'APPRENANT',
        avatarUrl: user?.avatarUrl
      }
    };

    setSelectedPost(curr => {
      if (!curr) return null;
      const updatedComments = [...(curr.comments || []), optimisticComment];
      return {
        ...curr,
        comments: updatedComments,
        _count: { comments: updatedComments.length }
      };
    });

    setCommentText('');

    try {
      const res = await api.post(`/forum/${selectedPost.id}/comments`, { content: textToSend });
      
      // Replace optimistic comment with confirmed response
      setSelectedPost(curr => {
        if (!curr) return null;
        const finalComments = (curr.comments || []).map(c => c.id === tempId ? res.data : c);
        return {
          ...curr,
          comments: finalComments,
          _count: { comments: finalComments.length }
        };
      });

      // Scroll smoothly to bottom of comments
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      success("Réponse publiée");
    } catch (err) {
      toastError("Erreur lors de l'envoi du commentaire");
      // Rollback optimistic comment on error
      setSelectedPost(curr => {
        if (!curr) return null;
        const rolledBack = (curr.comments || []).filter(c => c.id !== tempId);
        return {
          ...curr,
          comments: rolledBack,
          _count: { comments: rolledBack.length }
        };
      });
      setCommentText(textToSend);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deletePost = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Voulez-vous vraiment supprimer cette discussion ainsi que toutes ses réponses ?")) return;
    try {
      await api.delete(`/forum/${id}`);
      setPosts(prev => prev.filter(p => p.id !== id));
      if (selectedPost?.id === id) {
        setSelectedPost(null);
        setViewMode('LIST');
      }
      success("Discussion supprimée");
    } catch (err) {
      toastError("Erreur lors de la suppression");
    }
  };
  
  const deleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    try {
      await api.delete(`/forum/comments/${commentId}`);
      setSelectedPost(curr => {
        if (!curr) return null;
        const filtered = (curr.comments || []).filter(c => c.id !== commentId);
        return {
          ...curr,
          comments: filtered,
          _count: { comments: filtered.length }
        };
      });
      success("Commentaire supprimé");
    } catch (err) {
      toastError("Erreur lors de la suppression");
    }
  };

  const getInitials = (fName: string, lName: string) => `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { label: 'Super Admin', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck };
      case 'DIRECTEUR':
        return { label: 'Directeur', className: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: UserCheck };
      case 'EDUCATEUR':
        return { label: 'Éducateur', className: 'bg-amber-100 text-amber-800 border-amber-200', icon: GraduationCap };
      case 'ENSEIGNANT':
        return { label: 'Professeur', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: BookOpen };
      case 'APPRENANT':
      default:
        return { label: 'Élève', className: 'bg-sky-100 text-sky-800 border-sky-200', icon: GraduationCap };
    }
  };

  const renderFilePreview = (url: string, type: string) => {
    if (!url) return null;
    const isImage = type?.includes('image');
    return (
      <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50/80 max-w-lg">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-brand-accent" /> Pièce jointe partagée
        </p>
        {isImage ? (
          <div className="space-y-2">
            <a href={getFileUrl(url)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-slate-200 max-h-80 hover:opacity-95 transition-opacity">
              <img src={getFileUrl(url)} alt="Pièce jointe" className="w-full h-auto object-cover" />
            </a>
            <div className="flex justify-end">
              <a href={getFileUrl(url)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1">
                Agrandir l'image <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <a href={getFileUrl(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors group">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 group-hover:text-brand-accent transition-colors truncate">Document / Fichier joint</p>
              <p className="text-xs text-slate-400">Cliquez pour consulter ou télécharger</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand-accent transition-colors" />
          </a>
        )}
      </div>
    );
  };

  const filteredPosts = posts.filter(p => 
    (activeCategory === 'ALL' || p.category === activeCategory) &&
    (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 1 : CRÉATION OU MODIFICATION PLEINE PAGE
  // ═══════════════════════════════════════════════════════════════════════
  if (viewMode === 'CREATE' || viewMode === 'EDIT') {
    const isEdit = viewMode === 'EDIT';
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setViewMode(selectedPost && isEdit ? 'DETAILS' : 'LIST')}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-accent transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {isEdit ? 'Annuler et revenir à la discussion' : 'Retour aux discussions'}
          </button>
          <span className="text-xs font-semibold px-3 py-1 bg-brand-accent/10 text-brand-accent rounded-full border border-brand-accent/20">
            {isEdit ? 'Mode Édition' : 'Nouvelle Rédaction'}
          </span>
        </div>

        {/* Full workspace card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-brand-accent" />
              {isEdit ? 'Modifier la discussion' : 'Créer une nouvelle discussion'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isEdit 
                ? 'Mettez à jour le titre, le message ou la pièce jointe de votre discussion.'
                : 'Partagez une idée, posez une question ou lancez un sujet avec la communauté scolaire.'}
            </p>
          </div>

          <form onSubmit={handleSavePost} className="space-y-6">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                Catégorie du sujet <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map(cat => {
                  const isSelected = formCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormCategory(cat.id)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col justify-between gap-2 ${
                        isSelected 
                          ? `${cat.lightColor} ring-2 ring-brand-accent/30 shadow-sm font-black` 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      <span className="truncate">{cat.label}</span>
                      <div className="flex items-center justify-between">
                        <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`}></span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-accent" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Titre de la discussion <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex: Devoir de Mathématiques - Chapitre 4 : Fonctions..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Message / Contenu de la discussion <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Exprimez clairement votre question ou le sujet à débattre. Vous pouvez y ajouter des détails méthodologiques..."
                rows={10}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-y placeholder:text-slate-400"
                required
              />
              <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                <span>Soignez la clarté et le respect des règles de bienséance.</span>
                <span>{formContent.length} caractères</span>
              </div>
            </div>

            {/* Attachment Section */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-sm font-bold text-slate-800">
                Pièce jointe (Image, Schéma, Document PDF...)
              </label>
              
              {/* Existing file display in Edit Mode */}
              {isEdit && existingFileUrl && !removeExistingFile && !formFile && (
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-brand-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Fichier actuellement attaché</p>
                      <a href={getFileUrl(existingFileUrl)} target="_blank" rel="noopener noreferrer" className="text-[11px] text-brand-accent hover:underline">
                        Visualiser le fichier
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingFile(true)}
                    className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              )}

              {/* Upload input */}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold cursor-pointer transition-colors border border-slate-200 shadow-sm">
                  <Paperclip className="w-4 h-4 text-brand-accent" />
                  <span>{formFile || existingFileUrl ? 'Changer de fichier' : 'Sélectionner un fichier'}</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setFormFile(e.target.files[0]);
                        setRemoveExistingFile(false);
                      }
                    }} 
                  />
                </label>

                {formFile && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-xl text-xs font-semibold">
                    <span className="truncate max-w-[250px]">{formFile.name}</span>
                    <button type="button" onClick={() => setFormFile(null)} className="hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {removeExistingFile && (
                  <span className="text-xs text-amber-600 font-semibold">Le fichier existant sera retiré à la sauvegarde.</span>
                )}
              </div>
            </div>

            {/* Submit & Cancel Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => setViewMode(selectedPost && isEdit ? 'DETAILS' : 'LIST')}
              >
                Annuler
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {isEdit ? 'Enregistrer les modifications' : 'Publier la discussion'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 2 : DÉTAILS D'UNE DISCUSSION & FIL DE RÉPONSES
  // ═══════════════════════════════════════════════════════════════════════
  if (viewMode === 'DETAILS' && selectedPost) {
    const isAuthor = user?.id === selectedPost.author.id;
    const canEdit = isAuthor || isAdmin;
    const canDelete = isAuthor || isAdmin;
    const authorBadge = getRoleBadge(selectedPost.author.role);
    const AuthorIcon = authorBadge.icon;

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => {
              setSelectedPost(null);
              setViewMode('LIST');
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux discussions
          </button>

          <div className="flex items-center gap-2">
            {canEdit && isAuthor && (
              <button
                onClick={(e) => handleOpenEditPage(selectedPost, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-sidebar hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                title="Modifier la discussion"
              >
                <Edit3 className="w-3.5 h-3.5 text-brand-accent" />
                <span>Modifier</span>
              </button>
            )}

            {canDelete && (
              <button 
                onClick={(e) => deletePost(selectedPost.id, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors"
                title="Supprimer la discussion"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            )}
          </div>
        </div>

        {/* Discussion Main Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
          {/* Post Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-brand-sidebar border-2 border-slate-100 flex items-center justify-center font-bold text-brand-accent text-base shrink-0 overflow-hidden shadow-sm">
                {selectedPost.author.avatarUrl ? (
                   <img src={getFileUrl(selectedPost.author.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                   getInitials(selectedPost.author.firstName, selectedPost.author.lastName)
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-base">
                    {selectedPost.author.firstName} {selectedPost.author.lastName}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${authorBadge.className}`}>
                    <AuthorIcon className="w-3 h-3" />
                    {authorBadge.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Publié le {new Date(selectedPost.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à {new Date(selectedPost.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit'})}
                  {selectedPost.updatedAt && selectedPost.updatedAt !== selectedPost.createdAt && (
                    <span className="italic text-slate-400">(modifié)</span>
                  )}
                </p>
              </div>
            </div>

            {/* Category badge */}
            {CATEGORIES.find(c => c.id === selectedPost.category) && (
              <span className={`px-3 py-1 rounded-full text-xs font-black text-white self-start ${CATEGORIES.find(c => c.id === selectedPost.category)?.color} shadow-sm`}>
                {CATEGORIES.find(c => c.id === selectedPost.category)?.label}
              </span>
            )}
          </div>

          {/* Post Title & Content */}
          <div className="mt-6">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-4 leading-snug">
              {selectedPost.title}
            </h1>
            <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base font-normal">
              {selectedPost.content}
            </div>

            {/* Attachment preview if any */}
            {selectedPost.fileUrl && renderFilePreview(selectedPost.fileUrl, selectedPost.fileType || '')}
          </div>
        </div>

        {/* Responses & Comments Thread */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-accent" />
              Réponses & Échanges ({selectedPost.comments?.length ?? selectedPost._count?.comments ?? 0})
            </h3>
            <span className="text-xs text-slate-400 font-medium">Mises à jour en direct</span>
          </div>
          
          {/* Comments List */}
          <div className="space-y-5">
            {selectedPost.comments && selectedPost.comments.length > 0 ? (
              selectedPost.comments.map(comment => {
                const commentAuthorBadge = getRoleBadge(comment.author.role);
                const isCommentAuthor = user?.id === comment.author.id;
                const canDeleteComment = isCommentAuthor || isAdmin;

                return (
                  <div key={comment.id} className="flex gap-3 md:gap-4 group">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden border border-slate-200 shadow-sm mt-0.5">
                      {comment.author.avatarUrl ? (
                        <img src={getFileUrl(comment.author.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(comment.author.firstName, comment.author.lastName)
                      )}
                    </div>
                    <div className="flex-1 bg-slate-50/80 rounded-2xl p-4 border border-slate-100 relative group-hover:border-slate-200 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs md:text-sm text-slate-900">
                            {comment.author.firstName} {comment.author.lastName}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${commentAuthorBadge.className}`}>
                            {commentAuthorBadge.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(comment.createdAt).toLocaleDateString('fr-FR')} à {new Date(comment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                      
                      {canDeleteComment && (
                        <button 
                          onClick={() => deleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg"
                          title="Supprimer ce commentaire"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Aucune réponse pour l'instant.</p>
                <p className="text-xs text-slate-400 mt-1">Soyez le premier à participer à cette discussion !</p>
              </div>
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Reply Form */}
          <form onSubmit={onSubmitComment} className="flex gap-3 md:gap-4 items-start pt-4 border-t border-slate-100">
            <div className="w-9 h-9 rounded-full bg-brand-sidebar flex items-center justify-center font-bold text-brand-accent text-xs shrink-0 overflow-hidden border border-slate-200 mt-1">
              {user?.avatarUrl ? (
                <img src={getFileUrl(user.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.firstName || '', user?.lastName || '')
              )}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Rédigez votre réponse ou apportez une précision..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all resize-none min-h-[90px] text-slate-800"
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmittingComment || !commentText.trim()}
                  isLoading={isSubmittingComment}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Envoyer la réponse
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VUE 3 : LISTE PRINCIPALE DU FORUM
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Forum de Discussion & Entraide"
        description="Espace d'échange et d'interaction pour toute la communauté scolaire."
      >
        <Button 
          variant="primary" 
          onClick={handleOpenCreatePage} 
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouvelle Discussion
        </Button>
      </PageHeader>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une discussion, un mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all text-slate-800"
          />
        </div>
        
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto custom-scrollbar">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === 'ALL' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes les catégories
          </button>
          {CATEGORIES.map(cat => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected 
                    ? `${cat.color} text-white shadow-sm` 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Discussion List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 font-medium flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
            Chargement des discussions du forum...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center gap-3 p-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-sidebar flex items-center justify-center text-brand-accent">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Aucune discussion trouvée</h3>
            <p className="text-slate-500 text-sm max-w-md">
              {searchQuery 
                ? "Aucune discussion ne correspond à vos critères de recherche. Essayez d'autres mots-clés."
                : "Il n'y a pas encore de discussion dans cette catégorie. Soyez le premier à en lancer une !"}
            </p>
            <Button variant="primary" onClick={handleOpenCreatePage} leftIcon={<Plus className="w-4 h-4" />}>
              Lancer une discussion
            </Button>
          </div>
        ) : (
          filteredPosts.map(post => {
            const isAuthor = user?.id === post.author.id;
            const canEdit = isAuthor || isAdmin;
            const canDelete = isAuthor || isAdmin;
            const categoryObj = CATEGORIES.find(c => c.id === post.category);
            const authorRoleBadge = getRoleBadge(post.author.role);

            return (
              <div 
                key={post.id} 
                onClick={() => handleSelectPost(post)}
                className="bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-brand-accent/40 transition-all cursor-pointer group flex items-start gap-4 relative"
              >
                {/* Author Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-base shrink-0 overflow-hidden border border-slate-200 mt-1">
                  {post.author.avatarUrl ? (
                    <img src={getFileUrl(post.author.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(post.author.firstName, post.author.lastName)
                  )}
                </div>

                {/* Content info */}
                <div className="flex-1 min-w-0 pr-16">
                  {/* Category & Attachments */}
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {categoryObj && (
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black text-white uppercase tracking-wider ${categoryObj.color}`}>
                        {categoryObj.label}
                      </span>
                    )}
                    {post.fileUrl && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Paperclip className="w-3 h-3 text-brand-accent" /> Fichier joint
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-brand-accent transition-colors mb-1">
                    {post.title}
                  </h3>

                  {/* Preview Content */}
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {post.content}
                  </p>

                  {/* Metadata footer */}
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1.5 font-bold text-brand-accent bg-brand-accent/5 px-2.5 py-1 rounded-lg border border-brand-accent/10">
                      <MessageSquare className="w-3.5 h-3.5" /> 
                      {post.comments?.length ?? post._count?.comments ?? 0} réponses
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      Par <strong className="text-slate-700">{post.author.firstName} {post.author.lastName}</strong>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${authorRoleBadge.className}`}>
                        {authorRoleBadge.label}
                      </span>
                    </span>
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString('fr-FR')} à {new Date(post.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
                </div>

                {/* Quick actions (Author Edit / Admin Delete) */}
                <div className="absolute top-5 right-5 flex items-center gap-1">
                  {canEdit && isAuthor && (
                    <button 
                      onClick={(e) => handleOpenEditPage(post, e)}
                      className="text-slate-400 hover:text-brand-accent transition-colors p-2 hover:bg-slate-100 rounded-xl"
                      title="Modifier ma discussion"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={(e) => deletePost(post.id, e)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                      title="Supprimer la discussion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Forum;
