'use client';

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, School as SchoolIcon, User, BookOpen, Users, MapPin, Phone, Mail, Edit2 } from 'lucide-react';

interface SchoolDetail {
  id: string;
  name: string;
  code: string;
  address?: string;
  ville?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  users?: any[];
  classes?: any[];
}

export default function SchoolDetailsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const schoolId = params.id as string;
  
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const response = await api.get(`/schools/${schoolId}`);
        setSchool(response.data);
      } catch (error) {
        console.error('Error fetching school details:', error);
        alert('Impossible de charger les détails de l\'établissement.');
        navigate('/admin/schools');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (schoolId) fetchSchool();
  }, [schoolId, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/admin/schools" className="p-2 hover:bg-brand-sidebar rounded-lg transition-colors text-brand-text-muted hover:text-brand-text">
              <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand-sidebar rounded-2xl flex items-center justify-center border border-brand-border">
                  <SchoolIcon className="w-7 h-7 text-brand-accent" />
              </div>
              <div>
                  <h1 className="text-2xl font-bold text-brand-text">{school.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${school.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {school.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <span className="text-sm text-brand-text-muted">Code: {school.code}</span>
                  </div>
              </div>
          </div>
        </div>

        <Link to={`/admin/schools/${school.id}/edit`}>
            <Button variant="outline" leftIcon={<Edit2 className="w-4 h-4" />}>
                Modifier
            </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLONNE GAUCHE: INFOS & DIRECTION */}
          <div className="lg:col-span-1 space-y-6">
              
              {/* CONTACT & LOCALISATION */}
              <div className="bg-brand-card rounded-2xl p-6 border border-brand-border shadow-lg">
                  <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider mb-4 border-b border-brand-border pb-2">Informations</h3>
                  <div className="space-y-4">
                      {school.ville && (
                          <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-brand-text-muted shrink-0 mt-0.5" />
                              <div>
                                  <p className="text-sm text-brand-text">{school.ville}</p>
                                  {school.address && <p className="text-xs text-brand-text-muted mt-0.5">{school.address}</p>}
                              </div>
                          </div>
                      )}
                      {school.phone && (
                          <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-brand-text-muted shrink-0" />
                              <p className="text-sm text-brand-text">{school.phone}</p>
                          </div>
                      )}
                      {school.email && (
                          <div className="flex items-center gap-3">
                              <Mail className="w-5 h-5 text-brand-text-muted shrink-0" />
                              <p className="text-sm text-brand-text">{school.email}</p>
                          </div>
                      )}
                      <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-brand-text-muted shrink-0" />
                          <p className="text-sm text-brand-text">Créée le {new Date(school.createdAt).toLocaleDateString('fr-FR')}</p>
                      </div>
                  </div>
              </div>

              {/* DIRECTION */}
              <div className="bg-brand-card rounded-2xl p-6 border border-brand-border shadow-lg">
                  <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider mb-4 border-b border-brand-border pb-2">Direction</h3>
                  {school.manager ? (
                      <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                              <User className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                              <p className="text-brand-text font-bold">{school.manager.firstName} {school.manager.lastName}</p>
                              <p className="text-sm text-brand-text-muted">{school.manager.email}</p>
                              {school.manager.phone && (
                                  <p className="text-sm text-brand-text-muted mt-1">{school.manager.phone}</p>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-4 bg-brand-sidebar rounded-xl border border-dashed border-brand-border">
                          <p className="text-sm text-brand-text-muted">Aucun directeur assigné</p>
                      </div>
                  )}
              </div>
          </div>

          {/* COLONNE DROITE: METRIQUES & LISTES */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* METRIQUES */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-brand-card rounded-2xl p-5 border border-brand-border shadow-lg flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-3">
                          <Users className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-brand-text">{school.users?.length || 0}</p>
                      <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mt-1">Membres (Total)</p>
                  </div>

                  <div className="bg-brand-card rounded-2xl p-5 border border-brand-border shadow-lg flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-3">
                          <BookOpen className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-brand-text">{school.classes?.length || 0}</p>
                      <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider mt-1">Classes</p>
                  </div>
              </div>

              {/* LISTE CLASSES */}
              <div className="bg-brand-card rounded-2xl p-6 border border-brand-border shadow-lg">
                  <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider mb-4 border-b border-brand-border pb-2">Classes ({school.classes?.length || 0})</h3>
                  {school.classes && school.classes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {school.classes.map((cls: any) => (
                              <div key={cls.id} className="p-3 bg-brand-sidebar rounded-xl border border-brand-border flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-brand-accent/20 rounded-lg flex items-center justify-center text-brand-accent shrink-0">
                                          <BookOpen className="w-4 h-4" />
                                      </div>
                                      <p className="text-sm font-bold text-brand-text">{cls.name}</p>
                                  </div>
                                  <div className="text-xs font-medium bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md border border-blue-500/20 whitespace-nowrap">
                                      {cls._count?.enrollments || 0} élève(s)
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-10 bg-brand-sidebar rounded-xl border border-dashed border-brand-border">
                          <p className="text-brand-text-muted">Aucune classe n'a encore été créée pour cette école.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
}
