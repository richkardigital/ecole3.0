import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { MessageSquare, ThumbsUp, MoreVertical, Edit2, Trash2, Search, Filter, Plus, User, FileText, Image as ImageIcon, CheckCircle, X, CheckSquare, Clock, Calendar, MessageCircle, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  category: string;
  fileUrl?: string;
  fileType?: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  _count?: {
    comments: number;
  };
  comments?: ForumComment[];
}

interface ForumComment {
  id: string;
  content: string;
  authorId: string;
  postId?: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface PostForm {
  title: string;
  content: string;
  category: string;
  file?: FileList;
}

interface CommentForm {
  content: string;
}

const Forum = () => {
  const { user } = useAuth();
  const { toast, success, error } = useToast();
  const { socket } = useSocket();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Forms
  const { register: registerPost, handleSubmit: handleSubmitPost, reset: resetPost } = useForm<PostForm>();
  const { register: registerComment, handleSubmit: handleSubmitComment, reset: resetComment } = useForm<CommentForm>();

  useEffect(() => {
    fetchPosts();
  }, [filterCategory, searchTerm]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (newPost: ForumPost) => {
      // Apply filter check
      if (filterCategory !== "ALL" && newPost.category !== filterCategory) return;
      // Apply search check (basic)
      if (searchTerm && !newPost.title.toLowerCase().includes(searchTerm.toLowerCase()) && !newPost.content.toLowerCase().includes(searchTerm.toLowerCase())) return;

      setPosts((prev) => {
        if (prev.some(p => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    };

    const handlePostDeleted = (id: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      if (selectedPost?.id === id) {
        setSelectedPost(null);
      }
    };

    const handleNewComment = (comment: ForumComment & { author: { id: string; firstName: string; lastName: string; role: string } }) => {
      // Update comment count in list
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === comment.postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: (p._count?.comments || 0) + 1,
              },
            };
          }
          return p;
        })
      );

      // If viewing the post, add comment
      if (selectedPost?.id === comment.postId) {
        setSelectedPost((prev) => {
          if (!prev) return null;
          if (prev.comments?.some(c => c.id === comment.id)) return prev;
          return {
            ...prev,
            comments: [...(prev.comments || []), comment],
            _count: {
              ...prev._count,
              comments: (prev._count?.comments || 0) + 1,
            },
          };
        });
      }
    };

    const handleCommentDeleted = ({ id, postId }: { id: string; postId: string }) => {
       // Update comment count in list
       setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              _count: {
                ...p._count,
                comments: Math.max((p._count?.comments || 1) - 1, 0),
              },
            };
          }
          return p;
        })
      );

      // If viewing the post, remove comment
      if (selectedPost?.id === postId) {
        setSelectedPost((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            comments: prev.comments?.filter((c) => c.id !== id),
            _count: {
              ...prev._count,
              comments: Math.max((prev._count?.comments || 1) - 1, 0),
            },
          };
        });
      }
    };

    socket.on("forum:post_created", handleNewPost);
    socket.on("forum:post_deleted", handlePostDeleted);
    socket.on("forum:comment_created", handleNewComment);
    socket.on("forum:comment_deleted", handleCommentDeleted);

    return () => {
      socket.off("forum:post_created", handleNewPost);
      socket.off("forum:post_deleted", handlePostDeleted);
      socket.off("forum:comment_created", handleNewComment);
      socket.off("forum:comment_deleted", handleCommentDeleted);
    };
  }, [socket, filterCategory, searchTerm, selectedPost?.id]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterCategory !== "ALL") params.category = filterCategory;
      if (searchTerm) params.search = searchTerm;
      
      const res = await api.get('/forum', { params });
      setPosts(res.data);
    } catch (error) {
      console.error("Error fetching posts", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (id: string) => {
    try {
      const res = await api.get(`/forum/${id}`);
      setSelectedPost(res.data);
    } catch (error) {
      console.error("Error fetching post details", error);
    }
  };

  const onCreatePost = async (data: PostForm) => {
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('category', data.category);
      if (data.file && data.file[0]) {
        formData.append('file', data.file[0]);
      }

      await api.post('/forum', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      resetPost();
      setIsCreateModalOpen(false);
      fetchPosts();
    } catch (error) {
      console.error("Error creating post", error);
    }
  };

  const onAddComment = async (data: CommentForm) => {
    if (!selectedPost) return;
    try {
      await api.post(`/forum/${selectedPost.id}/comments`, data);
      resetComment();
      fetchPostDetails(selectedPost.id); // Refresh comments
    } catch (error) {
      console.error("Error adding comment", error);
    }
  };

  const onDeletePost = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce sujet ?")) return;
    try {
      await api.delete(`/forum/${id}`);
      if (selectedPost?.id === id) setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post", error);
    }
  };

  const onDeleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    try {
      await api.delete(`/forum/comments/${commentId}`);
      if (selectedPost) fetchPostDetails(selectedPost.id);
      success("Commentaire supprimé");
    } catch (err) {
      console.error("Error deleting comment", err);
      error("Erreur lors de la suppression du commentaire");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Forum" 
        subtitle="Espace d'échange et de partage de ressources pour toute l'école."
        icon={<MessageSquare className="w-6 h-6 text-brand-accent" />}
        action={
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Nouveau Sujet
          </Button>
        }
      />

      {/* Explanatory Box */}
      <div className="bg-brand-accent/10 border border-brand-accent/20 rounded-xl p-4 text-sm text-brand-accent">
        <p className="font-semibold mb-2">Types de publications autorisés :</p>
        <p className="opacity-90">
          Ici vous pouvez publier les emplois du temps, des agendas de devoirs, des informations de kermesse, 
          congés scolaires, examen blanc, devoir de niveau, le programme par matières...
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-brand-card p-4 rounded-xl shadow-sm border border-brand-border/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted w-5 h-5" />
          <input 
            type="text" 
            placeholder="Rechercher un sujet..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-brand-text-muted w-5 h-5" />
          <select 
            className="px-4 py-2 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all cursor-pointer"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="ALL">Toutes catégories</option>
            <option value="GENERAL">Général</option>
            <option value="HOMEWORK">Devoirs</option>
            <option value="COURSE">Cours</option>
            <option value="ANNOUNCEMENT">Annonces</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-brand-text-muted">Chargement...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-brand-text-muted">Aucun sujet trouvé.</div>
          ) : (
            posts.map(post => (
              <div 
                key={post.id}
                onClick={() => fetchPostDetails(post.id)}
                className={`cursor-pointer p-4 rounded-xl border transition hover:shadow-md ${selectedPost?.id === post.id ? 'bg-brand-accent/10 border-brand-accent' : 'bg-brand-card border-brand-border/50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    post.category === 'ANNOUNCEMENT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    post.category === 'HOMEWORK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    post.category === 'COURSE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-white/5 text-brand-text-muted border-brand-border/50'
                  }`}>
                    {post.category === 'ANNOUNCEMENT' ? 'Annonce' :
                     post.category === 'HOMEWORK' ? 'Devoir' :
                     post.category === 'COURSE' ? 'Cours' : 'Général'}
                  </span>
                  <span className="text-xs text-brand-text-muted flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(post.createdAt), 'dd/MM', { locale: fr })}
                  </span>
                </div>
                <h3 className="font-semibold text-brand-text mb-1 line-clamp-1">{post.title}</h3>
                <p className="text-sm text-brand-text-muted line-clamp-2 mb-3">{post.content}</p>
                <div className="flex justify-between items-center text-xs text-brand-text-muted">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {post.author.firstName} {post.author.lastName}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {post._count?.comments || 0}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Post Details */}
        <div className="lg:col-span-2">
          {selectedPost ? (
            <div className="bg-brand-card rounded-xl shadow-sm border border-brand-border/50 flex flex-col h-full max-h-[calc(100vh-250px)]">
              <div className="p-6 border-b border-brand-border/50 shrink-0">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-brand-text mb-2">{selectedPost.title}</h2>
                  {(user?.id === selectedPost.authorId || user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR') && (
                    <button onClick={() => onDeletePost(selectedPost.id)} className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-brand-text-muted mb-4">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {selectedPost.author.firstName} {selectedPost.author.lastName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(selectedPost.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    selectedPost.category === 'ANNOUNCEMENT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    selectedPost.category === 'HOMEWORK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    selectedPost.category === 'COURSE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-white/5 text-brand-text-muted border-brand-border/50'
                  }`}>
                    {selectedPost.category === 'ANNOUNCEMENT' ? 'Annonce' :
                     selectedPost.category === 'HOMEWORK' ? 'Devoir' :
                     selectedPost.category === 'COURSE' ? 'Cours' : 'Général'}
                  </span>
                </div>
                <div className="prose prose-invert max-w-none text-brand-text">
                  <p className="whitespace-pre-wrap">{selectedPost.content}</p>
                </div>
                {selectedPost.fileUrl && (
                  <div className="mt-4 p-3 bg-brand-sidebar rounded-lg flex items-center gap-3 border border-brand-border/50 w-fit">
                    <Paperclip className="w-4 h-4 text-brand-accent" />
                    <a href={selectedPost.fileUrl} target="_blank" rel="noreferrer" className="text-brand-accent hover:underline text-sm font-medium">
                      Voir la pièce jointe
                    </a>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <h3 className="font-bold text-brand-text flex items-center gap-2 sticky top-0 bg-brand-card z-10 pb-2">
                  <MessageCircle className="w-5 h-5 text-brand-accent" />
                  Commentaires ({selectedPost.comments?.length || 0})
                </h3>
                {selectedPost.comments?.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-brand-accent/20 text-brand-accent flex items-center justify-center font-bold text-xs shrink-0">
                      {comment.author.firstName[0]}{comment.author.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="bg-brand-sidebar border border-brand-border/30 p-3 rounded-xl rounded-tl-none">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm text-brand-text">
                            {comment.author.firstName} {comment.author.lastName}
                          </span>
                          <span className="text-xs text-brand-text-muted">
                            {format(new Date(comment.createdAt), 'dd MMM HH:mm', { locale: fr })}
                          </span>
                        </div>
                        <p className="text-sm text-brand-text whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {(user?.id === comment.authorId || user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR') && (
                        <button 
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-xs text-red-400 hover:text-red-300 mt-1 opacity-0 group-hover:opacity-100 transition pl-1"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-brand-border/50 bg-brand-sidebar rounded-b-xl shrink-0">
                <form onSubmit={handleSubmitComment(onAddComment)} className="flex gap-2">
                  <input
                    {...registerComment('content', { required: true })}
                    type="text"
                    placeholder="Écrire un commentaire..."
                    className="flex-1 px-4 py-2.5 rounded-full border border-brand-border/50 bg-brand-card text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all text-sm"
                  />
                  <button type="submit" className="p-2.5 bg-brand-accent text-white rounded-full hover:bg-brand-accent-hover transition shadow-sm hover:shadow-md">
                    <SendIcon className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-brand-text-muted p-10 bg-brand-card rounded-xl border-2 border-dashed border-brand-border/50">
              <MessageSquare className="w-16 h-16 mb-4 opacity-20 text-brand-accent" />
              <p className="text-lg font-medium">Sélectionnez un sujet pour voir les détails</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouveau Sujet"
      >
        <form onSubmit={handleSubmitPost(onCreatePost)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Titre</label>
            <input
              {...registerPost('title', { required: true })}
              className="w-full px-4 py-2.5 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all text-sm"
              placeholder="Sujet de la discussion"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Catégorie</label>
            <select
              {...registerPost('category')}
              className="w-full px-4 py-2.5 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all text-sm"
            >
              <option value="GENERAL">Général</option>
              <option value="HOMEWORK">Devoirs</option>
              <option value="COURSE">Cours</option>
              <option value="ANNOUNCEMENT">Annonce</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Contenu</label>
            <textarea
              {...registerPost('content', { required: true })}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all text-sm resize-none custom-scrollbar"
              placeholder="De quoi voulez-vous parler ?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Pièce jointe (Optionnel)</label>
            <input
              {...registerPost('file')}
              type="file"
              className="w-full px-4 py-2.5 rounded-lg border border-brand-border/50 bg-brand-sidebar text-brand-text text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 transition-all"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-border/30">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Publier
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const SendIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default Forum;
