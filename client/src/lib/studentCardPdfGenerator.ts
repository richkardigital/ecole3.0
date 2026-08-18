import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface StudentCardData {
  id?: string;
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  gender?: string | null;
  photoUrl?: string | null;
  className: string;
  levelName?: string;
  academicYear?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  parentName?: string;
  parentPhone?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  issuedAt?: string;
  expiresAt?: string;
}

// Convert image URL to Base64 safely
async function loadImageAsBase64(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Generate QR Code data URL
async function generateQrCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 256,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

// Format birth date cleanly
function formatBirthDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr || '—';
  }
}

/**
 * Draw a single Card Front (Recto) on a jsPDF doc at position (x, y) with dimensions (w, h) in mm
 * Standard CR80 is 85.6 mm x 53.98 mm
 */
export async function drawCardFront(
  doc: jsPDF,
  card: StudentCardData,
  x: number,
  y: number,
  w: number = 85.6,
  h: number = 54,
  options?: { photoBase64?: string | null; qrBase64?: string | null }
) {
  const photo = options?.photoBase64 !== undefined ? options.photoBase64 : await loadImageAsBase64(card.photoUrl);
  const verifyUrl = `${window.location.origin}/suivi-enfant?matricule=${encodeURIComponent(card.matricule)}${card.birthDate ? `&birthDate=${encodeURIComponent(card.birthDate.split('T')[0])}` : ''}`;
  const qrCode = options?.qrBase64 || (await generateQrCodeDataUrl(verifyUrl));

  // 1. Background Card Body (White with rounded corners & subtle border)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');

  // 2. Top Header Bar (Deep Navy Gradient representation #0B192C)
  doc.setFillColor(15, 23, 42); // #0F172A
  doc.roundedRect(x, y, w, 14.5, 3, 3, 'F');
  // Cover bottom rounded corners of top bar
  doc.rect(x, y + 10, w, 4.5, 'F');

  // 3. Top Accent Line (Vibrant Blue / Cyan #0284C7)
  doc.setFillColor(2, 132, 199);
  doc.rect(x, y + 14.5, w, 0.8, 'F');

  // Header Texts
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'bold');
  doc.text("RÉPUBLIQUE DE CÔTE D'IVOIRE • MINISTÈRE DE L'ÉDUCATION NATIONALE", x + w / 2, y + 3.2, { align: 'center' });

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  const schoolTitle = (card.schoolName || 'COMPLEXE SCOLAIRE ÉCOLE 3.0').toUpperCase();
  doc.text(schoolTitle.length > 32 ? schoolTitle.substring(0, 32) + '...' : schoolTitle, x + w / 2, y + 6.8, { align: 'center' });

  // Banner subtitle "CARTE D'APPRENANT • ÉCOLE 3.0"
  doc.setFillColor(236, 72, 153); // Pink accent badge
  doc.roundedRect(x + 12, y + 8.8, w - 24, 4.2, 1.2, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'bold');
  doc.text(`CARTE SCOLAIRE OFFICIELLE • ${card.academicYear || '2025-2026'}`, x + w / 2, y + 11.7, { align: 'center' });

  // 4. Photo on Left Column
  const photoX = x + 3.5;
  const photoY = y + 17.5;
  const photoW = 21.5;
  const photoH = 26.5;

  // Photo frame & shadow
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  if (photo) {
    try {
      doc.addImage(photo, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH);
  }

  // Statut badge below photo
  doc.setFillColor(16, 185, 129); // Emerald
  doc.roundedRect(photoX, photoY + photoH + 1.2, photoW, 3.2, 0.8, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉLÈVE RÉGULIER', photoX + photoW / 2, photoY + photoH + 3.4, { align: 'center' });

  // 5. Middle Information Column
  const infoX = x + 27.5;
  let infoY = y + 18.5;

  // Full Name
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const fullName = `${(card.lastName || '').toUpperCase()} ${card.firstName || ''}`;
  const truncatedName = fullName.length > 24 ? fullName.substring(0, 24) + '...' : fullName;
  doc.text(truncatedName, infoX, infoY);

  // Matricule badge
  infoY += 3.8;
  doc.setFillColor(243, 232, 255); // Purple tint
  doc.setDrawColor(216, 180, 254);
  doc.roundedRect(infoX, infoY - 2.8, 30, 4.2, 1, 1, 'FD');
  doc.setTextColor(126, 34, 206);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.text(`MAT : ${card.matricule || 'N/A'}`, infoX + 1.8, infoY);

  // Details
  infoY += 4.5;
  const drawField = (label: string, value: string, currentY: number) => {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase() + ' :', infoX, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(value || '—', infoX + 14, currentY);
  };

  drawField('Classe', card.className || '—', infoY);
  infoY += 3.6;
  drawField('Né(e) le', formatBirthDate(card.birthDate), infoY);
  infoY += 3.6;
  drawField('À', (card.birthPlace || 'Abidjan').substring(0, 18), infoY);
  infoY += 3.6;
  drawField('Sexe', card.gender === 'F' ? 'Féminin (F)' : 'Masculin (M)', infoY);
  infoY += 3.6;
  drawField('Niveau', card.levelName || 'Secondaire', infoY);

  // 6. Right Column: QR Code & Security Stamp
  const qrX = x + w - 17.5;
  const qrY = y + 17.5;
  const qrSize = 14;

  if (qrCode) {
    try {
      doc.addImage(qrCode, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (e) {
      console.warn('QR render error:', e);
    }
  }

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(3.8);
  doc.setFont('helvetica', 'bold');
  doc.text('SCANNEZ POUR VÉRIFIER', qrX + qrSize / 2, qrY + qrSize + 2, { align: 'center' });

  // Official Signature / Stamp indication
  const stampY = qrY + qrSize + 4.5;
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'bold');
  doc.text('Le Chef d\'Établissement', qrX + qrSize / 2, stampY, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(4.8);
  doc.setFont('times', 'italic');
  doc.text('M. Koné (Dir. Études)', qrX + qrSize / 2, stampY + 3.2, { align: 'center' });

  // 7. Bottom Hologram/Security Footer
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(x, y + h - 4.5, w, 4.5, 3, 3, 'F');
  doc.rect(x, y + h - 4.5, w, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'normal');
  doc.text("ÉCOLE 3.0 • SYSTÈME SÉCURISÉ NUMÉRIQUE • CARTE STRICTEMENT PERSONNELLE", x + w / 2, y + h - 1.6, { align: 'center' });

  // Outer border with rounded corners
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'D');
}

/**
 * Draw a single Card Back (Verso) on a jsPDF doc at position (x, y) with dimensions (w, h) in mm
 */
export function drawCardBack(
  doc: jsPDF,
  card: StudentCardData,
  x: number,
  y: number,
  w: number = 85.6,
  h: number = 54
) {
  // 1. Background Card Body
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 3, 3, 'F');

  // 2. Top Magnetic Stripe Simulation (#1E293B)
  doc.setFillColor(30, 41, 59);
  doc.rect(x, y + 4.5, w, 7.5, 'F');

  // 3. Security Notice & Terms
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(6.2);
  doc.setFont('helvetica', 'bold');
  doc.text('DISPOSITIONS GÉNÉRALES & RÈGLEMENT', x + 5, y + 16.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(4.2);
  doc.setFont('helvetica', 'normal');
  const rules = [
    '• Cette carte d\'apprenant est strictement personnelle, incessible et obligatoire.',
    '• Elle donne accès aux salles de cours, examens, laboratoires et bibliothèque 3.0.',
    '• Tout porteur doit la présenter à toute réquisition de l\'administration scolaire.',
    '• En cas de perte ou de détérioration, contacter immédiatement le secrétariat.',
  ];
  let ruleY = y + 19.8;
  rules.forEach((r) => {
    doc.text(r, x + 5, ruleY);
    ruleY += 2.8;
  });

  // 4. Contact d'urgence / Parent
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x + 4.5, ruleY + 0.5, w - 9, 11, 1.5, 1.5, 'FD');

  doc.setTextColor(225, 29, 72); // Rose/Red
  doc.setFontSize(4.8);
  doc.setFont('helvetica', 'bold');
  doc.text('URGENCE & CONTACT PARENT :', x + 6.5, ruleY + 3.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tuteur / Parent : ${card.parentName || 'Parent de l\'élève'}`, x + 6.5, ruleY + 6.8);
  doc.text(`Tél : ${card.parentPhone || card.schoolPhone || '+225 07 00 00 00 00'}   •   Groupe Sanguin : ${card.bloodGroup || 'Non renseigné'}`, x + 6.5, ruleY + 9.5);

  // 5. Bottom Establishment Contact info
  const botY = y + h - 7.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(x + 5, botY, x + w - 5, botY);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(4);
  doc.setFont('helvetica', 'normal');
  doc.text(`Établissement : ${card.schoolName || 'Complexe Scolaire SEEEC'} • ${card.schoolAddress || 'Abidjan, Côte d\'Ivoire'}`, x + w / 2, botY + 2.6, { align: 'center' });
  doc.text(`Tél : ${card.schoolPhone || '+225 27 22 00 00 00'} • Email : ${card.schoolEmail || 'contact@ecole30.ci'} • Web : https://ecole30.ci`, x + w / 2, botY + 5.2, { align: 'center' });

  // Outer border with rounded corners
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 3, 3, 'D');
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(226, 232, 240);
  doc.rect(x + 0.5, y + 0.5, w - 1, h - 1, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('PHOTO', x + w / 2, y + h / 2 - 1, { align: 'center' });
  doc.setFontSize(4);
  doc.text('ÉLÈVE', x + w / 2, y + h / 2 + 2, { align: 'center' });
}

/**
 * Export a single student's card as a dedicated 2-page PDF in standard CR80 format (85.6mm x 54mm)
 * Instant download, NO window.print()
 */
export async function exportStudentCardPdf(card: StudentCardData) {
  // CR80 dimensions: 85.6 mm x 54 mm, landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [54, 85.6],
  });

  const photoBase64 = await loadImageAsBase64(card.photoUrl);
  const verifyUrl = `${window.location.origin}/suivi-enfant?matricule=${encodeURIComponent(card.matricule)}${card.birthDate ? `&birthDate=${encodeURIComponent(card.birthDate.split('T')[0])}` : ''}`;
  const qrBase64 = await generateQrCodeDataUrl(verifyUrl);

  // Page 1: Recto (Front)
  await drawCardFront(doc, card, 0, 0, 85.6, 54, { photoBase64, qrBase64 });

  // Page 2: Verso (Back)
  doc.addPage([54, 85.6], 'landscape');
  drawCardBack(doc, card, 0, 0, 85.6, 54);

  const cleanName = `${card.lastName}_${card.firstName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Carte_Apprenant_${cleanName}_${card.matricule}.pdf`;
  doc.save(fileName);
}

/**
 * Export batch cards for a whole class or group on A4 sheets (8 cards per page: 2 columns x 4 rows)
 * Complete with cutting crop marks for professional school badge printing.
 */
export async function exportBatchStudentCardsPdf(
  students: StudentCardData[],
  options?: { title?: string; academicYear?: string }
) {
  if (!students || students.length === 0) {
    alert('Aucun élève sélectionné pour l\'exportation de cartes.');
    return;
  }

  // Standard A4 Portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardW = 85.6;
  const cardH = 54;
  const marginX = (210 - cardW * 2) / 3; // ~12.9 mm
  const marginY = 16;
  const gapY = 8;
  const cardsPerPage = 8; // 2 cols x 4 rows = 8 cards

  let currentCardIndex = 0;

  for (let i = 0; i < students.length; i++) {
    const card = students[i];
    const pageCardPos = currentCardIndex % cardsPerPage;

    if (currentCardIndex > 0 && pageCardPos === 0) {
      doc.addPage('a4', 'portrait');
    }

    // Top A4 Page Header on each page
    if (pageCardPos === 0) {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `ÉCOLE 3.0 • PLANCHE OFFICIELLE D'IMPRESSION DE CARTES SCOLAIRES — ${options?.title || 'TOUTES CLASSES'} (${options?.academicYear || '2025-2026'})`,
        105,
        6.5,
        { align: 'center' }
      );
    }

    const col = pageCardPos % 2;
    const row = Math.floor(pageCardPos / 2);

    const x = marginX + col * (cardW + marginX);
    const y = marginY + row * (cardH + gapY);

    // Draw cutting guides (Crop marks)
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.15);
    // top-left cross
    doc.line(x - 2, y, x + 2, y);
    doc.line(x, y - 2, x, y + 2);
    // top-right cross
    doc.line(x + cardW - 2, y, x + cardW + 2, y);
    doc.line(x + cardW, y - 2, x + cardW, y + 2);
    // bottom-left cross
    doc.line(x - 2, y + cardH, x + 2, y + cardH);
    doc.line(x, y + cardH - 2, x, y + cardH + 2);
    // bottom-right cross
    doc.line(x + cardW - 2, y + cardH, x + cardW + 2, y + cardH);
    doc.line(x + cardW, y + cardH - 2, x + cardW, y + cardH + 2);

    // Draw Front
    await drawCardFront(doc, card, x, y, cardW, cardH);

    currentCardIndex++;
  }

  const cleanTitle = (options?.title || 'Planche_Cartes_Scolaires').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanTitle}_Ecole30.pdf`;
  doc.save(fileName);
}
