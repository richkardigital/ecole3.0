import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  User as UserIcon,
  Lock,
  Save,
  Eye,
  EyeOff,
  FileText,
  Upload,
  Trash2,
  Paperclip,
  CheckCircle2,
  Download,
  Shield,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Camera,
  CreditCard
} from 'lucide-react';
import api from '@/lib/api';
import { StudentCard } from '@/components/cards/StudentCard';
import { StudentCardData } from '@/lib/studentCardPdfGenerator';

interface UserDoc {
  id: string;
  title: string;
  fileUrl: string;
  fileType?: string;
  createdAt: string;
}

export default function UserProfilePage() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'password' | 'card'>('profile');
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
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

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
      const g = data.gender;
      setGender(g === 'MASCULIN' || g === 'M' ? 'MASCULIN' : g === 'FEMININ' || g === 'F' ? 'FEMININ' : g || '');
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

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
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Erreur lors de la mise à jour du profil.';
      setMessage({ type: 'error', text: errMsg });
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
      await api.put('/users/profile/password', { password: newPassword });
      setMessage({ type: 'success', text: 'Mot de passe modifié avec succès.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Erreur lors de la modification du mot de passe.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = previewAvatar || (avatarUrl ? (avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || ''}${avatarUrl}`) : null);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Mon Profil"
        subtitle="Consultez et modifiez vos informations personnelles, documents et mot de passe."
      />

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 transition-all animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 bg-white px-6 pt-3 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Informations personnelles
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents & Justificatifs ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'password'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4" />
          Sécurité & Mot de passe
        </button>

        {(user?.role === 'APPRENANT' || (user?.role as string) === 'ELEVE') && (
          <button
            onClick={() => setActiveTab('card')}
            className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'card'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Ma Carte Scolaire (3D)
          </button>
        )}
      </div>

      {loadingProfile ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: INFORMATIONS PERSONNELLES */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
              {/* Entête avec Avatar */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center overflow-hidden shadow-md border-2 border-white">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      `${firstName[0] || ''}${lastName[0] || ''}`
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                    <Camera className="w-6 h-6" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div className="text-center sm:text-left space-y-1">
                  <h2 className="text-xl font-black text-slate-900">{firstName} {lastName}</h2>
                  <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start text-xs font-semibold">
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg">
                      {user?.role}
                    </span>
                    {matricule && (
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg">
                        Matricule : {matricule}
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                      {email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulaire complet */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Adresse Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-500 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Téléphone Personnel
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  {user?.role === 'APPRENANT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Téléphone du Parent / Tuteur
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={parentPhone}
                          onChange={(e) => setParentPhone(e.target.value)}
                          placeholder="+225 05 00 00 00 00"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Genre
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                    >
                      <option value="">Non spécifié</option>
                      <option value="MASCULIN">Masculin</option>
                      <option value="FEMININ">Féminin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Date de Naissance
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Lieu de Naissance
                    </label>
                    <input
                      type="text"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      placeholder="Ex: Abidjan, Bouaké..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Adresse de résidence
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ex: Cocody Angré 8ème Tranche, Abidjan"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSaveProfile}
                    isLoading={saving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS & JUSTIFICATIFS */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Formulaire d'upload */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Ajouter un document officiel
                </h3>
                <form onSubmit={handleUploadDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Type / Titre du document
                    </label>
                    <select
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 text-sm"
                    >
                      <option value="Extrait de naissance">Extrait de naissance</option>
                      <option value="Certificat de scolarité">Certificat de scolarité</option>
                      <option value="Carte Nationale d'Identité">Carte d'Identité / Passeport</option>
                      <option value="Certificat de nationalité">Certificat de nationalité</option>
                      <option value="Reçu d'inscription">Reçu d'inscription</option>
                      <option value="Autre document">Autre document officiel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Fichier (PDF, Image)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setDocFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>

                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full"
                      isLoading={uploadingDoc}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      Téléverser
                    </Button>
                  </div>
                </form>
              </div>

              {/* Liste des documents */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-indigo-600" />
                  Documents enregistrés
                </h3>

                {documents.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Aucun document téléversé</p>
                    <p className="text-xs text-slate-400">Ajoutez votre extrait de naissance ou vos pièces d'identité.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 truncate">{doc.title}</p>
                            <p className="text-xs text-slate-400">
                              Ajouté le {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${import.meta.env.VITE_API_URL || ''}${doc.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Voir le document"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

          {/* TAB 3: MOT DE PASSE */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
              <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Modifier votre mot de passe
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Pour assurer la sécurité de votre compte, choisissez un mot de passe robuste d'au moins 6 caractères.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleChangePassword}
                    isLoading={saving}
                    leftIcon={<Lock className="w-4 h-4" />}
                  >
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MA CARTE SCOLAIRE 3D (ÉLÈVE) */}
          {activeTab === 'card' && (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-6">
              <div className="text-center max-w-md space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-pink-600">
                  Document Officiel Sécurisé
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Ma Carte Scolaire
                </h3>
                <p className="text-xs text-slate-500">
                  Cette carte officielle certifiée contient votre QR code sécurisé de scolarité. Vous pouvez la retourner en 3D ou la télécharger au format PDF.
                </p>
              </div>

              <StudentCard
                data={{
                  id: user?.id,
                  matricule: matricule || `MAT-${user?.id?.substring(0, 8).toUpperCase() || '2026-0000'}`,
                  firstName: firstName || user?.firstName || '',
                  lastName: lastName || user?.lastName || '',
                  birthDate: birthDate || null,
                  birthPlace: birthPlace || 'Abidjan',
                  gender: gender === 'FEMININ' ? 'F' : 'M',
                  photoUrl: displayAvatar || avatarUrl || null,
                  className: (user as any)?.className || 'Classe active',
                  levelName: (user as any)?.levelName || 'Secondaire',
                  academicYear: '2025-2026',
                  schoolName: (user as any)?.schoolName || 'Complexe Scolaire École 3.0',
                  schoolAddress: address || 'Abidjan, Côte d\'Ivoire',
                  schoolPhone: '+225 27 22 00 00 00',
                  schoolEmail: email || 'contact@ecole30.ci',
                  parentPhone: parentPhone || phone,
                  bloodGroup: 'O+',
                }}
                showActions={true}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
