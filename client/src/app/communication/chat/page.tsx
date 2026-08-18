import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import api, { getFileUrl } from '@/lib/api';
import { 
  Send, 
  User, 
  Users, 
  Circle, 
  Paperclip, 
  FileText, 
  X, 
  ArrowLeft, 
  MessageSquare, 
  Search, 
  Phone, 
  Mail, 
  BookOpen, 
  GraduationCap, 
  Building2, 
  IdCard, 
  Info, 
  ShieldCheck, 
  UserCheck, 
  PhoneCall 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

interface Message {
    id: string;
    content: string;
    senderId: string;
    recipientId?: string | null;
    classId?: string | null;
    attachmentUrl?: string | null;
    attachmentType?: 'IMAGE' | 'PDF' | 'DOC' | 'VIDEO' | null;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

interface Contact {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isOnline?: boolean;
    name?: string; 
    avatarUrl?: string;
    phone?: string;
    type?: 'user' | 'class';
}

interface UserProfileDetails {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string | null;
    phone?: string | null;
    parentPhone?: string | null;
    matricule?: string | null;
    birthDate?: string | null;
    birthPlace?: string | null;
    address?: string | null;
    gender?: string | null;
    isOnline?: boolean;
    school?: { id: string; name: string; ville?: string | null } | null;
    className?: string | null;
    niveauName?: string | null;
    teacherSubjects?: string[];
    teacherClasses?: string[];
}

const Chat = () => {
    const { user } = useAuth();
    const { toast, error: showError } = useToast();
    const { socket, isConnected: isSocketConnected } = useSocket();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showContactList, setShowContactList] = useState(true);
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [detailedProfile, setDetailedProfile] = useState<UserProfileDetails | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    // Gérer l'affichage mobile : si un contact est sélectionné, on cache la liste
    useEffect(() => {
        if (selectedContact) {
            setShowContactList(false);
        } else {
            setShowContactList(true);
        }
    }, [selectedContact]);

    // Supabase Realtime for new messages
    useEffect(() => {
        if (!user) return;
        if (!supabase) {
            console.warn('[Chat] Supabase client is null, realtime disabled');
            return;
        }

        console.log('[Supabase] Subscribing to Message table...');
        const channel = supabase
            .channel('public:Message')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'Message' 
            }, async (payload: { new: any }) => {
                console.log('[Supabase] New message received:', payload.new);
                const newMessage = payload.new as any;
                
                setMessages(prev => {
                    // Check if message already exists by ID
                    if (prev.find(m => String(m.id) === String(newMessage.id))) return prev;
                    
                    // ALSO: Check if we have an optimistic message with same content and sender
                    // that was sent very recently (within 5 seconds)
                    const now = new Date();
                    const duplicateOptimistic = prev.find(m => 
                        String(m.id).startsWith('temp-') && 
                        m.content === newMessage.content &&
                        String(m.senderId) === String(newMessage.senderId) &&
                        (now.getTime() - new Date(m.createdAt).getTime()) < 5000
                    );

                    if (duplicateOptimistic) {
                        // Replace the temp message with the real one to avoid double display
                        return prev.map(m => m.id === duplicateOptimistic.id ? {
                            ...newMessage,
                            sender: newMessage.sender || duplicateOptimistic.sender
                        } : m);
                    }
                    
                    const formattedMessage: Message = {
                        ...newMessage,
                        sender: newMessage.sender || { firstName: '...', lastName: '' }
                    };
                    return [...prev, formattedMessage];
                });
            })
            .subscribe((status: string) => {
                console.log('[Supabase] Subscription status:', status);
                if (status === 'SUBSCRIBED') setIsSupabaseConnected(true);
            });

        return () => {
            supabase?.removeChannel(channel);
        };
    }, [user]);

    // Listen for socket events using the global socket
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message: Message) => {
            console.log('[Socket] Message received via socket:', message);
            setMessages((prev) => {
                const isDuplicate = prev.some(m => String(m.id) === String(message.id));
                if (isDuplicate) return prev;
                return [...prev, message];
            });
        };

        const handleUserStatusUpdate = (data: { userId: string, isOnline: boolean }) => {
            setContacts(prev => prev.map(c => 
                c.id === data.userId ? { ...c, isOnline: data.isOnline } : c
            ));
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_status_update', handleUserStatusUpdate);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_status_update', handleUserStatusUpdate);
        };
    }, [socket]);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        const targetUserId = searchParams.get('userId') || searchParams.get('recipientId');
        if (!targetUserId) return;

        if (contacts.length > 0) {
            const contact = contacts.find(c => c.id === targetUserId);
            if (contact) {
                setSelectedContact(contact);
                return;
            }
        }

        // If not yet found in contacts list, fetch directly
        if (!selectedContact) {
            api.get(`/users/${targetUserId}`)
                .then(res => {
                    if (res.data) {
                        const directContact: Contact = {
                            id: res.data.id,
                            firstName: res.data.firstName,
                            lastName: res.data.lastName,
                            role: res.data.role,
                            avatarUrl: res.data.avatarUrl,
                            phone: res.data.phone,
                            type: 'user'
                        };
                        setContacts(prev => {
                            if (prev.some(c => c.id === directContact.id)) return prev;
                            return [directContact, ...prev];
                        });
                        setSelectedContact(directContact);
                    }
                })
                .catch(err => console.error("Could not fetch target chat recipient", err));
        }
    }, [searchParams, contacts, selectedContact]);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory(selectedContact);
            if (socket && selectedContact.type === 'class') {
                socket.emit('join_class', selectedContact.id);
            }
        }
    }, [selectedContact, socket]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const isRealtimeConnected = isSupabaseConnected || isSocketConnected;

    const fetchContacts = async () => {
        try {
            // Fetch users (students/teachers/staff)
            const resUsers = await api.get('/chat/contacts');
            const users = resUsers.data.map((u: any) => ({ ...u, type: 'user' }));

            let classes: Contact[] = [];
            if (user?.role === 'ENSEIGNANT') {
                const resCourses = await api.get('/courses');
                // Unique classes
                const classMap = new Map();
                resCourses.data.forEach((c: any) => {
                    if (!classMap.has(c.class.id)) {
                        classMap.set(c.class.id, {
                            id: c.class.id,
                            name: c.class.name,
                            type: 'class'
                        });
                    }
                });
                classes = Array.from(classMap.values());
            } else if (user?.role === 'APPRENANT') {
                const resCourses = await api.get('/courses');
                if (resCourses.data && resCourses.data.length > 0) {
                    const classMap = new Map();
                    resCourses.data.forEach((c: any) => {
                        if (c.class && !classMap.has(c.class.id)) {
                            classMap.set(c.class.id, {
                                id: c.class.id,
                                name: c.class.name,
                                type: 'class'
                            });
                        }
                    });
                    classes = Array.from(classMap.values());
                }
            }

            setContacts([...classes, ...users]);
        } catch (error) {
            console.error("Error fetching contacts", error);
        }
    };

    const fetchHistory = async (contact: Contact) => {
        try {
            let url = '';
            if (contact.type === 'class') {
                url = `/chat/history/class/${contact.id}`;
            } else {
                url = `/chat/history/user/${contact.id}`;
            }
            const res = await api.get(url);
            setMessages(res.data);
        } catch (error) {
            console.error("Error fetching history", error);
        }
    };

    const handleOpenContactProfile = async () => {
        if (!selectedContact) return;
        setIsProfileModalOpen(true);
        if (selectedContact.type === 'class') return;

        setIsLoadingProfile(true);
        try {
            const res = await api.get(`/users/${selectedContact.id}`);
            setDetailedProfile(res.data);
        } catch (err) {
            console.error("Error fetching contact details:", err);
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || !selectedContact) return;

        let attachmentUrl = null;
        let attachmentType = null;

        if (selectedFile) {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                const res = await api.post('/chat/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                console.log("Upload success:", res.data);
                attachmentUrl = res.data.url;
                attachmentType = res.data.type;
            } catch (error: any) {
                console.error("Upload failed details:", error.response?.data || error.message);
                showError(`Erreur lors de l'envoi du fichier: ${error.response?.data?.message || error.message}`);
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        const messageData = {
            content: newMessage || (selectedFile ? `📎 ${selectedFile.name}` : ''),
            recipientId: selectedContact.type === 'user' ? selectedContact.id : undefined,
            classId: selectedContact.type === 'class' ? selectedContact.id : undefined,
            attachmentUrl,
            attachmentType
        };

        // Optimistic update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            content: messageData.content,
            senderId: user?.id || '',
            recipientId: messageData.recipientId,
            classId: messageData.classId,
            attachmentUrl: attachmentUrl,
            attachmentType: attachmentType as any,
            sender: {
                id: user?.id || '',
                firstName: user?.firstName || '',
                lastName: user?.lastName || ''
            },
            createdAt: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, tempMessage]);

        try {
            const res = await api.post('/chat/send', messageData);
            const savedMessage = res.data;
            
            // Replace the temporary message with the saved one
            setMessages(prev => {
                // Check if the message was already added by Supabase Realtime
                const alreadyExists = prev.some(m => String(m.id) === String(savedMessage.id));
                if (alreadyExists) {
                    return prev.filter(m => m.id !== tempMessage.id);
                }
                return prev.map(m => m.id === tempMessage.id ? savedMessage : m);
            });
            
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error("Error sending message via API:", error);
            showError("Erreur lors de l'envoi du message");
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    // Filter messages for current view
    const displayMessages = messages.filter(m => {
        if (!selectedContact || !user) return false;
        
        const currentUserId = String(user.id);
        const contactId = String(selectedContact.id);
        
        if (selectedContact.type === 'class') {
            return m.classId === contactId; 
        } else {
            const senderId = String(m.senderId);
            const recipientId = m.recipientId ? String(m.recipientId) : null;
            
            return (senderId === contactId && recipientId === currentUserId) ||
                   (senderId === currentUserId && recipientId === contactId);
        }
    });

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck };
            case 'DIRECTEUR':
                return { label: 'Directeur', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: UserCheck };
            case 'EDUCATEUR':
                return { label: 'Éducateur', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: GraduationCap };
            case 'ENSEIGNANT':
            case 'TEACHER':
                return { label: 'Professeur', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: BookOpen };
            case 'APPRENANT':
            case 'STUDENT':
            default:
                return { label: 'Élève', color: 'bg-sky-100 text-sky-800 border-sky-200', icon: GraduationCap };
        }
    };

    const renderAttachment = (msg: Message) => {
        if (!msg.attachmentUrl) return null;
        
        if (msg.attachmentType === 'IMAGE') {
            return (
                <a href={getFileUrl(msg.attachmentUrl)} target="_blank" rel="noopener noreferrer" className="block mt-2">
                    <img src={getFileUrl(msg.attachmentUrl)} alt="attachment" className="max-w-[200px] rounded-lg border border-gray-200" />
                </a>
            );
        } else if (msg.attachmentType === 'VIDEO') {
            return (
                <video src={getFileUrl(msg.attachmentUrl)} controls className="max-w-[200px] mt-2 rounded-lg" />
            );
        } else {
            return (
                <a 
                    href={getFileUrl(msg.attachmentUrl)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 mt-2 p-2 bg-brand-sidebar rounded text-brand-accent hover:underline"
                >
                    {msg.attachmentType === 'PDF' ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                    <span>Voir la pièce jointe</span>
                </a>
            );
        }
    };

    const getInitials = (fName?: string, lName?: string) => `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase();

    const roleBadge = getRoleLabel(detailedProfile?.role || selectedContact?.role);
    const RoleIcon = roleBadge.icon;

    return (
        <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-100px)] bg-brand-card rounded-xl shadow-sm overflow-hidden border border-brand-border/50 relative">
            {/* Sidebar (Contacts) */}
            <div className={`
                ${showContactList ? 'flex' : 'hidden md:flex'} 
                w-full md:w-1/4 border-r border-brand-border/50 flex-col bg-brand-sidebar
            `}>
                <div className="p-4 border-b border-brand-border/50 bg-brand-sidebar flex items-center justify-between">
                    <h2 className="font-semibold text-brand-text">Discussions</h2>
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></div>
                        <span className="text-[10px] text-brand-text-muted font-medium uppercase tracking-wider">{isSupabaseConnected ? 'Connecté' : 'Déconnecté'}</span>
                    </div>
                </div>
                <div className="p-3 border-b border-brand-border/50 bg-brand-sidebar/50">
                    <div className="relative">
                        <Search className="w-4 h-4 text-brand-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Rechercher un contact..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-brand-card border border-brand-border/50 rounded-lg text-sm text-brand-text outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {contacts.filter(c => (c.name || `${c.firstName} ${c.lastName}`).toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                        contacts.filter(c => (c.name || `${c.firstName} ${c.lastName}`).toLowerCase().includes(searchQuery.toLowerCase())).map(contact => (
                            <div 
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`p-4 border-b border-brand-border/30 cursor-pointer transition-all ${selectedContact?.id === contact.id ? 'bg-brand-accent/10 border-l-2 border-l-brand-accent' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm shrink-0 overflow-hidden">
                                        {contact.type === 'class' ? (
                                            <Users className="w-5 h-5 text-brand-accent" />
                                        ) : contact.avatarUrl ? (
                                            <img src={getFileUrl(contact.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(contact.firstName, contact.lastName)
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-brand-text truncate">
                                            {contact.type === 'class' ? contact.name : `${contact.firstName} ${contact.lastName}`}
                                        </p>
                                        <p className="text-xs text-brand-text-muted truncate">
                                            {contact.type === 'class' ? 'Classe' : (getRoleLabel(contact.role).label)}
                                        </p>
                                    </div>
                                    {contact.isOnline && <Circle className="w-2.5 h-2.5 text-emerald-500 fill-current shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-brand-text-muted">
                            Aucun contact trouvé
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`
                ${!showContactList ? 'flex' : 'hidden md:flex'} 
                flex-1 flex-col bg-brand-sidebar/50 w-full relative
            `}>
                {selectedContact ? (
                    <>
                        {/* Interactive Header with Interlocutor Profile Trigger */}
                        <div className="p-3 md:p-4 bg-brand-card border-b border-brand-border/50 flex items-center justify-between sticky top-0 z-10">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <button 
                                    onClick={() => setSelectedContact(null)}
                                    className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-brand-text-muted hover:text-brand-text" />
                                </button>
                                
                                {/* Clickable interlocutor zone */}
                                <div 
                                    onClick={handleOpenContactProfile}
                                    className="flex items-center gap-3 min-w-0 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-white/5 transition-all group"
                                    title="Cliquer pour afficher la fiche profil détaillée"
                                >
                                    <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center font-bold text-brand-accent text-sm shrink-0 overflow-hidden border border-brand-accent/30 group-hover:scale-105 transition-transform">
                                        {selectedContact.type === 'class' ? (
                                            <Users className="w-5 h-5 text-brand-accent" />
                                        ) : selectedContact.avatarUrl ? (
                                            <img src={getFileUrl(selectedContact.avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            getInitials(selectedContact.firstName, selectedContact.lastName)
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-brand-text truncate group-hover:text-brand-accent transition-colors">
                                                {selectedContact.type === 'class' ? selectedContact.name : `${selectedContact.firstName} ${selectedContact.lastName}`}
                                            </h3>
                                            <Info className="w-3.5 h-3.5 text-brand-text-muted group-hover:text-brand-accent transition-colors" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                                            <span>{selectedContact.type === 'class' ? 'Discussion de classe' : getRoleLabel(selectedContact.role).label}</span>
                                            {selectedContact.isOnline && (
                                                <span className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    En ligne
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Action in Header */}
                            {selectedContact.type === 'user' && (
                                <button
                                    onClick={handleOpenContactProfile}
                                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-brand-sidebar hover:bg-white/10 text-brand-text text-xs font-semibold rounded-lg border border-brand-border/40 transition-colors"
                                >
                                    <Info className="w-4 h-4 text-brand-accent" />
                                    <span>Fiche contact</span>
                                </button>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-brand-sidebar/30">
                            {displayMessages.length > 0 ? (
                                displayMessages.map((msg) => {
                                    const isMe = String(msg.senderId) === String(user?.id);
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl ${
                                                isMe 
                                                    ? 'bg-brand-accent text-white rounded-br-none shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
                                                    : 'bg-brand-card text-brand-text shadow-sm rounded-bl-none border border-brand-border/50'
                                            }`}>
                                                {!isMe && <p className="text-[11px] font-bold mb-1 text-brand-accent">{msg.sender?.firstName || 'Utilisateur'} {msg.sender?.lastName || ''}</p>}
                                                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                                {renderAttachment(msg)}
                                                <p className={`text-[9px] mt-1 text-right font-medium ${isMe ? 'text-white/70' : 'text-brand-text-muted'}`}>
                                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="flex-1 flex items-center justify-center h-full text-brand-text-muted italic">
                                    Aucun message. Commencez la discussion !
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 md:p-4 bg-brand-card border-t border-brand-border/50 flex flex-col gap-2">
                            {selectedFile && (
                                <div className="flex items-center gap-2 bg-brand-sidebar p-2 rounded-lg text-sm border border-brand-border/30 w-fit">
                                    <Paperclip className="w-4 h-4 text-brand-accent" />
                                    <span className="truncate max-w-[200px] text-brand-text">{selectedFile.name}</span>
                                    <button 
                                        type="button"
                                        onClick={() => setSelectedFile(null)}
                                        className="ml-2 p-1 hover:bg-white/10 rounded-md transition-colors"
                                    >
                                        <X className="w-4 h-4 text-brand-text-muted hover:text-brand-text" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 text-brand-text-muted hover:text-brand-text hover:bg-white/5 rounded-full transition-colors shrink-0"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                <input 
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Écrivez votre message..."
                                    className="flex-1 p-3 bg-brand-sidebar border border-brand-border/50 rounded-full focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent text-sm text-brand-text outline-none transition-all"
                                />
                                <button 
                                    type="submit"
                                    disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                                    className="p-3 bg-brand-accent text-white rounded-full hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.1)] flex items-center justify-center"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center text-brand-text-muted">
                        <div className="flex flex-col items-center gap-4 opacity-50">
                            <MessageSquare className="w-16 h-16 text-brand-accent" />
                            <p>Sélectionnez un contact pour commencer à discuter</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* MODAL / POPUP DESCRIPTION PROFIL INTERLOCUTEUR                    */}
            {/* ══════════════════════════════════════════════════════════════════ */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsProfileModalOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-fade-in-down">
                        {/* Header Gradient */}
                        <div className="h-28 bg-gradient-to-r from-brand-accent via-indigo-600 to-purple-600 p-4 relative flex justify-end items-start">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Profile Body */}
                        <div className="px-6 pb-6 pt-0 relative">
                            {/* Large Avatar */}
                            <div className="-mt-14 mb-4 flex items-end justify-between">
                                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg border border-slate-100 overflow-hidden relative">
                                    <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center font-black text-brand-accent text-2xl overflow-hidden">
                                        {selectedContact?.type === 'class' ? (
                                            <Users className="w-10 h-10 text-brand-accent" />
                                        ) : (detailedProfile?.avatarUrl || selectedContact?.avatarUrl) ? (
                                            <img 
                                                src={getFileUrl(detailedProfile?.avatarUrl || selectedContact?.avatarUrl || '')} 
                                                alt="Avatar" 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            getInitials(detailedProfile?.firstName || selectedContact?.firstName, detailedProfile?.lastName || selectedContact?.lastName)
                                        )}
                                    </div>
                                    {selectedContact?.isOnline && (
                                        <span className="absolute bottom-2 right-2 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>

                                {/* Role Badge */}
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${roleBadge.color}`}>
                                    <RoleIcon className="w-3.5 h-3.5" />
                                    {selectedContact?.type === 'class' ? 'Groupe de Classe' : roleBadge.label}
                                </span>
                            </div>

                            {/* Name & Title */}
                            <div className="mb-5">
                                <h2 className="text-xl font-black text-slate-900 leading-tight">
                                    {selectedContact?.type === 'class' 
                                        ? selectedContact.name 
                                        : `${detailedProfile?.firstName || selectedContact?.firstName || ''} ${detailedProfile?.lastName || selectedContact?.lastName || ''}`}
                                </h2>
                                <p className="text-xs font-medium text-slate-400 mt-0.5">
                                    {detailedProfile?.school?.name || (selectedContact?.type === 'class' ? 'Espace collaboratif' : 'Membre de l\'établissement')}
                                    {detailedProfile?.school?.ville && ` • ${detailedProfile.school.ville}`}
                                </p>
                            </div>

                            {/* Details List */}
                            {isLoadingProfile ? (
                                <div className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                    <div className="w-6 h-6 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                                    Chargement des informations...
                                </div>
                            ) : (
                                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {/* 1. ÉLÈVE : Afficher Classe + Téléphone */}
                                    {(detailedProfile?.role === 'APPRENANT' || selectedContact?.role === 'APPRENANT') && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 shrink-0 mt-0.5">
                                                    <GraduationCap className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classe</p>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {detailedProfile?.className || "Classe non assignée"}
                                                        {detailedProfile?.niveauName && <span className="text-xs font-normal text-slate-500"> ({detailedProfile.niveauName})</span>}
                                                    </p>
                                                </div>
                                            </div>

                                            {detailedProfile?.matricule && (
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 mt-0.5">
                                                        <IdCard className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matricule</p>
                                                        <p className="text-sm font-bold text-slate-900">{detailedProfile.matricule}</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Numéro de téléphone</p>
                                                    {detailedProfile?.phone ? (
                                                        <a href={`tel:${detailedProfile.phone}`} className="text-sm font-bold text-emerald-700 hover:underline flex items-center gap-1.5">
                                                            {detailedProfile.phone}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic">Non renseigné</p>
                                                    )}
                                                </div>
                                            </div>

                                            {detailedProfile?.parentPhone && (
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                                                        <PhoneCall className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Téléphone du Parent / Tuteur</p>
                                                        <a href={`tel:${detailedProfile.parentPhone}`} className="text-sm font-bold text-amber-800 hover:underline">
                                                            {detailedProfile.parentPhone}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 2. PROFESSEUR : Afficher Matières enseignées + Téléphone */}
                                    {(detailedProfile?.role === 'ENSEIGNANT' || selectedContact?.role === 'ENSEIGNANT') && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Matière(s) enseignée(s)</p>
                                                    <p className="text-sm font-bold text-slate-900">
                                                        {detailedProfile?.teacherSubjects && detailedProfile.teacherSubjects.length > 0 
                                                            ? detailedProfile.teacherSubjects.join(', ') 
                                                            : "Professeur de l'établissement"}
                                                    </p>
                                                </div>
                                            </div>

                                            {detailedProfile?.teacherClasses && detailedProfile.teacherClasses.length > 0 && (
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                                                        <GraduationCap className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classes assignées</p>
                                                        <p className="text-sm font-semibold text-slate-800">
                                                            {detailedProfile.teacherClasses.join(', ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0 mt-0.5">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Numéro de téléphone</p>
                                                    {detailedProfile?.phone ? (
                                                        <a href={`tel:${detailedProfile.phone}`} className="text-sm font-bold text-purple-700 hover:underline">
                                                            {detailedProfile.phone}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic">Non renseigné</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* 3. ADMINISTRATION / AUTRES RÔLES */}
                                    {detailedProfile?.role && !['APPRENANT', 'ENSEIGNANT'].includes(detailedProfile.role) && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fonction / Rôle</p>
                                                    <p className="text-sm font-bold text-slate-900">{roleBadge.label}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Numéro de téléphone</p>
                                                    {detailedProfile?.phone ? (
                                                        <a href={`tel:${detailedProfile.phone}`} className="text-sm font-bold text-emerald-700 hover:underline">
                                                            {detailedProfile.phone}
                                                        </a>
                                                    ) : (
                                                        <p className="text-sm text-slate-500 italic">Non renseigné</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Email générique */}
                                    {detailedProfile?.email && (
                                        <div className="flex items-start gap-3 pt-2 border-t border-slate-200/60">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                                                <Mail className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Adresse e-mail</p>
                                                <a href={`mailto:${detailedProfile.email}`} className="text-xs font-semibold text-slate-700 hover:text-brand-accent truncate block">
                                                    {detailedProfile.email}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-5 flex items-center gap-3">
                                {detailedProfile?.phone && (
                                    <a 
                                        href={`tel:${detailedProfile.phone}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
                                    >
                                        <Phone className="w-4 h-4" />
                                        Appeler
                                    </a>
                                )}
                                {detailedProfile?.email && (
                                    <a 
                                        href={`mailto:${detailedProfile.email}`}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors shadow-sm"
                                    >
                                        <Mail className="w-4 h-4" />
                                        Envoyer email
                                    </a>
                                )}
                                <button
                                    onClick={() => setIsProfileModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
