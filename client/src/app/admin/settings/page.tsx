import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { User, Lock, Save, Eye, EyeOff, FileText, Upload, Trash2, Paperclip, CheckCircle2, Download } from 'lucide-react';
import api from '@/lib/api';

interface UserDoc {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  createdAt: string;
}

const Settings = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'password'>('profile');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [matricule, setMatricule] = useState(user?.matricule || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [parentPhone, setParentPhone] = useState(user?.parentPhone || '');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [address, setAddress] = useState(user?.address || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Documents
  const [documents, setDocuments] = useState<UserDoc[]>([]);
  const [docTitle, setDocTitle] = useState('Extrait de naissance');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get('/users/profile/me');
      const data = res.data;
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setEmail(data.email || '');
      setMatricule(data.matricule || '');
      setPhone(data.phone || '');
      setParentPhone(data.parentPhone || '');
      setBirthDate(data.birthDate ? new Date(data.birthDate).toISOString().split('T')[0] : '');
      setBirthPlace(data.birthPlace || '');
      setAddress(data.address || '');
      setGender(data.gender || '');
      setAvatarUrl(data.avatarUrl || '');
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error loading profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('phone', phone);
      formData.append('parentPhone', parentPhone);
      formData.append('birthDate', birthDate);
      formData.append('birthPlace', birthPlace);
      formData.append('address', address);
      formData.append('gender', gender);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.put('/users/profile/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (setUser && res.data) {
        setUser({ ...user, ...res.data });
      }

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
      fetchProfile();
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) return setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier.' });

    setUploadingDoc(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('file', docFile);

      await api.post('/users/profile/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: 'Document ajouté avec succès.' });
      setDocFile(null);
      fetchProfile();
    } catch {
      setMessage({ type: 'error', text: "Erreur lors de l'ajout du document." });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;
    try {
      await api.delete(`/users/profile/documents/${docId}`);
      setMessage({ type: 'success', text: 'Document supprimé avec succès.' });
      fetchProfile();
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression du document.' });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/users/${user?.id}/password`, { password: newPassword });
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader title="Mon Profil & Paramètres" description="Gérez vos informations personnelles et vos pièces justificatives" />

      {/* Tabs */}
      <div className="flex gap-1 bg-white shadow-sm border border-brand-border/50 rounded-xl p-1 w-fit overflow-x-auto">
        <button
          onClick={() => { setActiveTab('profile'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'profile' ? 'bg-brand-accent text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4" /> Profil & Informations
        </button>
        <button
          onClick={() => { setActiveTab('documents'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'documents' ? 'bg-brand-accent text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Paperclip className="w-4 h-4" /> Pièces jointes ({documents.length})
        </button>
        <button
          onClick={() => { setActiveTab('password'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'password' ? 'bg-brand-accent text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" /> Sécurité & Mot de passe
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message.text}
        </div>
      )}

      {loadingProfile ? (
        <div className="py-12 text-center text-slate-400 font-medium">Chargement du profil...</div>
      ) : (
        <>
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white shadow-sm border border-brand-border/50 rounded-2xl p-6 space-y-6">
              
              {/* Photo & Identity Banner */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-slate-200 border-2 border-brand-accent flex items-center justify-center shrink-0">
                  {avatarFile ? (
                    <img src={URL.createObjectURL(avatarFile)} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all text-white text-xs font-bold gap-1">
                    <Upload className="w-4 h-4" /> Changer
                    <input type="file" accept="image/*" className="hidden" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{firstName} {lastName}</h3>
                    {matricule && <span className="px-2.5 py-0.5 rounded-md bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase">{matricule}</span>}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{email}</p>
                  <p className="text-xs text-brand-accent font-semibold uppercase tracking-wider">{user?.role}</p>
                </div>
              </div>

              {/* Personal Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prénom</label>
                  <input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nom</label>
                  <input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Genre</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="MASCULIN">Masculin (Homme / Garçon)</option>
                    <option value="FEMININ">Féminin (Femme / Fille)</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Matricule</label>
                  <input
                    value={matricule}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                    placeholder="Non assigné"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date de naissance</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lieu de naissance</label>
                  <input
                    value={birthPlace}
                    onChange={e => setBirthPlace(e.target.value)}
                    placeholder="Ex: Abidjan, Cocody"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone Personnel</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Téléphone Parent / Tuteur</label>
                  <input
                    value={parentPhone}
                    onChange={e => setParentPhone(e.target.value)}
                    placeholder="+225 05..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Adresse de Résidence</label>
                  <input
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Quartier, Commune, Ville..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button variant="primary" onClick={handleSaveProfile} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Add document card */}
              <form onSubmit={handleUploadDocument} className="bg-white shadow-sm border border-brand-border/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-brand-accent" /> Ajouter une pièce justificative
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Type de document</label>
                    <select
                      value={docTitle}
                      onChange={e => setDocTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                    >
                      <option value="Extrait de naissance">Extrait de naissance</option>
                      <option value="Photocopie pièce parent">Photocopie pièce d'identité du parent</option>
                      <option value="CNI / Passeport élève">CNI / Passeport élève</option>
                      <option value="Carnet de santé">Carnet de santé</option>
                      <option value="Certificat de scolarité">Certificat de scolarité</option>
                      <option value="Autre justificatif">Autre justificatif</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Fichier (PDF, Image)</label>
                    <input
                      type="file"
                      onChange={e => setDocFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-accent/10 file:text-brand-accent hover:file:bg-brand-accent/20 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit" isLoading={uploadingDoc} leftIcon={<Upload className="w-4 h-4" />}>
                    Joindre le document
                  </Button>
                </div>
              </form>

              {/* Documents List */}
              <div className="bg-white shadow-sm border border-brand-border/50 rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Mes documents enregistrés ({documents.length})</h3>
                {documents.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Aucun document joint pour le moment.</p>
                    <p className="text-xs text-slate-400 mt-1">Vous devez ajouter vos pièces justificatives (extrait de naissance, pièce des parents, etc.).</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <div key={doc.id} className="py-3.5 flex items-center justify-between gap-4 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{doc.title}</p>
                            <p className="text-xs text-slate-400">Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-brand-accent hover:bg-slate-100 rounded-lg transition-all"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="bg-white shadow-sm border border-brand-border/50 rounded-2xl p-6 space-y-5">
              <div className="space-y-4 max-w-md">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
                  <input
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
                  <input
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    type={showPasswords ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent outline-none transition-all"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button variant="primary" onClick={handleChangePassword} isLoading={saving} leftIcon={<Lock className="w-4 h-4" />}>
                  Changer le mot de passe
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;
