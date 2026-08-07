import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight, Filter, Share2, Loader2, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  description?: string;
  subjectName?: string;
  className?: string;
  link?: string;
  isOpen?: boolean;
}

const Agenda = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [view, setView] = useState<'month' | 'week'>('month');

    const levels = ['6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TERMINALE'];

    useEffect(() => {
        fetchAgenda();
    }, [currentDate, selectedLevel, user]);

    const fetchAgenda = async () => {
        try {
            setLoading(true);
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
            
            const response = await api.get('/calendar', {
                params: {
                    startDate: start,
                    endDate: end
                }
            });
            // Si on a sélectionné un niveau, on filtre côté client pour l'instant (ou on peut l'envoyer au backend si implémenté)
            let fetchedEvents = response.data.events;
            if (selectedLevel) {
                fetchedEvents = fetchedEvents.filter((e: CalendarEvent) => e.className === selectedLevel || e.className?.includes(selectedLevel));
            }
            setEvents(fetchedEvents);
        } catch (error) {
            console.error("Error fetching calendar events", error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const today = () => setCurrentDate(new Date());

    const shareAgenda = () => {
        if (events.length === 0) return;
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        const title = `Agenda ${selectedLevel ? `- ${selectedLevel} ` : ''}- ${monthYear}`;
        let message = `Voici l'agenda pour le mois de ${monthYear} :\n\n`;
        
        events.forEach(a => {
            if (a.endDate) {
                const date = new Date(a.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                message += `- ${date} : ${a.title} (${a.type})\n`;
            }
        });

        navigate('/broadcast', { state: { prefill: { title, message } } });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Lundi = 1er jour

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: startingBlankDays }, (_, i) => i);

    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
        e.dataTransfer.setData('eventId', event.id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Nécessaire pour autoriser le drop
    };

    const handleDrop = async (e: React.DragEvent, day: number) => {
        e.preventDefault();
        const eventId = e.dataTransfer.getData('eventId');
        if (!eventId || !['SUPER_ADMIN', 'ENSEIGNANT', 'DIRECTEUR'].includes(user?.role || '')) return;

        const droppedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0).toISOString();
        
        // Mettre à jour l'UI de façon optimiste
        setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, endDate: droppedDate } : ev));

        // Note: L'API de mise à jour des dates n'est pas complètement unifiée.
        // Un switch sur event.type serait nécessaire pour appeler la bonne route.
        // alert(`L'événement ${eventId} a été déplacé au ${droppedDate}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <PageHeader 
                        title="Calendrier Académique"
                        subtitle="Vue interactive des évaluations, devoirs et réunions"
                    />
                </div>

                <div className="flex items-center gap-2 bg-brand-sidebar border border-brand-border rounded-xl p-1 shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-brand-border rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-brand-text" />
                    </button>
                    <button onClick={today} className="px-3 py-1 hover:bg-brand-border rounded-lg text-sm font-medium text-brand-text transition-colors">
                        Aujourd'hui
                    </button>
                    <span className="text-sm font-bold min-w-[140px] text-center text-brand-text capitalize">
                        {monthName}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-brand-border rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5 text-brand-text" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-brand-card p-4 rounded-xl border border-brand-border shadow-lg">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-brand-sidebar p-2 rounded-lg border border-brand-border">
                        <Filter className="w-5 h-5 text-brand-accent" />
                    </div>
                    <select 
                        value={selectedLevel}
                        onChange={(e) => setSelectedLevel(e.target.value)}
                        className="flex-1 sm:w-64 bg-brand-bg border border-brand-border text-brand-text text-sm rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent p-2.5 outline-none transition-all appearance-none font-medium"
                    >
                        <option value="">Tous les niveaux</option>
                        {levels.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
                
                {(user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR' || user?.role === 'ENSEIGNANT') && (
                    <Button
                        variant="primary"
                        onClick={shareAgenda}
                        disabled={events.length === 0}
                        leftIcon={<Share2 className="w-4 h-4" />}
                        className="w-full sm:w-auto"
                    >
                        Partager l'agenda
                    </Button>
                )}
            </div>

            <div className="bg-brand-card rounded-2xl shadow-lg border border-brand-border overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-32">
                        <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
                    </div>
                ) : (
                    <div className="p-4 bg-brand-bg/50">
                        {/* En-têtes des jours */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                                <div key={d} className="text-center font-bold text-brand-text-muted text-xs uppercase tracking-wider py-2">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grille du calendrier */}
                        <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                            {blanks.map(b => (
                                <div key={`blank-${b}`} className="min-h-[120px] bg-brand-bg/30 border border-brand-border/50 rounded-xl"></div>
                            ))}
                            
                            {days.map(day => {
                                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const isToday = new Date().toDateString() === dateObj.toDateString();
                                
                                const dayEvents = events.filter(e => {
                                    if (!e.endDate) return false;
                                    const d = new Date(e.endDate);
                                    return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                                });

                                return (
                                    <div 
                                        key={day} 
                                        className={`min-h-[120px] bg-brand-card border rounded-xl p-2 transition-all ${isToday ? 'border-brand-accent ring-1 ring-brand-accent shadow-sm' : 'border-brand-border hover:border-brand-accent/50'}`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day)}
                                    >
                                        <div className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 ${isToday ? 'bg-brand-accent text-white' : 'text-brand-text-muted'}`}>
                                            {day}
                                        </div>
                                        
                                        <div className="space-y-1.5 overflow-y-auto max-h-[150px] custom-scrollbar">
                                            {dayEvents.map(event => (
                                                <div 
                                                    key={event.id}
                                                    draggable={['SUPER_ADMIN', 'ENSEIGNANT', 'DIRECTEUR'].includes(user?.role || '')}
                                                    onDragStart={(e) => handleDragStart(e, event)}
                                                    className="text-[10px] p-1.5 rounded-md border shadow-sm cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity"
                                                    style={{ backgroundColor: `${event.color}15`, borderColor: `${event.color}40`, color: event.color }}
                                                >
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-bold truncate">{event.subjectName || event.type}</span>
                                                        {event.endDate && (
                                                            <span className="flex items-center opacity-70">
                                                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                                                {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="font-medium truncate opacity-90">{event.title}</div>
                                                    {event.className && <div className="mt-0.5 opacity-70 text-[9px] truncate">{event.className}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Légende */}
            <div className="flex flex-wrap gap-4 items-center bg-brand-card p-4 rounded-xl border border-brand-border shadow-sm">
                <span className="text-sm font-bold text-brand-text-muted">Légende :</span>
                {[
                    { label: 'Évaluation', color: '#ef4444' },
                    { label: 'Devoir', color: '#f97316' },
                    { label: 'Devoir de Niveau', color: '#8b5cf6' },
                    { label: 'Examen', color: '#1d4ed8' },
                    { label: 'Réunion', color: '#3b82f6' },
                    { label: 'Trimestre', color: '#10b981' }
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}></div>
                        <span className="text-xs font-medium text-brand-text">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Agenda;
