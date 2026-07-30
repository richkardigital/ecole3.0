import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
  const [address, setAddress] = useState(user?.address || '');
  const [gender, setGender] = useState(user?.gender || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/users/${user?.id}`, { 
        firstName, 
        lastName, 
        email, 
        phone, 
        birthDate: birthDate || null, 
        address, 
        gender: gender || null 
      });
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès.' });
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil.' });
    } finally {
      setSaving(false);
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du changement de mot de passe.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" subtitle="Gérez votre profil et vos préférences" />

      {/* Tabs */}
      <div className="flex gap-1 bg-white shadow-sm border border-brand-border/50 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setActiveTab('profile'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-brand-accent/10 text-brand-accent' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-4 h-4" /> Profil
        </button>
        <button
          onClick={() => { setActiveTab('password'); setMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'password' ? 'bg-brand-accent/10 text-brand-accent' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Lock className="w-4 h-4" /> Mot de passe
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow-sm border border-brand-border/50 rounded-xl p-6 space-y-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom</label>
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={handleSaveProfile} isLoading={saving} rightIcon={<Save className="w-4 h-4" />}>
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white shadow-sm border border-brand-border/50 rounded-xl p-6 space-y-5 max-w-2xl">
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nouveau mot de passe</label>
              <input
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                type={showPasswords ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-900 transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe</label>
              <input
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                type={showPasswords ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-accent/50 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={handleChangePassword} isLoading={saving} rightIcon={<Lock className="w-4 h-4" />}>
              Changer le mot de passe
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
