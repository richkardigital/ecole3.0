import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Send, Users, School, Globe, UserCheck, CheckSquare, Square } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface BroadcastForm {
  title: string;
  message: string;
}

interface SchoolData {
  id: string;
  name: string;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  school?: { name: string };
}

type TargetType = 'GLOBAL' | 'SPECIFIC_SCHOOLS' | 'SPECIFIC_ADMINS' | 'ROLE_BASED' | 'SPECIFIC_USERS';

const Broadcast = () => {
  const { user } = useAuth();
  const { toast, success, error } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BroadcastForm>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for targeting logic
  const [targetType, setTargetType] = useState<TargetType>('GLOBAL');
  const [targetRoles, setTargetRoles] = useState<string[]>(['ALL']); // For School Admins & Educators
  
  // Data lists
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [admins, setAdmins] = useState<UserData[]>([]);
  
  // Selections
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Loading states
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR') {
        setTargetType('ROLE_BASED');
        setTargetRoles(['ALL']);
        // Fetch classes for school admin/educator
        const fetchClasses = async () => {
            try {
                await api.get('/classes');
            } catch (err) {
                console.error("Error fetching classes", err);
            }
        };
        fetchClasses();
    }
  }, [user]);

  // Fetch users when a class is selected
  useEffect(() => {
    const fetchClassUsers = async () => {
        if (!selectedClassId) {
            return;
        }
        setLoadingData(true);
        try {
            await api.get(`/classes/${selectedClassId}/students`);
        } catch (err) {
            console.error("Error fetching class users", err);
        } finally {
            setLoadingData(false);
        }
    };
    fetchClassUsers();
  }, [selectedClassId]);

  // Fetch data based on selection (Super Admin)
  useEffect(() => {
    const fetchData = async () => {
        if (user?.role !== 'SUPER_ADMIN') return;

        if (targetType === 'SPECIFIC_SCHOOLS' && schools.length === 0) {
            setLoadingData(true);
            try {
                const res = await api.get('/schools');
                setSchools(res.data);
            } catch (err) {
                console.error("Error fetching schools", err);
            } finally {
                setLoadingData(false);
            }
        }

        if (targetType === 'SPECIFIC_ADMINS' && admins.length === 0) {
            setLoadingData(true);
            try {
                const res = await api.get('/users?role=SCHOOL_ADMIN');
                setAdmins(res.data);
            } catch (err) {
                console.error("Error fetching admins", err);
            } finally {
                setLoadingData(false);
            }
        }
    };

    fetchData();
  }, [targetType, user, schools.length, admins.length]);

  const toggleSchoolSelection = (id: string) => {
    setSelectedSchoolIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAdminSelection = (id: string) => {
    setSelectedAdminIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllSchools = () => {
      if (selectedSchoolIds.length === schools.length) setSelectedSchoolIds([]);
      else setSelectedSchoolIds(schools.map(s => s.id));
  };

  const selectAllAdmins = () => {
      if (selectedAdminIds.length === admins.length) setSelectedAdminIds([]);
      else setSelectedAdminIds(admins.map(a => a.id));
  };

  const toggleRoleSelection = (role: string) => {
      if (role === 'ALL') {
          setTargetRoles(['ALL']);
          return;
      }

      setTargetRoles(prev => {
          const newRoles = prev.filter(r => r !== 'ALL');
          if (newRoles.includes(role)) {
              const filtered = newRoles.filter(r => r !== role);
              return filtered.length === 0 ? ['ALL'] : filtered;
          } else {
              return [...newRoles, role];
          }
      });
  };

  const onSubmit = async (data: BroadcastForm) => {
    setIsSubmitting(true);
    setIsSubmitting(true);

    // Validation
    if (user?.role === 'SUPER_ADMIN') {
        if (targetType === 'SPECIFIC_SCHOOLS' && selectedSchoolIds.length === 0) {
            error("Veuillez sélectionner au moins une école.");
            setIsSubmitting(false);
            return;
        }
        if (targetType === 'SPECIFIC_ADMINS' && selectedAdminIds.length === 0) {
            error("Veuillez sélectionner au moins un administrateur.");
            setIsSubmitting(false);
            return;
        }
    } else {
        if (targetType === 'SPECIFIC_USERS' && selectedUserIds.length === 0) {
            error("Veuillez sélectionner au moins un utilisateur.");
            setIsSubmitting(false);
            return;
        }
    }

    try {
      const payload: any = {
        title: data.title,
        message: data.message,
      };

      if (user?.role === 'SUPER_ADMIN') {
          if (targetType === 'GLOBAL') {
              payload.targetRoles = ['ALL'];
          } else if (targetType === 'SPECIFIC_SCHOOLS') {
              payload.targetSchoolIds = selectedSchoolIds;
              payload.targetRoles = ['ALL'];
          } else if (targetType === 'SPECIFIC_ADMINS') {
              payload.targetUserIds = selectedAdminIds;
          }
      } else if (user?.role === 'DIRECTEUR' || user?.role === 'EDUCATEUR') {
          if (targetType === 'ROLE_BASED') {
              payload.targetRoles = targetRoles;
              if (selectedClassId) payload.classId = selectedClassId;
          } else if (targetType === 'SPECIFIC_USERS') {
              payload.targetUserIds = selectedUserIds;
          }
      }

      const response = await api.post('/notifications/broadcast', payload);
      
      success(response.data.message);
      reset();
      setSelectedSchoolIds([]);
      setSelectedAdminIds([]);
      setSelectedUserIds([]);
      setSelectedClassId('');
      if (user?.role === 'SUPER_ADMIN') setTargetType('GLOBAL');
      else setTargetType('ROLE_BASED');
      setTargetRoles(['ALL']);
    } catch (err: any) {
      console.error("Broadcast error", err);
      error(err.response?.data?.message || err.message || "Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Diffuser une annonce" 
        subtitle="Envoyez des notifications ciblées aux utilisateurs, écoles ou administrateurs."
        icon={<Send className="w-6 h-6 text-brand-accent" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Target Selection */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-brand-card rounded-xl border border-brand-border/50 p-6">
                  <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-accent" />
                      Cible de l'annonce
                  </h2>

                  {user?.role === 'SUPER_ADMIN' ? (
                      <div className="space-y-3">
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'GLOBAL' ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'GLOBAL'} 
                                  onChange={() => setTargetType('GLOBAL')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent"
                              />
                              <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-brand-text-muted" />
                                  <span className="text-sm font-medium text-brand-text">Tout le monde (Global)</span>
                              </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'SPECIFIC_SCHOOLS' ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'SPECIFIC_SCHOOLS'} 
                                  onChange={() => setTargetType('SPECIFIC_SCHOOLS')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent"
                              />
                              <div className="flex items-center gap-2">
                                  <School className="w-4 h-4 text-brand-text-muted" />
                                  <span className="text-sm font-medium text-brand-text">Écoles spécifiques</span>
                              </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetType === 'SPECIFIC_ADMINS' ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="radio" 
                                  name="targetType" 
                                  checked={targetType === 'SPECIFIC_ADMINS'} 
                                  onChange={() => setTargetType('SPECIFIC_ADMINS')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent"
                              />
                              <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-brand-text-muted" />
                                  <span className="text-sm font-medium text-brand-text">Administrateurs spécifiques</span>
                              </div>
                          </label>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('ALL') ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('ALL')} 
                                  onChange={() => toggleRoleSelection('ALL')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent rounded"
                              />
                              <span className="text-sm font-medium text-brand-text">Tout l'établissement</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('ENSEIGNANT') ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('ENSEIGNANT')} 
                                  onChange={() => toggleRoleSelection('ENSEIGNANT')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent rounded"
                              />
                              <span className="text-sm font-medium text-brand-text">Professeurs</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('APPRENANT') ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('APPRENANT')} 
                                  onChange={() => toggleRoleSelection('APPRENANT')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent rounded"
                              />
                              <span className="text-sm font-medium text-brand-text">Élèves</span>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${targetRoles.includes('EDUCATEUR') ? 'border-brand-accent/50 bg-brand-accent/10' : 'border-brand-border/50 hover:bg-white/5'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={targetRoles.includes('EDUCATEUR')} 
                                  onChange={() => toggleRoleSelection('EDUCATEUR')}
                                  className="w-4 h-4 text-brand-accent accent-brand-accent rounded"
                              />
                              <span className="text-sm font-medium text-brand-text">Éducateurs</span>
                          </label>
                      </div>
                  )}
              </div>
              
              {/* Dynamic Selection List for Super Admin */}
              {user?.role === 'SUPER_ADMIN' && targetType === 'SPECIFIC_SCHOOLS' && (
                  <div className="bg-brand-card rounded-xl border border-brand-border/50 p-6">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-brand-text">Sélectionner les écoles</h3>
                          <button onClick={selectAllSchools} className="text-xs text-brand-accent hover:underline">
                              {selectedSchoolIds.length === schools.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {loadingData ? (
                              <p className="text-sm text-brand-text-muted">Chargement...</p>
                          ) : schools.map(school => (
                              <div 
                                  key={school.id}
                                  onClick={() => toggleSchoolSelection(school.id)}
                                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedSchoolIds.includes(school.id) ? 'bg-brand-accent/10' : 'hover:bg-white/5'}`}
                              >
                                  {selectedSchoolIds.includes(school.id) ? 
                                      <CheckSquare className="w-4 h-4 text-brand-accent" /> : 
                                      <Square className="w-4 h-4 text-brand-text-muted" />
                                  }
                                  <span className="text-sm text-brand-text">{school.name}</span>
                              </div>
                          ))}
                      </div>
                      <p className="text-xs text-brand-text-muted mt-2">
                          {selectedSchoolIds.length} école(s) sélectionnée(s)
                      </p>
                  </div>
              )}

              {user?.role === 'SUPER_ADMIN' && targetType === 'SPECIFIC_ADMINS' && (
                  <div className="bg-brand-card rounded-xl border border-brand-border/50 p-6">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-brand-text">Sélectionner les admins</h3>
                          <button onClick={selectAllAdmins} className="text-xs text-brand-accent hover:underline">
                              {selectedAdminIds.length === admins.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                          </button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {loadingData ? (
                              <p className="text-sm text-brand-text-muted">Chargement...</p>
                          ) : admins.map(admin => (
                              <div 
                                  key={admin.id}
                                  onClick={() => toggleAdminSelection(admin.id)}
                                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedAdminIds.includes(admin.id) ? 'bg-brand-accent/10' : 'hover:bg-white/5'}`}
                              >
                                  {selectedAdminIds.includes(admin.id) ? 
                                      <CheckSquare className="w-4 h-4 text-brand-accent" /> : 
                                      <Square className="w-4 h-4 text-brand-text-muted" />
                                  }
                                  <div className="flex flex-col">
                                      <span className="text-sm font-medium text-brand-text">{admin.firstName} {admin.lastName}</span>
                                      <span className="text-xs text-brand-text-muted">{admin.school?.name || 'Sans école'}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <p className="text-xs text-brand-text-muted mt-2">
                          {selectedAdminIds.length} admin(s) sélectionné(s)
                      </p>
                  </div>
              )}
          </div>

          {/* Right Column: Message Form */}
          <div className="lg:col-span-2">
              <div className="bg-brand-card rounded-xl border border-brand-border/50 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Titre de l'annonce</label>
                      <input
                        {...register('title', { required: 'Le titre est requis' })}
                        className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none text-brand-text transition-all"
                        placeholder="Ex: Maintenance prévue, Nouvelle fonctionnalité..."
                      />
                      {errors.title && <span className="text-red-400 text-xs mt-1.5 block">{errors.title.message}</span>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-brand-text-muted mb-1.5">Message</label>
                      <textarea
                        {...register('message', { required: 'Le message est requis' })}
                        rows={8}
                        className="w-full p-3 bg-brand-sidebar border border-brand-border/50 rounded-lg focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none resize-none text-brand-text transition-all custom-scrollbar"
                        placeholder="Écrivez votre message ici..."
                      />
                      {errors.message && <span className="text-red-400 text-xs mt-1.5 block">{errors.message.message}</span>}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-brand-border/30">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={isSubmitting}
                        leftIcon={<Send className="w-4 h-4" />}
                      >
                        Envoyer l'annonce
                      </Button>
                    </div>
                </form>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Broadcast;
