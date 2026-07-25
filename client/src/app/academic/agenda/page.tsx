import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Calendar, ChevronLeft, ChevronRight, Clock, Filter, Share2, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';

interface Assignment {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    course: {
        id: string;
        subject: { name: string };
        class: { name: string; level: string };
    };
}

const Agenda = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    const levels = ['6EME', '5EME', '4EME', '3EME', '2NDE', '1ERE', 'TERMINALE'];

    useEffect(() => {
        if (selectedLevel) {
            fetchAgenda();
        } else {
            setLoading(false);
        }
    }, [currentDate, selectedLevel, user]);

    const fetchAgenda = async () => {
        try {
            setLoading(true);
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();
            
            const response = await api.get('/assignments/agenda', {
                params: {
                    level: selectedLevel,
                    startDate: start,
                    endDate: end
                }
            });
            setAssignments(response.data);
        } catch (error) {
            console.error("Error fetching agenda", error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const shareAgenda = () => {
        if (!selectedLevel || assignments.length === 0) return;

        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        const title = `Agenda des devoirs - ${selectedLevel} - ${monthYear}`;
        let message = `Voici l'agenda des devoirs pour le mois de ${monthYear} (Niveau ${selectedLevel}) :\n\n`;
        
        assignments.forEach(a => {
            const date = new Date(a.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
            message += `- ${date} : ${a.title} (${a.course.subject.name})\n`;
        });

        navigate('/broadcast', { state: { prefill: { title, message } } });
    };

    const getAssignmentsByDate = (date: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
        return assignments.filter(a => {
            const d = new Date(a.dueDate);
            return d.getDate() === date && 
                   d.getMonth() === checkDate.getMonth() && 
                   d.getFullYear() === checkDate.getFullYear();
        });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <PageHeader 
                        title="Agenda des Devoirs"
                        subtitle="Vue mensuelle des devoirs et évaluations par niveau"
                    />
                </div>

                <div className="flex items-center gap-2 bg-brand-sidebar border border-brand-border rounded-xl p-1 shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-brand-border rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5 text-brand-text" />
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
                        <option value="">Sélectionner un niveau...</option>
                        {levels.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </div>
                
                {(user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR') && (
                    <Button
                        variant="primary"
                        onClick={shareAgenda}
                        disabled={!selectedLevel || assignments.length === 0}
                        leftIcon={<Share2 className="w-4 h-4" />}
                        className="w-full sm:w-auto"
                    >
                        Partager l'agenda
                    </Button>
                )}
            </div>

            {!selectedLevel ? (
                <div className="text-center py-20 bg-brand-card rounded-2xl border border-dashed border-brand-border">
                    <Filter className="w-12 h-12 text-brand-border mx-auto mb-4" />
                    <p className="text-brand-text-muted font-medium">Veuillez sélectionner un niveau pour voir l'agenda mensuel</p>
                </div>
            ) : (
                <div className="bg-brand-card rounded-2xl shadow-lg border border-brand-border overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center py-32">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-accent" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 bg-brand-bg/50">
                            {days.map(day => {
                                const dayAssignments = getAssignmentsByDate(day);
                                if (dayAssignments.length === 0) return null;
                                
                                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

                                return (
                                    <div key={day} className="bg-brand-card border border-brand-border rounded-xl p-4 shadow-sm hover:shadow-brand-accent/5 transition-all">
                                        <div className="text-sm font-bold text-brand-text-muted mb-3 uppercase tracking-wider flex items-center gap-2 border-b border-brand-border pb-2">
                                            <span className="w-8 h-8 rounded-lg bg-brand-sidebar flex items-center justify-center text-brand-text font-bold border border-brand-border">
                                                {day}
                                            </span>
                                            {dayName.split(' ')[0]}
                                        </div>
                                        <div className="space-y-3">
                                            {dayAssignments.map(assignment => (
                                                <Link 
                                                    to={`/assignments/${assignment.id}`} 
                                                    key={assignment.id}
                                                    className="block bg-brand-sidebar p-3 rounded-xl border border-transparent hover:border-brand-accent transition-all group"
                                                >
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className="text-[10px] font-bold text-brand-accent uppercase tracking-wider bg-brand-accent/10 px-2 py-0.5 rounded-full border border-brand-accent/20">
                                                            {assignment.course.subject.name}
                                                        </span>
                                                        <span className="text-xs font-medium text-brand-text-muted flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(assignment.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-brand-text group-hover:text-brand-accent transition-colors line-clamp-2 leading-snug">
                                                        {assignment.title}
                                                    </h4>
                                                    <div className="mt-2 text-xs font-medium text-brand-text-muted bg-brand-bg px-2 py-1 rounded inline-block">
                                                        Classe : {assignment.course.class.name}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {assignments.length === 0 && (
                                <div className="col-span-full text-center py-20 bg-brand-card rounded-xl border border-dashed border-brand-border">
                                    <Calendar className="w-12 h-12 text-brand-border mx-auto mb-4" />
                                    <p className="text-brand-text font-medium">Aucun devoir programmé pour ce mois.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Agenda;
