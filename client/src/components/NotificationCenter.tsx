import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, X, CheckCheck } from 'lucide-react';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.read).length);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      const notif = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => api.patch(`/notifications/${n.id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 text-slate-600 hover:text-slate-900 focus:outline-none"
        style={{
          background: isOpen ? '#E2E8F0' : '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
        }}
      >
        <Bell className="w-4.5 h-4.5" style={{ width: '1.125rem', height: '1.125rem' }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 text-[9px] font-black text-white rounded-full flex items-center justify-center px-1"
            style={{ background: '#10B981', boxShadow: '0 2px 6px rgba(16,185,129,0.4)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-84 animate-fade-in-down origin-top-right z-50 overflow-hidden rounded-2xl"
          style={{
            width: '21rem',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.15)',
          }}
        >
          {/* Gradient top line */}
          <div className="h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #10B981, #06B6D4, transparent)' }} />

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #F1F5F9' }}
          >
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Notifications</h3>
              {unreadCount > 0 && (
                <span className="chip chip-brand text-[9px] px-2 py-0.5">{unreadCount} nouvelles</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#189CD8] transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Tout est à jour</p>
                  <p className="text-xs text-slate-400 mt-1">Aucune notification</p>
                </div>
              </div>
            ) : (
              <ul>
                {notifications.map((n, idx) => (
                  <li
                    key={n.id}
                    className="group cursor-pointer transition-colors"
                    style={{
                      background: !n.read ? 'rgba(24,156,216,0.06)' : '#FFFFFF',
                      borderBottom: idx < notifications.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}
                    onClick={() => !n.read && markAsRead(n.id)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = !n.read ? 'rgba(24,156,216,0.06)' : '#FFFFFF'; }}
                  >
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#189CD8]"
                              style={{ marginTop: '0.4rem' }} />
                          )}
                          <span className={`text-sm font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </span>
                        </div>
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 ml-3.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-2 ml-3.5">
                        {new Date(n.createdAt).toLocaleDateString('fr-FR')} · {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
