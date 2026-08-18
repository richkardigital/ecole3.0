import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BulletinPdfData {
  bulletin: any;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricule?: string;
    birthDate?: string | Date | null;
    avatarUrl?: string | null;
    photoUrl?: string | null;
    photo?: string | null;
    class: string;
    niveau?: string | null;
  };
  school: {
    name: string;
    address?: string;
    postalAddress?: string;
    ville?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    signatureUrl?: string;
    stampUrl?: string;
    manager?: { firstName: string; lastName: string } | null;
  } | null;
  systemSettings?: {
    platformName?: string;
    signatureUrl?: string;
    stampUrl?: string;
    email?: string;
    phone?: string;
  } | null;
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    academicYear?: { name: string };
  } | null;
  subjects: {
    courseId: string;
    subjectName: string;
    coefficient: number;
    teacher: string;
    average: number | null;
    appreciation: string;
    avgDevoirs: number | null;
    avgEval: number | null;
    avgQuiz: number | null;
    avgParticipation: number | null;
  }[];
  overallAverage: number | null;
  rangClasse: number | null;
  nombreEleves: number | null;
  conduct: {
    appreciation?: string;
    comment?: string;
    grade?: number | null;
  } | null;
  totalAbsences: number;
  absencesJustifiees: number;
  termsSummary?: {
    termId: string;
    termName: string;
    overallAverage: number | null;
    statut: string | null;
  }[];
  annualAverage: number | null;
}

// Convertir une image en base64 pour jsPDF avec fallback sécurisé
const loadImageAsBase64 = async (url: string | null | undefined): Promise<string | null> => {
  if (!url) return null;
  try {
    const formattedUrl = url.startsWith('/uploads')
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${url}`
      : url;

    const response = await fetch(formattedUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

export const exportBulletinPdf = async (data: BulletinPdfData) => {
  const {
    bulletin,
    student,
    school,
    systemSettings,
    term,
    subjects,
    overallAverage,
    rangClasse,
    nombreEleves,
    conduct,
    totalAbsences,
    absencesJustifiees,
  } = data;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  const anneeLabel = term?.academicYear?.name ?? (
    term ? `${new Date(term.startDate).getFullYear()}–${new Date(term.endDate).getFullYear()}` : '2025–2026'
  );

  const unjustifiedAbsences = Math.max(0, totalAbsences - absencesJustifiees);
  const conductGrade = conduct?.grade ?? bulletin?.noteConduite ?? null;

  // Pré-chargement des images en arrière-plan
  const [logoBase64, studentPhotoBase64, directorSigBase64, schoolStampBase64, adminSigBase64, adminStampBase64] = await Promise.all([
    loadImageAsBase64(school?.logoUrl),
    loadImageAsBase64(student.avatarUrl || student.photoUrl || student.photo),
    loadImageAsBase64(school?.signatureUrl),
    loadImageAsBase64(school?.stampUrl),
    loadImageAsBase64(systemSettings?.signatureUrl),
    loadImageAsBase64(systemSettings?.stampUrl),
  ]);

  let currentY = 10;

  // ==========================================
  // 1. EN-TÊTE OFFICIEL
  // ==========================================
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', margin, currentY, 18, 18);
    } catch {
      // Ignore if format issue
    }
  }

  const headerTextX = logoBase64 ? margin + 22 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39); // #111827
  doc.text((school?.name ?? systemSettings?.platformName ?? 'ÉTABLISSEMENT SCOLAIRE').toUpperCase(), headerTextX, currentY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 85, 99); // #4B5563
  const addressLine = `${school?.address || 'Plateau'}${school?.ville ? `, ${school.ville}` : ', Abidjan'}${school?.postalAddress ? ` • BP : ${school.postalAddress}` : ''}`;
  doc.text(addressLine, headerTextX, currentY + 9);

  const contactLine = `Tél : ${school?.phone || '+225 27 20 00 00 00'} • Email : ${school?.email || 'contact@ecole.ci'}`;
  doc.text(contactLine, headerTextX, currentY + 14);

  // Cartouche Trimestre / Année à droite
  const boxWidth = 55;
  const boxHeight = 16;
  const boxX = pageWidth - margin - boxWidth;
  doc.setDrawColor(17, 24, 39);
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128); // #6B7280
  doc.text('BULLETIN SCOLAIRE OFFICIEL', boxX + boxWidth / 2, currentY + 4, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(term?.name ?? 'Trimestre 1', boxX + boxWidth / 2, currentY + 9.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Année Scolaire ${anneeLabel}`, boxX + boxWidth / 2, currentY + 14, { align: 'center' });

  currentY += 21;

  // Ligne de séparation en-tête
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.6);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3;

  // ==========================================
  // 2. BLOC INFORMATIONS ÉLÈVE & PHOTO
  // ==========================================
  const studentBoxHeight = 22;
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, contentWidth, studentBoxHeight, 2, 2, 'FD');

  // Photo Élève
  const photoSize = 16;
  const photoX = margin + 3;
  const photoY = currentY + 3;
  if (studentPhotoBase64) {
    try {
      doc.addImage(studentPhotoBase64, 'JPEG', photoX, photoY, photoSize, photoSize);
      doc.setDrawColor(209, 213, 219);
      doc.rect(photoX, photoY, photoSize, photoSize, 'S');
    } catch {
      // Fallback
    }
  } else {
    doc.setFillColor(219, 39, 119); // Pink
    doc.roundedRect(photoX, photoY, photoSize, photoSize, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${student.firstName?.[0] || 'E'}${student.lastName?.[0] || 'L'}`, photoX + photoSize / 2, photoY + 10, { align: 'center' });
  }

  // Textes Élève
  const infoX1 = photoX + photoSize + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text('NOM & PRÉNOMS DE L\'ÉLÈVE', infoX1, currentY + 5.5);

  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`${student.lastName.toUpperCase()} ${student.firstName}`, infoX1, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  const birthStr = student.birthDate ? new Date(student.birthDate).toLocaleDateString('fr-FR') : '—';
  doc.text(`Matricule : ${student.matricule || 'N/A'}  •  Né(e) le : ${birthStr}`, infoX1, currentY + 16.5);

  // Colonne Classe
  const infoX2 = margin + 110;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text('CLASSE & EFFECTIF', infoX2, currentY + 5.5);

  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text(student.class, infoX2, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`${student.niveau || 'Enseignement Général'}${nombreEleves ? ` • ${nombreEleves} élèves` : ''}`, infoX2, currentY + 16.5);

  // Colonne Rang
  const infoX3 = pageWidth - margin - 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175);
  doc.text('RANG AU TRIMESTRE', infoX3, currentY + 5.5, { align: 'right' });

  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  const rangText = rangClasse ? `${rangClasse}${rangClasse === 1 ? 'er' : 'e'} / ${nombreEleves || '—'}` : 'En attente';
  doc.text(rangText, infoX3, currentY + 11, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // Emerald
  const mentionText = overallAverage !== null ? (overallAverage >= 14 ? '★ Tableau d\'Honneur' : overallAverage >= 10 ? '✓ Admis' : 'En session') : 'Évalué';
  doc.text(mentionText, infoX3, currentY + 16.5, { align: 'right' });

  currentY += studentBoxHeight + 3;

  // ==========================================
  // 3. TABLEAU DES NOTES ET MATIÈRES
  // ==========================================
  const formatGrade = (g: number | null | undefined) => (g !== null && g !== undefined ? g.toFixed(2) : '—');

  const tableBody: any[] = subjects.map((s) => [
    { content: `${s.subjectName}\nProf. ${s.teacher}`, styles: { fontStyle: 'bold' as const } },
    { content: `${s.coefficient}`, styles: { halign: 'center' as const } },
    { content: formatGrade(s.avgDevoirs), styles: { halign: 'center' as const } },
    { content: formatGrade(s.avgEval), styles: { halign: 'center' as const } },
    { content: formatGrade(s.avgQuiz), styles: { halign: 'center' as const } },
    { content: formatGrade(s.avgParticipation), styles: { halign: 'center' as const } },
    { content: formatGrade(s.average), styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [249, 250, 251] } },
    { content: s.appreciation || (s.average !== null && s.average >= 14 ? 'Très bon travail' : s.average !== null && s.average >= 10 ? 'Travail convenable' : 'Doit progresser') },
  ]);

  // Ligne Conduite
  tableBody.push([
    { content: 'Conduite, Assiduité & Discipline\nRegistre vie scolaire', styles: { fontStyle: 'bold' as const, fillColor: [254, 243, 199] } },
    { content: '1', styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [254, 243, 199] } },
    { content: `${unjustifiedAbsences}h inj. • ${absencesJustifiees}h just.`, colSpan: 4, styles: { halign: 'center' as const, fillColor: [254, 243, 199] } },
    { content: formatGrade(conductGrade), styles: { halign: 'center' as const, fontStyle: 'bold' as const, fillColor: [254, 243, 199] } },
    { content: conduct?.appreciation || 'Comportement satisfaisant', styles: { fontStyle: 'italic' as const, fillColor: [254, 243, 199] } },
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'Matières Enseignées',
      'Coef.',
      'Devoirs',
      'Éval.',
      'Quiz',
      'Partic.',
      'Moy./20',
      'Appréciation Pédagogique',
    ]],
    body: tableBody,
    foot: [[
      { content: 'MOYENNE GÉNÉRALE TRIMESTRIELLE', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `${formatGrade(overallAverage)} / 20`, styles: { halign: 'center', fontStyle: 'bold', textColor: [52, 211, 153] } },
      { content: overallAverage !== null ? (overallAverage >= 14 ? 'Tableau d\'Honneur' : overallAverage >= 10 ? 'Admis' : 'Non Admis') : '', styles: { fontStyle: 'bold', textColor: [209, 213, 219] } },
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [17, 24, 39], // #111827
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 1.8,
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.5,
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
    },
    footStyles: {
      fillColor: [17, 24, 39],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 12 },
      2: { cellWidth: 14 },
      3: { cellWidth: 14 },
      4: { cellWidth: 14 },
      5: { cellWidth: 14 },
      6: { cellWidth: 18 },
      7: { cellWidth: 'auto' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY || currentY + 110;
  currentY = finalY + 3;

  // ==========================================
  // 4. ASSIDUITÉ & APPRÉCIATION DU CONSEIL
  // ==========================================
  const blockHeight = 16;
  const colWidth = (contentWidth - 4) / 2;

  // Bloc Assiduité
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, currentY, colWidth, blockHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('BILAN D\'ASSIDUITÉ & ABSENCES', margin + 3, currentY + 4);

  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 39);
  doc.text(`Total Absences : ${totalAbsences} h`, margin + 3, currentY + 9);
  doc.setTextColor(5, 150, 105);
  doc.text(`Justifiées : ${absencesJustifiees} h`, margin + 35, currentY + 9);
  doc.setTextColor(220, 38, 38);
  doc.text(`Injustifiées : ${unjustifiedAbsences} h`, margin + 65, currentY + 9);

  // Bloc Conseil des Professeurs
  const col2X = margin + colWidth + 4;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(col2X, currentY, colWidth, blockHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(107, 114, 128);
  doc.text('APPRÉCIATION DU CONSEIL DES PROFESSEURS', col2X + 3, currentY + 4);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(55, 65, 81);
  const appreciationText = bulletin?.appreciationGenerale || 'Trimestre satisfaisant dans l\'ensemble. Poursuivez vos efforts.';
  doc.text(`"${appreciationText}"`, col2X + 3, currentY + 9, { maxWidth: colWidth - 6 });

  currentY += blockHeight + 3;

  // ==========================================
  // 5. DOUBLES SIGNATURES OFFICIELLES & CACHETS
  // ==========================================
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 2;

  const sigColWidth = contentWidth / 4;
  const sigHeight = 18;

  // 1. L'Élève
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(55, 65, 81);
  doc.text('L\'ÉLÈVE', margin + sigColWidth * 0.5, currentY + sigHeight + 3, { align: 'center' });

  // 2. Les Parents / Tuteur
  doc.text('LES PARENTS / TUTEUR', margin + sigColWidth * 1.5, currentY + sigHeight + 3, { align: 'center' });

  // 3. Le Chef d'Établissement (M. Koné en Bleu)
  const dirX = margin + sigColWidth * 2;
  if (directorSigBase64) {
    try {
      doc.addImage(directorSigBase64, 'PNG', dirX + 5, currentY + 1, sigColWidth - 10, 12);
    } catch {}
  }
  if (schoolStampBase64) {
    try {
      doc.addImage(schoolStampBase64, 'PNG', dirX + 12, currentY, sigColWidth - 14, 14);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(17, 24, 39);
  doc.text('LE CHEF D\'ÉTABLISSEMENT', dirX + sigColWidth / 2, currentY + sigHeight + 2, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(29, 78, 216); // #1D4ED8 (Bleu)
  const directorName = bulletin?.valideDirecteurPar
    ? `${bulletin.valideDirecteurPar.firstName} ${bulletin.valideDirecteurPar.lastName}`
    : school?.manager
    ? `${school.manager.firstName} ${school.manager.lastName}`
    : 'M. Koné (Directeur des Études)';
  doc.text(directorName, dirX + sigColWidth / 2, currentY + sigHeight + 5.5, { align: 'center' });

  // 4. Direction Générale / Super Admin SEEEC
  const dgX = margin + sigColWidth * 3;
  if (adminSigBase64) {
    try {
      doc.addImage(adminSigBase64, 'PNG', dgX + 5, currentY + 1, sigColWidth - 10, 12);
    } catch {}
  }
  if (adminStampBase64) {
    try {
      doc.addImage(adminStampBase64, 'PNG', dgX + 12, currentY, sigColWidth - 14, 14);
    } catch {}
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(17, 24, 39);
  doc.text('DIRECTEUR GÉNÉRAL ECOLE 3.0 (SEC.)', dgX + sigColWidth / 2, currentY + sigHeight + 2, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(5, 150, 105);
  doc.text('Certification Plateforme Officielle', dgX + sigColWidth / 2, currentY + sigHeight + 5.5, { align: 'center' });

  // ==========================================
  // 6. PIED DE PAGE
  // ==========================================
  const footerY = pageHeight - 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(156, 163, 175);
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, footerY);
  doc.text('Système National d\'Éducation Connectée — École 3.0 / SEEEC', pageWidth / 2, footerY, { align: 'center' });
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Document Officiel Vérifié ✓', pageWidth - margin, footerY, { align: 'right' });

  // ==========================================
  // 7. TÉLÉCHARGEMENT DIRECT SANS BOÎTE D'IMPRESSION
  // ==========================================
  const fileName = `Bulletin_${student.lastName}_${student.firstName}_${term?.name || 'T1'}.pdf`
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  doc.save(fileName);
};
