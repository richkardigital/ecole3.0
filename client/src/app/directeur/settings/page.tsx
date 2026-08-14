import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  School,
  Building2,
  Upload,
  Save,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  ShieldCheck,
  Award,
  Image as ImageIcon,
  PenTool,
  Stamp,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';

export default function DirectorSchoolSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // School fields
  const [schoolId, setSchoolId] = useState<string>('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [postalAddress, setPostalAddress] = useState('');
  const [ville, setVille] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');

  // Asset URLs & Preview
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [stampUrl, setStampUrl] = useState<string | null>(null);

  // Uploading flags
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);

  // Director details from manager
  const [directorName, setDirectorName] = useState<string>('');

  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schools/my-school');
      const s = res.data;
      if (s) {
        setSchoolId(s.id);
        setName(s.name || '');
        setAddress(s.address || '');
        setPostalAddress(s.postalAddress || '');
        setVille(s.ville || '');
        setPhone(s.phone || '');
        setEmail(s.email || '');
        setDescription(s.description || '');
        setLogoUrl(s.logoUrl || null);
        setSignatureUrl(s.signatureUrl || null);
        setStampUrl(s.stampUrl || null);

        if (s.manager) {
          setDirectorName(`${s.manager.firstName} ${s.manager.lastName}`);
        }
      }
    } catch (err) {
      console.error('Error fetching school data', err);
      setMessage({
        type: 'error',
        text: "Impossible de charger les données de votre établissement."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
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
        text: `Fichier pour ${type === 'logo' ? 'le Logo' : type === 'signature' ? 'la Signature' : 'le Cachet'} téléversé avec succès.`
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
        name,
        address,
        postalAddress,
        ville,
        phone,
        email,
        description,
        logoUrl,
        signatureUrl,
        stampUrl,
      };

      await api.put('/schools/my-school', payload);
      setMessage({
        type: 'success',
        text: "Paramètres de l'établissement enregistrés avec succès ! Le logo et la signature sont désormais mis à jour sur tous les bulletins."
      });
      fetchSchoolData();
    } catch (err: any) {
      console.error('Error saving school settings', err);
      setMessage({
        type: 'error',
        text: err?.response?.data?.message || "Erreur lors de l'enregistrement des paramètres."
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
        title="Paramètres de l'Établissement"
        subtitle="Gérez l'identité visuelle, les coordonnées officielles, la signature du Directeur et le cachet de votre école."
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
          {/* SECTION 1: IDENTITÉ & IMAGES OFFICIELLES */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Identité Visuelle & Signatures Officielles</h2>
                <p className="text-xs text-slate-500">
                  Ces éléments seront automatiquement intégrés sur l'en-tête et les signatures des Bulletins scolaires.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Logo de l'école */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Logo de l'École</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                  {logoUrl ? (
                    <img
                      src={formatUrl(logoUrl)!}
                      alt="Logo École"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <School className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Format recommandé : PNG transparent ou JPG haute définition.
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
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

              {/* 2. Signature du Directeur */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Signature du Directeur</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner relative">
                  {signatureUrl ? (
                    <img
                      src={formatUrl(signatureUrl)!}
                      alt="Signature Directeur"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <PenTool className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Signature officielle numérisée pour l'approbation des bulletins.
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
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

              {/* 3. Cachet de l'établissement */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col items-center text-center space-y-3">
                <p className="font-bold text-xs text-slate-700 uppercase tracking-wider">Cachet Officiel</p>
                
                <div className="w-32 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                  {stampUrl ? (
                    <img
                      src={formatUrl(stampUrl)!}
                      alt="Cachet École"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <ShieldCheck className="w-10 h-10 text-slate-300" />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Tampon / Sceau officiel de l'école (PNG avec fond transparent idéal).
                </p>

                <label className="w-full">
                  <span className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
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

          {/* SECTION 2: COORDONNÉES & ADRESSES DE L'ÉCOLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Coordonnées & Informations Administratives</h2>
                <p className="text-xs text-slate-500">
                  Renseignez les détails officiels de contact et de localisation de votre établissement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nom officiel de l'École / Établissement
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Groupe Scolaire Les Lauriers d'Excellence"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Adresse Email officielle
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="direction@mon-ecole.ci"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Numéro de Téléphone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 27 22 00 00 00"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Localisation / Adresse Physique
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: Riviera Palmeraie, Rue Ministres"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Boîte Postale / Adresse Postale (BP)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={postalAddress}
                    onChange={(e) => setPostalAddress(e.target.value)}
                    placeholder="Ex: 01 BP 4567 Abidjan 01"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Ville / Commune
                </label>
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Ex: Abidjan, Yamoussoukro, San Pedro..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Directeur en charge
                </label>
                <input
                  type="text"
                  value={directorName}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-500 text-sm cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Devise / Description de l'école
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Rigueur - Travail - Succès..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: APERÇU EN DIRECT SUR LE BULLETIN SCOLAIRE */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">Aperçu en Direct sur le Bulletin Scolaire</h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg">
                Rendu conforme impression
              </span>
            </div>

            {/* Simulated Report Card Snippet */}
            <div className="bg-white text-slate-900 p-6 rounded-xl shadow-inner border border-slate-200">
              {/* En-tête simulé */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
                <div className="max-w-[70%]">
                  {logoUrl ? (
                    <img
                      src={formatUrl(logoUrl)!}
                      alt="Logo école"
                      className="h-12 max-w-[180px] mb-2 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-24 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400 mb-2 font-medium">
                      [Logo de l'école]
                    </div>
                  )}
                  <h4 className="text-base font-black text-slate-900 uppercase tracking-wide">
                    {name || "Nom de votre établissement"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {address || "Adresse physique de l'école"} {ville ? `— ${ville}` : ''}
                  </p>
                  {postalAddress && (
                    <p className="text-[11px] text-slate-500">BP : {postalAddress}</p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Tél : {phone || "+225 ..."} | Email : {email || "contact@ecole.ci"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="border-2 border-slate-800 px-3 py-1.5 rounded">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Bulletin Trimestriel</p>
                    <p className="text-xs font-black text-slate-900">Exemple 1er Trimestre</p>
                  </div>
                </div>
              </div>

              {/* Bloc Signature simulé */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 mt-6">
                <div className="text-center">
                  <div className="h-14 border-b border-slate-300 mb-1" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase">L'Élève</p>
                </div>
                <div className="text-center">
                  <div className="h-14 border-b border-slate-300 mb-1" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Les Parents</p>
                </div>
                <div className="text-center">
                  <div className="h-14 border-b border-slate-300 mb-1 flex items-center justify-center relative overflow-hidden">
                    {signatureUrl ? (
                      <img
                        src={formatUrl(signatureUrl)!}
                        alt="Signature Directeur"
                        className="max-h-12 max-w-[120px] object-contain z-10"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">[Signature du Directeur]</span>
                    )}
                    {stampUrl && (
                      <img
                        src={formatUrl(stampUrl)!}
                        alt="Cachet de l'école"
                        className="max-h-12 max-w-[120px] object-contain absolute opacity-70 z-0 pointer-events-none"
                      />
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Le Directeur</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {directorName || "Nom du Directeur"}
                  </p>
                </div>
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
              className="px-8 shadow-lg shadow-indigo-500/20"
            >
              Enregistrer les Paramètres de l'Établissement
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
