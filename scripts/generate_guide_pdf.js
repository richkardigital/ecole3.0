import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const markdownPath = path.join(rootDir, 'guide_utilisation.md');
const outputPath = path.join(rootDir, 'Guide_Utilisation_Ecole3.0.pdf');
const outputPathAlt = path.join(rootDir, 'guide_utilisation.pdf');

const content = fs.readFileSync(markdownPath, 'utf8');

// Création du document PDF A4 en mode portrait
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 18;
const contentWidth = pageWidth - 2 * margin;
let y = margin;

// Palette de couleurs professionnelles École 3.0
const colors = {
  primary: [30, 27, 75],       // Indigo très sombre #1e1b4b
  primaryBlue: [29, 78, 216],  // Bleu royal #1d4ed8
  accentPink: [219, 39, 119],  // Rose magenta #db2777
  accentPurple: [126, 34, 206],// Pourpre #7e22ce
  textDark: [15, 23, 42],      // Slate 900 #0f172a
  textMuted: [100, 116, 139],  // Slate 500 #64748b
  bgLight: [248, 250, 252],    // Slate 50 #f8fafc
  border: [226, 232, 240],     // Slate 200 #e2e8f0
  success: [16, 185, 129],    // Vert #10b981
};

function checkPageBreak(requiredSpace = 15) {
  if (y + requiredSpace > pageHeight - 20) {
    doc.addPage();
    y = margin + 10;
    renderHeaderFooter();
  }
}

function renderHeaderFooter() {
  const pageCount = doc.internal.getNumberOfPages();
  if (pageCount === 1) return; // Pas d'en-tête/pied sur la page de garde

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.accentPink);
  doc.text('ÉCOLE 3.0', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.textMuted);
  doc.text(' |  Guide d\'Utilisation Officiel — Réseau SEEC', margin + 17, 12);

  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.3);
  doc.line(margin, 14, pageWidth - margin, 14);

  // Pied de page
  doc.setDrawColor(...colors.border);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.textMuted);
  doc.text('Système Éducatif des Écoles Connectées — Tous droits réservés 2026', margin, pageHeight - 7);
  
  const pageStr = `Page ${pageCount}`;
  doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 7);
}

// ══════════════════════════════════════════════════
// 1. PAGE DE GARDE (PREMIUM COVER)
// ══════════════════════════════════════════════════

// Bannière de fond dégradée
doc.setFillColor(30, 27, 75);
doc.rect(0, 0, pageWidth, 90, 'F');

doc.setFillColor(219, 39, 119);
doc.rect(0, 86, pageWidth, 4, 'F');

// Titres bannière
doc.setTextColor(255, 255, 255);
doc.setFont('helvetica', 'bold');
doc.setFontSize(26);
doc.text('ÉCOLE 3.0', margin, 38);

doc.setFontSize(14);
doc.setTextColor(244, 114, 182); // Rose clair
doc.text('SYSTÈME ÉDUCATIF DES ÉCOLES CONNECTÉES', margin, 48);

doc.setFontSize(9);
doc.setTextColor(226, 232, 240);
doc.setFont('helvetica', 'normal');
doc.text('PLATEFORME ACADÉMIQUE, PÉDAGOGIQUE & VIE SCOLAIRE NUMÉRIQUE', margin, 56);

// Titre du Document
y = 110;
doc.setTextColor(...colors.primary);
doc.setFont('helvetica', 'bold');
doc.setFontSize(22);
const titleLines = doc.splitTextToSize('Guide d\'Utilisation Officiel & Complet', contentWidth);
doc.text(titleLines, margin, y);
y += titleLines.length * 9 + 4;

doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.textMuted);
const subtitle = 'Manuel de référence exhaustif pour Super Administrateurs, Directeurs d\'Établissement, Éducateurs, Enseignants, Apprenants et Parents.';
const subLines = doc.splitTextToSize(subtitle, contentWidth);
doc.text(subLines, margin, y);
y += subLines.length * 6 + 12;

// Boîte de Métadonnées officielles
doc.setFillColor(...colors.bgLight);
doc.setDrawColor(...colors.border);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, contentWidth, 54, 3, 3, 'FD');

doc.setTextColor(...colors.primary);
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.text('INFORMATIONS DU DOCUMENT', margin + 6, y + 9);

doc.setFontSize(8.5);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colors.textDark);
doc.text('Édition :', margin + 6, y + 18);
doc.text('Version Système :', margin + 6, y + 26);
doc.text('Statut :', margin + 6, y + 34);
doc.text('Réseau :', margin + 6, y + 42);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.textMuted);
doc.text('2026 — Année Académique 2025-2026', margin + 42, y + 18);
doc.text('École 3.0 v3.2 Enterprise', margin + 42, y + 26);
doc.text('Production / Validé & Certifié', margin + 42, y + 34);
doc.text('SEEC (Système Éducatif des Écoles Connectées)', margin + 42, y + 42);

doc.setFillColor(...colors.success);
doc.circle(margin + 38, y + 33, 1.5, 'F');

y += 70;

// Encadré des 6 modules clés
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...colors.primary);
doc.text('MODULES CLÉS COUVERTS DANS CE GUIDE :', margin, y);
y += 6;

const keyModules = [
  '• Portail Public de Suivi Parent Instantané (Recherche Matricule & Date de Naissance)',
  '• Cartes Scolaires & Badges Apprenant 3D (Standard PVC CR80 & Planches A4)',
  '• Moteur des Bulletins Scolaires Trimestriels Certifiés (Export Direct 1-Clic)',
  '• Espaces Dédiés par Rôle : Super Admin, Directeur, Éducateur, Enseignant, Élève',
  '• Hub d\'Évaluation, Exercices, Devoirs Numériques & Quiz Chronométrés',
  '• Réseau Collaboratif SEEC (Banque Nationale d\'Épreuves & Annales)'
];

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...colors.textDark);
keyModules.forEach(mod => {
  doc.text(mod, margin + 4, y);
  y += 6.5;
});

// Nouvelle page pour le contenu
doc.addPage();
y = margin + 10;
renderHeaderFooter();

// ══════════════════════════════════════════════════
// 2. PARSING ET RENDU STRUCTURÉ DU CONTENU
// ══════════════════════════════════════════════════

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Ignorer les premières lignes de titre (déjà sur la page de garde)
  if (line.startsWith('# Guide d\'Utilisation Officiel') || line === '---') {
    continue;
  }

  // Titre Niveau 1 (ex: ## 1. Architecture...)
  if (line.startsWith('## ')) {
    const titleText = line.replace('## ', '').trim();
    checkPageBreak(25);
    y += 4;

    // Bandeau décoratif de section
    doc.setFillColor(...colors.primary);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
    doc.setFillColor(...colors.accentPink);
    doc.rect(margin, y, 4, 9, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(titleText, margin + 8, y + 6.2);
    y += 14;
    continue;
  }

  // Titre Niveau 2 (ex: ### Menus et Fonctionnalités / ### 🔍 A. ...)
  if (line.startsWith('### ')) {
    const subTitleText = line.replace('### ', '').trim();
    checkPageBreak(16);
    y += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...colors.accentPurple);
    doc.text(subTitleText, margin, y);
    
    doc.setDrawColor(...colors.accentPurple);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, margin + doc.getTextWidth(subTitleText) + 4, y + 1.5);
    y += 7;
    continue;
  }

  // Titre Niveau 3 (ex: #### 4 Indicateurs...)
  if (line.startsWith('#### ')) {
    const subSubText = line.replace('#### ', '').trim();
    checkPageBreak(12);
    y += 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colors.primaryBlue);
    doc.text(subSubText, margin + 2, y);
    y += 5.5;
    continue;
  }

  // Ligne de puce principale (* ou -)
  if (line.startsWith('* ') || line.startsWith('- ')) {
    const bulletText = line.substring(2).trim();
    checkPageBreak(8);

    // Dessin d'une puce carrée stylisée
    doc.setFillColor(...colors.accentPink);
    doc.rect(margin + 2, y - 2.5, 1.8, 1.8, 'F');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.textDark);

    // Traitement du gras dans le texte markdown (**texte**)
    const cleanText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1');
    const wrappedLines = doc.splitTextToSize(cleanText, contentWidth - 8);
    doc.text(wrappedLines, margin + 7, y);
    y += wrappedLines.length * 4.4 + 1.5;
    continue;
  }

  // Ligne de sous-puce numérotée (ex: 1. 2. 3.)
  if (/^\d+\.\s/.test(line)) {
    const num = line.match(/^(\d+)\.\s/)[1];
    const itemText = line.replace(/^\d+\.\s/, '').trim();
    checkPageBreak(8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.primaryBlue);
    doc.text(`${num}.`, margin + 3, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.textDark);
    const cleanText = itemText.replace(/\*\*(.*?)\*\*/g, '$1');
    const wrappedLines = doc.splitTextToSize(cleanText, contentWidth - 10);
    doc.text(wrappedLines, margin + 9, y);
    y += wrappedLines.length * 4.4 + 1.5;
    continue;
  }

  // Paragraphe standard
  if (line.length > 0) {
    checkPageBreak(8);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.textDark);

    const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1');
    const wrappedLines = doc.splitTextToSize(cleanText, contentWidth);
    doc.text(wrappedLines, margin, y);
    y += wrappedLines.length * 4.4 + 2;
  } else {
    y += 2; // Espace vide
  }
}

// Rendu des en-têtes et pieds de page sur toutes les pages créées
const totalPages = doc.internal.getNumberOfPages();
for (let p = 2; p <= totalPages; p++) {
  doc.setPage(p);
  // Re-render footer avec totalPages exact
  doc.setFillColor(255, 255, 255);
  doc.rect(pageWidth - margin - 30, pageHeight - 11, 30, 8, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...colors.textMuted);
  const pageStr = `Page ${p} / ${totalPages}`;
  doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 7);
}

// Sauvegarde des fichiers PDF
const pdfData = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfData));
fs.writeFileSync(outputPathAlt, Buffer.from(pdfData));

console.log(`✅ Guide d'utilisation généré avec succès en PDF :`);
console.log(`   -> ${outputPath}`);
console.log(`   -> ${outputPathAlt}`);
console.log(`   -> Nombre total de pages : ${totalPages}`);
