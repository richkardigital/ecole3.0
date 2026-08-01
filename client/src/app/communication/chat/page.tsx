import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '@/context/SocketContext';
import api, { getFileUrl } from '@/lib/api';
import { Send, User, Users, Circle, Paperclip, FileText, X, ArrowLeft, MessageSquare, Search } from 'lucide-react';
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
    firstName: string;
    lastName: string;
    role: string;
    isOnline?: boolean;
    name?: string; 
    type?: 'user' | 'class';
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
        const userId = searchParams.get('userId');
        if (userId && contacts.length > 0 && !selectedContact) {
            const contact = contacts.find(c => c.id === userId);
            if (contact) {
                setSelectedContact(contact);
            }
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
            // Fetch users (students/teachers)
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
                    // Remove the temp message since the real one is already there
                    return prev.filter(m => m.id !== tempMessage.id);
                }
                // Otherwise replace the temp message
                return prev.map(m => m.id === tempMessage.id ? savedMessage : m);
            });
            
            setNewMessage('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
            console.error("Error sending message via API:", error);
            showError("Erreur lors de l'envoi du message");
            // Optionally remove the temp message or mark it as failed
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
                                    <div className="bg-brand-accent/20 p-2 rounded-full shrink-0">
                                        {contact.type === 'class' ? <Users className="w-5 h-5 text-brand-accent" /> : <User className="w-5 h-5 text-brand-accent" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-brand-text truncate">
                                            {contact.type === 'class' ? contact.name : `${contact.firstName} ${contact.lastName}`}
                                        </p>
                                        <p className="text-xs text-brand-text-muted truncate">
                                            {contact.type === 'class' ? 'Classe' : (contact.role === 'ENSEIGNANT' ? 'Professeur' : 'Élève')}
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
                        {/* Header */}
                        <div className="p-3 md:p-4 bg-brand-card border-b border-brand-border/50 flex items-center gap-2 md:gap-3 sticky top-0 z-10">
                             <button 
                                onClick={() => setSelectedContact(null)}
                                className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors"
                             >
                                <ArrowLeft className="w-5 h-5 text-brand-text-muted hover:text-brand-text" />
                             </button>
                             <div className="flex items-center gap-3 min-w-0">
                                <div className="bg-brand-accent/20 p-2 rounded-full shrink-0">
                                    {selectedContact.type === 'class' ? <Users className="w-5 h-5 text-brand-accent" /> : <User className="w-5 h-5 text-brand-accent" />}
                                </div>
                                <h3 className="font-bold text-brand-text truncate">
                                    {selectedContact.type === 'class' ? selectedContact.name : `${selectedContact.firstName} ${selectedContact.lastName}`}
                                </h3>
                             </div>
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
        </div>
    );
};

export default Chat;
