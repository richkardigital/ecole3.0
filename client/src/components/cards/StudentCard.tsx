import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, Download, Sparkles, ShieldCheck, QrCode, 
  School, Phone, Mail, MapPin, User, Calendar, Award, CheckCircle2,
  Share2, Eye, Printer, Copy, Check
} from 'lucide-react';
import QRCode from 'qrcode';
import { StudentCardData, exportStudentCardPdf } from '@/lib/studentCardPdfGenerator';

interface StudentCardProps {
  data: StudentCardData;
  showActions?: boolean;
  className?: string;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  data,
  showActions = true,
  className = '',
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const verifyUrl = `${window.location.origin}/suivi-enfant?matricule=${encodeURIComponent(data.matricule)}${
    data.birthDate ? `&birthDate=${encodeURIComponent(data.birthDate.split('T')[0])}` : ''
  }`;

  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    }).then((url) => setQrCodeUrl(url)).catch(console.error);
  }, [verifyUrl]);

  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await exportStudentCardPdf(data);
    } catch (err) {
      console.error('Failed to export student card PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyMatricule = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.matricule) {
      navigator.clipboard.writeText(data.matricule);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBirth = (d?: string | null) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* ── 3D FLIP CONTAINER ── */}
      <div
        className="w-full max-w-[440px] aspect-[1.586/1] perspective-1000 cursor-pointer select-none group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-700 preserve-3d transition-transform rounded-3xl shadow-2xl ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ══════════════════════════════════════════════════════ */}
          {/* ── RECTO (FRONT) ── */}
          {/* ══════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 w-full h-full bg-white rounded-3xl overflow-hidden border-2 border-slate-200/90 backface-hidden shadow-xl flex flex-col justify-between"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Top Navy Header */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-4 py-2.5 text-white border-b-2 border-sky-500 shrink-0">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-300">
                <span>Rép. de Côte d'Ivoire</span>
                <span className="text-sky-400">Ministère Éducation Nat.</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-lg bg-pink-500 flex items-center justify-center font-black text-white text-[10px] shrink-0">
                    3.0
                  </div>
                  <h4 className="font-black text-xs sm:text-[13px] text-white truncate tracking-tight">
                    {data.schoolName || 'COMPLEXE SCOLAIRE ÉCOLE 3.0'}
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-pink-600/90 text-white rounded-full text-[9px] font-black shrink-0 tracking-wide">
                  {data.academicYear || '2025-2026'}
                </span>
              </div>
            </div>

            {/* Sub-header Banner */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600 py-1 px-4 text-center">
              <p className="text-[10px] font-black text-white tracking-widest uppercase">
                Carte d'Apprenant Officielle Certifiée
              </p>
            </div>

            {/* Main Body */}
            <div className="p-3.5 flex-1 flex gap-3.5 items-center">
              {/* Left: Photo + Regular Badge */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-20 h-24 sm:w-22 sm:h-26 rounded-2xl bg-slate-100 border-2 border-slate-300 shadow-md overflow-hidden relative group-hover:scale-[1.02] transition-transform">
                  {data.photoUrl ? (
                    <img
                      src={data.photoUrl}
                      alt={`${data.firstName} ${data.lastName}`}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-slate-50">
                      <User className="w-8 h-8 text-slate-300" />
                      <span className="text-[9px] font-bold mt-1 text-slate-400">Photo Officielle</span>
                    </div>
                  )}
                  {/* Hologram Corner Accent */}
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-400 via-pink-400 to-sky-400 opacity-85 shadow-xs" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-md tracking-wider">
                  ÉLÈVE RÉGULIER
                </span>
              </div>

              {/* Middle: Student Details */}
              <div className="flex-1 min-w-0 space-y-1">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-950 uppercase tracking-tight truncate">
                    {data.lastName} {data.firstName}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-0.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-mono font-black">
                    <span>{data.matricule}</span>
                    <button
                      onClick={handleCopyMatricule}
                      className="text-purple-600 hover:text-purple-900 transition-colors"
                      title="Copier le matricule"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] pt-1">
                  <div>
                    <span className="text-slate-400 font-bold block text-[8.5px] uppercase">Classe :</span>
                    <span className="font-black text-slate-800">{data.className}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[8.5px] uppercase">Niveau :</span>
                    <span className="font-bold text-slate-700 truncate block">{data.levelName || 'Secondaire'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[8.5px] uppercase">Né(e) le :</span>
                    <span className="font-bold text-slate-800">{formatBirth(data.birthDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[8.5px] uppercase">Sexe :</span>
                    <span className="font-bold text-slate-800">{data.gender === 'F' ? 'Féminin' : 'Masculin'}</span>
                  </div>
                </div>
              </div>

              {/* Right: QR Code & Stamp */}
              <div className="flex flex-col items-center justify-between shrink-0 h-full py-0.5 pl-1 border-l border-slate-100">
                <div className="flex flex-col items-center">
                  <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="QR de vérification" className="w-14 h-14 sm:w-16 sm:h-16" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 animate-pulse rounded-lg" />
                    )}
                  </div>
                  <span className="text-[7.5px] font-black text-slate-400 mt-1 uppercase tracking-tighter">
                    Vérification
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-[7px] font-bold text-blue-700 uppercase">Direction</p>
                  <p className="text-[8px] font-serif italic font-bold text-slate-800">M. Koné</p>
                </div>
              </div>
            </div>

            {/* Bottom Navy Bar */}
            <div className="bg-slate-950 py-1.5 px-4 text-center shrink-0">
              <p className="text-[8px] font-medium text-slate-300 tracking-wider">
                ÉCOLE 3.0 • CARTE NUMÉRIQUE SÉCURISÉE • VALIDE POUR L'ANNÉE {data.academicYear || '2025-2026'}
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════ */}
          {/* ── VERSO (BACK) ── */}
          {/* ══════════════════════════════════════════════════════ */}
          <div
            className="absolute inset-0 w-full h-full bg-white rounded-3xl overflow-hidden border-2 border-slate-200/90 backface-hidden rotate-y-180 shadow-xl flex flex-col justify-between p-4"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {/* Magnetic Stripe Bar */}
            <div className="w-full h-6 bg-slate-900 rounded-lg -mx-4 px-4 flex items-center justify-between">
              <span className="text-[7px] text-slate-400 font-mono tracking-widest uppercase">
                CARD_ID_{data.matricule}
              </span>
              <span className="text-[7px] text-pink-400 font-bold uppercase">ÉCOLE 3.0 ACCESS NFC</span>
            </div>

            {/* Terms of Use */}
            <div className="space-y-1 text-[9px] text-slate-600">
              <h5 className="font-black text-slate-900 uppercase text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-pink-600" />
                Règlement & Conditions d'utilisation
              </h5>
              <p className="leading-tight">
                • Cette carte est <strong>strictement personnelle</strong> et obligatoire dans l'enceinte de l'établissement.
              </p>
              <p className="leading-tight">
                • Elle donne accès aux cours, devoirs, examens et aux ressources numériques de la <strong>Librairie 3.0</strong>.
              </p>
              <p className="leading-tight">
                • En cas de perte, veuillez la signaler sans délai auprès du secrétariat général.
              </p>
            </div>

            {/* Emergency Parent Box */}
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-[10px] space-y-0.5">
              <span className="font-black text-rose-800 text-[9px] uppercase tracking-wider block">
                🚨 Contacts d'Urgence & Santé :
              </span>
              <p className="text-slate-800">
                Parent / Tuteur : <strong className="font-black">{data.parentName || 'Parent de l\'élève'}</strong>
              </p>
              <p className="text-slate-700 flex items-center justify-between">
                <span>Tél : <strong className="font-bold">{data.parentPhone || data.schoolPhone || '+225 07 00 00 00 00'}</strong></span>
                <span>Groupe Sanguin : <strong className="text-rose-700 font-black">{data.bloodGroup || 'O+'}</strong></span>
              </p>
            </div>

            {/* Bottom School Info */}
            <div className="pt-2 border-t border-slate-200 text-center text-[8px] text-slate-400 space-y-0.5">
              <p className="font-bold text-slate-700 truncate">
                {data.schoolName || 'Complexe Scolaire SEEEC'} • {data.schoolAddress || 'Abidjan, Côte d\'Ivoire'}
              </p>
              <p>
                Tél : {data.schoolPhone || '+225 27 22 00 00 00'} • Email : {data.schoolEmail || 'contact@ecole30.ci'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE ACTION TOOLBAR ── */}
      {showActions && (
        <div className="flex items-center gap-2 flex-wrap justify-center w-full">
          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-600" />
            <span>{isFlipped ? 'Voir le Recto' : 'Voir le Verso (3D)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-pink-600/25 active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>{downloading ? 'Génération PDF...' : 'Télécharger Carte PVC (PDF)'}</span>
          </button>

          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tester Vérification</span>
          </a>
        </div>
      )}
    </div>
  );
};
