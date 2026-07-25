import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Video, Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function Meetings() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const { data } = await api.get('/meetings');
      setMeetings(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Réunions & Classes Virtuelles" 
        subtitle="Gérez vos sessions en direct"
        icon={<Video className="w-8 h-8" />}
        action={
            (user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTEUR' || user?.role === 'ENSEIGNANT') ? (
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Nouvelle Réunion
                </Button>
            ) : null
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 ? (
            <div className="col-span-full text-center py-12 text-brand-text-muted bg-brand-card rounded-xl border border-brand-border/50">
                Aucune réunion programmée.
            </div>
        ) : meetings.map(meeting => (
          <div key={meeting.id} className="bg-brand-card border border-brand-border/50 rounded-xl p-5 hover:border-brand-accent/50 transition-all">
            <h3 className="font-bold text-lg text-brand-text mb-2">{meeting.title}</h3>
            <div className="space-y-2 text-sm text-brand-text-muted mb-4">
                <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-accent"/> {new Date(meeting.startTime).toLocaleDateString()}</p>
                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-brand-accent"/> {new Date(meeting.startTime).toLocaleTimeString()} - {new Date(meeting.endTime).toLocaleTimeString()}</p>
            </div>
            {meeting.link && (
                <Button variant="secondary" className="w-full" onClick={() => window.open(meeting.link, '_blank')}>
                    Rejoindre
                </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
