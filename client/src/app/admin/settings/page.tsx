import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  Globe,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  Award,
  Image as ImageIcon,
  PenTool,
  Sliders
} from 'lucide-react';
import api from '@/lib/api';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';

export default function AdminSystemSettingsPage() {
  const { refreshSettings } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Platform fields
  const [platformName, setPlatformName] = useState('École 3.0 / SEEEC Platform');
  const [email, setEmail] = useState('support@ecole3-seeec.ci');
  const [phone, setPhone] = useState('+225 07 00 00 00 00');
  const [address, setAddress] = useState('Plateau, Abidjan, Côte d\'Ivoire');
  const [postalAddress, setPostalAddress] = useState('01 BP 1234 Abidjan 01');
  const [websiteUrl, setWebsiteUrl] = useState('https://ecole3-seeec.ci');
  const [description, setDescription] = useState(
    'Plateforme Numérique Intelligente de Gestion Scolaire et d\'Éducation Connectée.'
  );

  // Asset URLs & Preview
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  // Uploading flags
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/system-settings');
      const s = res.data;
      if (s) {
        setPlatformName(s.platformName || 'École 3.0 / SEEEC Platform');
        setEmail(s.email || 'support@ecole3-seeec.ci');
        setPhone(s.phone || '+225 07 00 00 00 00');
        setAddress(s.address || 'Plateau, Abidjan, Côte d\'Ivoire');
        setPostalAddress(s.postalAddress || '01 BP 1234 Abidjan 01');
        setWebsiteUrl(s.websiteUrl || 'https://ecole3-seeec.ci');
        setDescription(s.description || '');
        setLogoUrl(s.logoUrl || null);
        setSignatureUrl(s.signatureUrl || null);
        setStampUrl(s.stampUrl || null);
      }
    } catch (err) {
      console.error('Error loading system settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const handleFileUpload = async (
    file: File,
    type: 'logo' | 'signature' | 'stamp'
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      if (type === 'logo') setUploadingLogo(true);
      if (type === 'signature') setUploadingSignature(true);
      if (type === 'stamp') setUploadingStamp(true);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data.url;
      if (type === 'logo') setLogoUrl(uploadedUrl);
      if (type === 'signature') setSignatureUrl(uploadedUrl);
      if (type === 'stamp') setStampUrl(uploadedUrl);

      setMessage({
        type: 'success',
        text: `Fichier pour ${type === 'logo' ? 'le Logo en ligne' : type === 'signature' ? 'la Signature officielle' : 'le Cachet'} téléversé avec succès.`
      });
    } catch (error) {
      console.error('Upload error', error);
      setMessage({ type: 'error', text: 'Erreur lors du téléversement du fichier.' });
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      if (type === 'signature') setUploadingSignature(false);
      if (type === 'stamp') setUploadingStamp(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        platformName,
        email,
        phone,
        address,
        postalAddress,
        websiteUrl,
        description,
        logoUrl,
        signatureUrl,
        stampUrl,
      };

      await api.put('/system-settings', payload);
      await refreshSettings();
      setMessage({
        type: 'success',
        text: 'Paramètres globaux de la plateforme mis à jour et synchronisés sur toute la plateforme !'
      });
      fetchSystemSettings();
    } catch (err: any) {
      console.error('Error saving system settings', err);
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Erreur lors de la mise à jour des paramètres.'
      });
    } finally {
      setSaving(false);
    }
  };

  const formatUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
        title="Paramètres Système de la Plateforme"
        subtitle="Configurez l'identité globale, les logos en ligne, la signature officielle SEEEC et les contacts centraux."
      />

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 transition-all animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="space-y-8">
          {/* SECTION 1: LOGOS & SIGNATURES EN LIGNE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Logo en Ligne & Signatures Officielles SEEEC</h2>
                <p className="text-xs text-slate-500">
                  Modifiables à tout moment. Ces éléments se répercutent sur tout le front-office et les documents certifiés.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Logo en ligne */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Logo Plateforme en Ligne</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                  <img
                    src={logoUrl ? formatUrl(logoUrl)! : "/logo.png"}
                    alt="Logo Plateforme"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Logo officiel affiché sur la bannière, la vitrine et l'interface.
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingLogo ? 'Téléversement...' : 'Changer le Logo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'logo');
                    }}
                  />
                </label>
              </div>

              {/* 2. Signature officielle SEEEC */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Signature Officielle SEEEC</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                  {signatureUrl ? (
                    <img
                      src={formatUrl(signatureUrl)!}
                      alt="Signature SEEEC"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <PenTool className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Signature ministérielle / nationale pour attestations et validation finale.
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingSignature ? 'Téléversement...' : 'Changer la Signature'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingSignature}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'signature');
                    }}
                  />
                </label>
              </div>

              {/* 3. Cachet officiel SEEEC */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Cachet Officiel SEEEC</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                  {stampUrl ? (
                    <img
                      src={formatUrl(stampUrl)!}
                      alt="Cachet SEEEC"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ShieldCheck className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Sceau officiel pour la certification des bulletins et diplômes.
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingStamp ? 'Téléversement...' : 'Changer le Cachet'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingStamp}
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'stamp');
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: INFORMATIONS DE LA PLATEFORME */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Coordonnées Centrales & Support</h2>
                <p className="text-xs text-slate-500">
                  Informations de contact et adresses globales répercutées sur la plateforme.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nom de la Plateforme
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    placeholder="École 3.0 / SEEEC Platform"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-semibold text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Email Officiel / Support
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="support@ecole3-seeec.ci"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Téléphone Central
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Adresse Siège
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Plateau, Abidjan, Côte d'Ivoire"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Boîte Postale (BP)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={postalAddress}
                    onChange={(e) => setPostalAddress(e.target.value)}
                    placeholder="01 BP 1234 Abidjan 01"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Site Web Officiel
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://ecole3-seeec.ci"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Description / Présentation de la Plateforme
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Présentation globale..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-medium text-slate-800 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* BOUTON D'ENREGISTREMENT */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={saving}
              leftIcon={<Save className="w-5 h-5" />}
              className="px-8 shadow-lg shadow-violet-500/20 bg-violet-600 hover:bg-violet-700"
            >
              Enregistrer les Paramètres Système
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
