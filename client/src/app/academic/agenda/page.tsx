import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Share2, 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen, 
  GraduationCap, 
  FileText, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ListFilter,
  LayoutGrid,
  Zap,
  CalendarCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'COMPOSITION' | 'EVALUATION' | 'DEVOIR' | 'DEVOIR_NIVEAU' | 'EXAMEN' | 'REUNION' | 'TRIMESTRE' | string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  description?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  className?: string | null;
  subjectName?: string | null;
  link?: string;
  isOpen?: boolean;
  coefficient?: number;
  timeLimit?: number | null;
  assignmentId?: string | null;
  quizId?: string | null;
}

interface NiveauItem {
  id: string;
  nom: string;
}

const TYPE_LABELS: Record<string, string> = {
  COMPOSITION: 'Composition',
  EVALUATION: 'Évaluation',
  DEVOIR: 'Devoir',
  DEVOIR_NIVEAU: 'Devoir de Niveau',
  EXAMEN: 'Examen',
  REUNION: 'Réunion',
  TRIMESTRE: 'Trimestre',
};

const Agenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [allUpcomingEvents, setAllUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LIST'>('CALENDAR');
  const [niveauxList, setNiveauxList] = useState<NiveauItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch available Niveaux
  useEffect(() => {
    const fetchNiveaux = async () => {
      try {
        const res = await api.get('/niveaux');
        if (Array.isArray(res.data)) {
          setNiveauxList(res.data);
        }
      } catch (err) {
        console.error('Error fetching niveaux', err);
      }
    };
    fetchNiveaux();
  }, []);

  // Fetch calendar events for current month and wider range for upcoming
  useEffect(() => {
    fetchAgenda();
  }, [currentDate, user]);

  const fetchAgenda = async () => {
    try {
      setLoading(true);
      // Fetch for current month view
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      // Also fetch broader range for upcoming events list
      const broadStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1, 0, 0, 0, 0).toISOString();
      const broadEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 6, 0, 23, 59, 59, 999).toISOString();

      const [resMonth, resBroad] = await Promise.all([
        api.get('/calendar', { params: { startDate: start, endDate: end } }),
        api.get('/calendar', { params: { startDate: broadStart, endDate: broadEnd } })
      ]);

      setEvents(resMonth.data?.events || []);
      setAllUpcomingEvents(resBroad.data?.events || []);
    } catch (error) {
      console.error('Error fetching calendar events', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter events based on level and type
  const filterList = (list: CalendarEvent[]) => {
    return list.filter(e => {
      if (selectedLevel) {
        const matchLevel = e.className?.toLowerCase().includes(selectedLevel.toLowerCase());
        if (!matchLevel) return false;
      }
      if (selectedType !== 'ALL') {
        if (selectedType === 'DEVOIRS' && !['DEVOIR', 'DEVOIR_NIVEAU'].includes(e.type)) return false;
        if (selectedType === 'COMPOSITIONS' && !['COMPOSITION', 'EVALUATION'].includes(e.type)) return false;
        if (selectedType === 'EXAMENS' && e.type !== 'EXAMEN') return false;
        if (selectedType === 'REUNIONS' && e.type !== 'REUNION') return false;
      }
      return true;
    });
  };

  const filteredEvents = useMemo(() => filterList(events), [events, selectedLevel, selectedType]);
  const filteredAllEvents = useMemo(() => filterList(allUpcomingEvents), [allUpcomingEvents, selectedLevel, selectedType]);

  // Dynamic school months (current and surrounding months)
  const dynamicMonths = useMemo(() => {
    const months = [];
    const base = new Date();
    for (let offset = -1; offset <= 5; offset++) {
      const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
      const isCurrentMonth = d.getMonth() === base.getMonth() && d.getFullYear() === base.getFullYear();
      const monthLabel = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      months.push({
        label: `${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}${isCurrentMonth ? ' (En cours)' : ''}`,
        month: d.getMonth(),
        year: d.getFullYear()
      });
    }
    return months;
  }, []);

  // Today's events
  const todayEvents = useMemo(() => {
    const now = new Date();
    return allUpcomingEvents.filter(e => {
      const targetStr = e.endDate || e.startDate;
      if (!targetStr) return false;
      const d = new Date(targetStr);
      return d.getDate() === now.getDate() && 
             d.getMonth() === now.getMonth() && 
             d.getFullYear() === now.getFullYear();
    });
  }, [allUpcomingEvents]);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const today = () => setCurrentDate(new Date());

  const jumpToMonth = (monthIdx: number, year: number) => {
    setCurrentDate(new Date(year, monthIdx, 1));
    setViewMode('CALENDAR');
  };

  const shareAgenda = () => {
    if (filteredEvents.length === 0) return;
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    const title = `Agenda Scolaire ${selectedLevel ? `- ${selectedLevel} ` : ''}- ${monthYear}`;
    let message = `Voici le planning de l'Agenda Scolaire pour le mois de ${monthYear} :\n\n`;

    filteredEvents.forEach(a => {
      const targetDate = a.endDate || a.startDate;
      if (targetDate) {
        const date = new Date(targetDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        message += `• ${date} : ${a.title} [${TYPE_LABELS[a.type] || a.type}]${a.subjectName ? ` - ${a.subjectName}` : ''}\n`;
      }
    });

    navigate('/broadcast', { state: { prefill: { title, message } } });
  };

  const handleNavigateToEvent = (event: CalendarEvent) => {
    setSelectedEvent(null);
    if (event.link) {
      navigate(event.link);
    } else if (event.assignmentId) {
      navigate(`/academic/assignments/${event.assignmentId}`);
    } else if (event.quizId) {
      navigate(`/quizzes/${event.quizId}`);
    } else if (event.courseId) {
      navigate(`/academic/courses/${event.courseId}`);
    }
  };

  const handleNavigateToCourse = (event: CalendarEvent) => {
    setSelectedEvent(null);
    if (event.courseId) {
      navigate(`/academic/courses/${event.courseId}`);
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Lundi = 1er jour

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: startingBlankDays }, (_, i) => i);

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const todayFormatted = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <PageHeader 
            title="Agenda Scolaire"
            subtitle="Planning unifié des devoirs, devoirs de niveau, compositions, examens et réunions"
          />
        </div>

        {/* Date Navigation & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch Calendar / List */}
          <div className="flex items-center bg-brand-sidebar border border-brand-border rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'CALENDAR' 
                  ? 'bg-brand-accent text-white shadow-sm' 
                  : 'text-brand-text hover:bg-brand-border'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Vue Calendrier
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'LIST' 
                  ? 'bg-brand-accent text-white shadow-sm' 
                  : 'text-brand-text hover:bg-brand-border'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Liste des Devoirs ({filteredAllEvents.length})
            </button>
          </div>

          {/* Date Navigation Bar */}
          {viewMode === 'CALENDAR' && (
            <div className="flex items-center gap-1 bg-brand-sidebar border border-brand-border rounded-xl p-1 shadow-sm">
              <button 
                onClick={prevMonth} 
                className="p-1.5 hover:bg-brand-border rounded-lg text-brand-text transition-colors"
                title="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={today} 
                className="px-2.5 py-1 hover:bg-brand-border rounded-lg text-xs font-bold text-brand-text transition-colors"
              >
                Aujourd'hui
              </button>
              <span className="text-xs font-bold min-w-[130px] text-center text-brand-text capitalize px-1">
                {monthName}
              </span>
              <button 
                onClick={nextMonth} 
                className="p-1.5 hover:bg-brand-border rounded-lg text-brand-text transition-colors"
                title="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── TODAY HIGHLIGHT BANNER ── */}
      {todayEvents.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-brand-card to-amber-500/15 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-md shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Échéances d'Aujourd'hui ({todayFormatted})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black animate-pulse">
                  {todayEvents.length} épreuve(s)
                </span>
              </div>
              <p className="text-xs text-brand-text mt-0.5 font-bold">
                {todayEvents.map(e => `${e.title} (${e.subjectName || e.type})`).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedEvent(todayEvents[0])}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <CalendarCheck className="w-4 h-4" />
              Consulter l'épreuve du jour
            </button>
          </div>
        </div>
      )}

      {/* ── QUICK JUMP PERIODS & FILTERS ── */}
      <div className="bg-brand-card p-4 rounded-2xl border border-brand-border shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Year/Month jump pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
            <span className="text-brand-text-muted mr-1 font-semibold flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-brand-accent" />
              Mois scolaires :
            </span>
            {dynamicMonths.map(p => {
              const isSelected = currentDate.getMonth() === p.month && currentDate.getFullYear() === p.year;
              return (
                <button
                  key={`${p.year}-${p.month}`}
                  onClick={() => jumpToMonth(p.month, p.year)}
                  className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                    isSelected 
                      ? 'bg-brand-accent text-white border-brand-accent shadow-sm font-black' 
                      : 'bg-brand-sidebar hover:bg-brand-border text-brand-text border-brand-border/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {(user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR' || user?.role === 'ENSEIGNANT' || user?.role === 'SUPER_ADMIN') && (
            <Button
              variant="primary"
              onClick={shareAgenda}
              disabled={filteredEvents.length === 0}
              leftIcon={<Share2 className="w-4 h-4" />}
              className="text-xs font-bold"
            >
              Partager l'agenda ({filteredEvents.length})
            </Button>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-brand-border/40">
          {/* Niveau Filter */}
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-brand-sidebar p-2 rounded-lg border border-brand-border shrink-0">
              <GraduationCap className="w-4 h-4 text-brand-accent" />
            </div>
            <select 
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-brand-sidebar border border-brand-border text-brand-text text-xs font-bold rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent p-2 outline-none"
            >
              <option value="">Tous les niveaux scolaires</option>
              {niveauxList.map(n => (
                <option key={n.id} value={n.nom}>{n.nom}</option>
              ))}
              {niveauxList.length === 0 && (
                <>
                  <option value="6ème">6ème</option>
                  <option value="5ème">5ème</option>
                  <option value="4ème">4ème</option>
                  <option value="3ème">3ème</option>
                  <option value="2nde">2nde</option>
                  <option value="1ère">1ère</option>
                  <option value="Terminale">Terminale</option>
                </>
              )}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 flex-1">
            <div className="bg-brand-sidebar p-2 rounded-lg border border-brand-border shrink-0">
              <Filter className="w-4 h-4 text-brand-accent" />
            </div>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-brand-sidebar border border-brand-border text-brand-text text-xs font-bold rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-transparent p-2 outline-none"
            >
              <option value="ALL">Tous les types d'épreuves</option>
              <option value="DEVOIRS">Devoirs & Devoirs de niveau</option>
              <option value="COMPOSITIONS">Compositions & Évaluations</option>
              <option value="EXAMENS">Examens</option>
              <option value="REUNIONS">Réunions</option>
            </select>
          </div>

          {/* Counter pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-sidebar rounded-lg border border-brand-border text-xs font-bold text-brand-text shrink-0 self-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {viewMode === 'CALENDAR' ? `${filteredEvents.length} ce mois` : `${filteredAllEvents.length} devoirs au total`}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (CALENDAR OR LIST VIEW) ── */}
      {viewMode === 'CALENDAR' ? (
        <div className="bg-brand-card rounded-2xl shadow-lg border border-brand-border overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-32 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
              <p className="text-sm font-bold text-brand-text-muted">Chargement de l'Agenda Scolaire...</p>
            </div>
          ) : (
            <div className="p-4 bg-brand-bg/50">
              {/* Days header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                  <div key={d} className="text-center font-black text-brand-text-muted text-xs uppercase tracking-wider py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Cells */}
              <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                {blanks.map(b => (
                  <div key={`blank-${b}`} className="min-h-[125px] bg-brand-bg/20 border border-brand-border/30 rounded-xl opacity-40"></div>
                ))}
                
                {days.map(day => {
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  
                  const dayEvents = filteredEvents.filter(e => {
                    const dEnd = e.endDate ? new Date(e.endDate) : null;
                    const dStart = e.startDate ? new Date(e.startDate) : null;

                    // Match if due date is this day
                    if (dEnd && 
                        dEnd.getDate() === day && 
                        dEnd.getMonth() === currentDate.getMonth() && 
                        dEnd.getFullYear() === currentDate.getFullYear()) {
                      return true;
                    }
                    // Or if start date is this day (and no end date, or start date differs from end date)
                    if (dStart && 
                        dStart.getDate() === day && 
                        dStart.getMonth() === currentDate.getMonth() && 
                        dStart.getFullYear() === currentDate.getFullYear()) {
                      return true;
                    }
                    // For period events like TRIMESTRE
                    if (e.type === 'TRIMESTRE' && dStart && dEnd) {
                      const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
                      return cellDate >= dStart && cellDate <= dEnd;
                    }
                    return false;
                  });

                  return (
                    <div 
                      key={day} 
                      className={`min-h-[125px] bg-brand-card border rounded-xl p-2 transition-all flex flex-col justify-between ${
                        isToday 
                          ? 'border-brand-accent ring-2 ring-brand-accent/50 shadow-md bg-brand-accent/5' 
                          : 'border-brand-border hover:border-brand-accent/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-brand-accent text-white shadow-sm ring-2 ring-brand-accent/40' : 'text-brand-text-muted'
                        }`}>
                          {day}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-brand-sidebar text-brand-accent border border-brand-border">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1.5 overflow-y-auto max-h-[140px] custom-scrollbar flex-1">
                        {dayEvents.map(event => (
                          <div 
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="text-[11px] p-2 rounded-lg border shadow-sm cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all group"
                            style={{ 
                              backgroundColor: `${event.color}14`, 
                              borderColor: `${event.color}50`, 
                              color: event.color 
                            }}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-black truncate text-[11px]">
                                {event.subjectName || TYPE_LABELS[event.type] || event.type}
                              </span>
                              {event.endDate && (
                                <span className="flex items-center text-[10px] opacity-85 shrink-0 ml-1 font-bold">
                                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                                  {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-[10.5px] truncate opacity-95 group-hover:underline">
                              {event.title}
                            </div>
                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-current/15 text-[9.5px] opacity-85">
                              <span className="truncate font-semibold">{event.className || 'Tous'}</span>
                              <span className="font-extrabold shrink-0">{TYPE_LABELS[event.type] || event.type}</span>
                            </div>
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
      ) : (
        /* ── LIST VIEW OF ALL DEVOIRS & ÉVALUATIONS ── */
        <div className="space-y-4">
          <div className="bg-brand-card rounded-2xl border border-brand-border p-4 shadow-sm">
            <h3 className="font-black text-sm text-brand-text mb-3 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-brand-accent" />
              Toutes les échéances programmées ({filteredAllEvents.length})
            </h3>

            {filteredAllEvents.length === 0 ? (
              <p className="text-xs text-brand-text-muted italic py-6 text-center">
                Aucun devoir programmé correspondant à vos filtres.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAllEvents.map(event => {
                  const targetDateStr = event.endDate || event.startDate;
                  const dateObj = targetDateStr ? new Date(targetDateStr) : null;
                  const now = new Date();
                  const isToday = dateObj && dateObj.toDateString() === now.toDateString();
                  const isPast = dateObj && dateObj < now && !isToday;

                  return (
                    <div 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="p-4 rounded-2xl bg-brand-sidebar border border-brand-border hover:border-brand-accent/50 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span 
                            className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase border"
                            style={{ 
                              backgroundColor: `${event.color}15`, 
                              borderColor: `${event.color}40`, 
                              color: event.color 
                            }}
                          >
                            {TYPE_LABELS[event.type] || event.type}
                          </span>

                          {isToday ? (
                            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[10px] font-black animate-pulse">
                              Aujourd'hui !
                            </span>
                          ) : isPast ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-500/10 text-brand-text-muted text-[10px] font-bold">
                              Passé
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              À venir
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-sm text-brand-text group-hover:text-brand-accent transition-colors leading-snug">
                          {event.title}
                        </h4>

                        <p className="text-xs font-semibold text-brand-text-muted">
                          {event.subjectName ? `${event.subjectName}` : ''} {event.className ? `• ${event.className}` : ''}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-brand-border/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-brand-text font-bold">
                          <Clock className="w-3.5 h-3.5 text-brand-accent" />
                          <span>
                            {dateObj ? dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Non définie'}
                          </span>
                        </div>

                        <span className="text-brand-accent font-extrabold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Détails
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* ── LÉGENDE DES COULEURS ── */}
      <div className="flex flex-wrap gap-4 items-center bg-brand-card p-4 rounded-xl border border-brand-border shadow-sm">
        <span className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Légende des épreuves :</span>
        {[
          { label: 'Composition', color: '#6366f1' },
          { label: 'Évaluation', color: '#ef4444' },
          { label: 'Devoir de classe', color: '#f97316' },
          { label: 'Devoir de Niveau', color: '#8b5cf6' },
          { label: 'Examen officiel', color: '#1d4ed8' },
          { label: 'Réunion', color: '#3b82f6' },
          { label: 'Trimestre', color: '#10b981' }
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: l.color }}></div>
            <span className="text-xs font-bold text-brand-text">{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── MODAL INTERACTIF : DÉTAILS DE L'ÉVÉNEMENT / REDIRECTION ── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-brand-card border border-brand-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div 
              className="p-6 text-white relative overflow-hidden"
              style={{ backgroundColor: selectedEvent.color || '#065f46' }}
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                {TYPE_LABELS[selectedEvent.type] || selectedEvent.type}
              </div>

              <h2 className="text-xl font-bold leading-snug drop-shadow-sm">
                {selectedEvent.title}
              </h2>

              <p className="text-xs opacity-90 mt-1 font-semibold">
                {selectedEvent.subjectName ? `Matière : ${selectedEvent.subjectName}` : ''} {selectedEvent.className ? `• Classe/Niveau : ${selectedEvent.className}` : ''}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 bg-brand-card">
              {/* Informations Clés */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-brand-sidebar rounded-xl border border-brand-border">
                  <span className="text-[11px] font-bold text-brand-text-muted block mb-0.5">Date & Échéance</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-brand-text">
                    <Clock className="w-3.5 h-3.5 text-brand-accent" />
                    {selectedEvent.endDate ? (
                      <span>{new Date(selectedEvent.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    ) : (
                      <span>Non définie</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-brand-sidebar rounded-xl border border-brand-border">
                  <span className="text-[11px] font-bold text-brand-text-muted block mb-0.5">Coefficient & Durée</span>
                  <div className="text-xs font-bold text-brand-text">
                    Coeff: {selectedEvent.coefficient || 1} {selectedEvent.timeLimit ? `• ${selectedEvent.timeLimit} min` : ''}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="p-3.5 bg-brand-sidebar rounded-xl border border-brand-border">
                  <span className="text-[11px] font-bold text-brand-text-muted block mb-1">Consignes & Détails</span>
                  <p className="text-xs text-brand-text leading-relaxed whitespace-pre-line">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Actions de redirection */}
              <div className="pt-3 border-t border-brand-border flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleNavigateToEvent(selectedEvent)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Accéder à l'épreuve / au devoir
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {selectedEvent.courseId && (
                  <button
                    onClick={() => handleNavigateToCourse(selectedEvent)}
                    className="px-4 py-2.5 rounded-xl bg-brand-sidebar hover:bg-brand-border border border-brand-border text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <BookOpen className="w-4 h-4 text-brand-accent" />
                    Voir le cours
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
