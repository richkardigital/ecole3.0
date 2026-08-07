import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, CheckCircle, XCircle, Search, Save, X } from 'lucide-react';
import api from '@/lib/api';
import type { AxiosError } from 'axios';

interface Subscription {
  id: string;
  name: string;
  planKey: string;
  description: string | null;
  price: number;
  period: string;
  features: string[];
  isActive: boolean;
  schools?: { 
    id: string; 
    name: string; 
    ville: string;
    subscriptionStatus?: string;
    subscriptionEndDate?: string;
  }[];
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    planKey: '',
    description: '',
    price: 0,
    period: 'Mensuel',
    features: '',
    isActive: true
  });

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions?all=true');
      setSubscriptions(res.data);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des abonnements.');
    } finally {
      setLoading(false);
    }
  };

  const renewSchoolSubscription = async (schoolId: string) => {
    try {
      if (window.confirm("Voulez-vous vraiment renouveler l'abonnement de cette école ?")) {
        await api.post('/subscriptions/renew', { schoolId });
        fetchSubscriptions();
        alert("Abonnement renouvelé avec succès !");
      }
    } catch (err: any) {
      alert("Erreur lors du renouvellement : " + err.response?.data?.message);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const openCreateModal = () => {
    setEditingSub(null);
    setFormData({
      name: '', planKey: '', description: '', price: 0, period: 'Mensuel', features: '', isActive: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      planKey: sub.planKey,
      description: sub.description || '',
      price: sub.price,
      period: sub.period,
      features: sub.features.join(', '),
      isActive: sub.isActive
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean),
        id: editingSub?.id
      };
      
      if (editingSub) {
        await api.put('/subscriptions', payload);
      } else {
        await api.post('/subscriptions', payload);
      }
      setIsModalOpen(false);
      fetchSubscriptions();
    } catch (err: unknown) {
        const error = err as AxiosError<{message: string}>;
        alert(error.response?.data?.message || 'Erreur lors de la sauvegarde.');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Chargement des abonnements...</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            Gestion des Abonnements
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Gérez les plans tarifaires et leurs fonctionnalités.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptions.map(sub => (
          <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 relative">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg text-slate-900">{sub.name}</h3>
                {sub.isActive ? (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">Actif</span>
                ) : (
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">Inactif</span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-500">{sub.description}</p>
              
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-900">{sub.price === 0 ? "Gratuit" : `${sub.price} FCFA`}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{sub.period !== 'Essai gratuit' ? `/ ${sub.period}` : ''}</span>
              </div>
            </div>

            <div className="p-6 flex-1 bg-white">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Fonctionnalités</h4>
              <ul className="space-y-2 mb-6">
                {sub.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              
              {/* Affichage des Écoles connectées */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex justify-between">
                  Écoles inscrites
                  <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px]">{sub.schools?.length || 0}</span>
                </h4>
                {sub.schools && sub.schools.length > 0 ? (
                  <ul className="space-y-1 mt-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {sub.schools.map((school, i) => (
                      <li key={i} className="text-[11px] font-semibold text-slate-600 bg-slate-50 p-2 rounded flex flex-col gap-1 border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="truncate">{school.name}</span>
                          <span className="text-slate-400 shrink-0 ml-2">{school.ville}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-200">
                          <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${school.subscriptionStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {school.subscriptionStatus === 'EXPIRED' ? 'EXPIRÉ' : 'ACTIF'}
                          </span>
                          <div className="flex items-center gap-2">
                            {school.subscriptionEndDate && (
                              <span className="text-[9px] text-slate-500">
                                Fin: {new Date(school.subscriptionEndDate).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                            <button 
                              onClick={() => renewSchoolSubscription(school.id)}
                              className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded hover:bg-indigo-100 font-bold transition-colors"
                            >
                              Renouveler
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400 italic font-medium">Aucune école</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => openEditModal(sub)}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900">
                {editingSub ? 'Modifier le plan' : 'Nouveau plan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nom du plan</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: Pro"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Clé unique (planKey)</label>
                  <input
                    required
                    type="text"
                    value={formData.planKey}
                    onChange={e => setFormData({ ...formData, planKey: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: pro_plan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Prix (FCFA)</label>
                  <input
                    required
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Périodicité</label>
                  <input
                    required
                    type="text"
                    value={formData.period}
                    onChange={e => setFormData({ ...formData, period: e.target.value })}
                    className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: par mois"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Fonctionnalités (séparées par une virgule)</label>
                <textarea
                  required
                  rows={3}
                  value={formData.features}
                  onChange={e => setFormData({ ...formData, features: e.target.value })}
                  className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Gestion illimitée, Bulletins, Messages..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Plan actif (visible sur le site)</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
