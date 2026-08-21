import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Palette de couleurs professionnelles
const COLORS = {
  primary: '#4D3E90',       // Violet Royal Institutionnel
  primaryDark: '#2E2360',
  secondary: '#189CD8',     // Bleu Ciel Moderne
  accent: '#F59E0B',        // Ambre
  emerald: '#10B981',       // Vert succès
  dark: '#0F172A',          // Slate 900
  body: '#334155',          // Slate 700
  muted: '#64748B',         // Slate 500
  lightBg: '#F8FAFC',       // Slate 50
  cardBg: '#F1F5F9',        // Slate 100
  border: '#CBD5E1',        // Slate 300
  white: '#FFFFFF'
};

/**
 * Classe utilitaire pour générer des documents PDF soignés avec PDFKit
 */
class DocumentPDFBuilder {
  doc: InstanceType<typeof PDFDocument>;
  stream: fs.WriteStream;
  totalPages: number = 0;
  outputPath: string;
  docTitle: string;
  docSubtitle: string;

  constructor(outputPath: string, title: string, subtitle: string) {
    this.outputPath = outputPath;
    this.docTitle = title;
    this.docSubtitle = subtitle;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 55, bottom: 55, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: title,
        Author: 'SEEEC - Plateforme École 3.0',
        Subject: subtitle,
        Keywords: 'Education, Gestion Scolaire, Rapport, Guide, Deploiement, Cote d Ivoire'
      }
    });

    this.stream = fs.createWriteStream(outputPath);
    this.doc.pipe(this.stream);
  }

  // Couverture de prestige
  drawCoverPage(category: string, version: string = 'Version 3.0 — 2026') {
    const doc = this.doc;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Fond décoratif
    doc.rect(0, 0, pageWidth, pageHeight).fill('#F8FAFC');

    // Bandeau haut primaire
    doc.rect(0, 0, pageWidth, 180).fill(COLORS.primary);
    doc.rect(0, 175, pageWidth, 6).fill(COLORS.secondary);

    // Titre supérieur du bandeau
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(14).text('SYSTÈME ÉDUCATIF INTÉGRÉ SEEEC', 50, 45, { tracking: 2 });
    doc.font('Helvetica').fontSize(10).fillColor('#DDD6FE').text('Plateforme Nationale de Gestion Scolaire & Pédagogique 3.0', 50, 65);

    // Badge Catégorie
    doc.rect(50, 110, 180, 28).fill(COLORS.secondary);
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(11).text(category.toUpperCase(), 60, 118, { width: 160, align: 'center' });

    // Titre Principal
    doc.y = 230;
    doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(24).text(this.docTitle, 50, 230, { width: 495, lineGap: 6 });

    // Sous-titre
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(13).text(this.docSubtitle, 50, doc.y + 10, { width: 495, lineGap: 4 });

    // Ligne de séparation
    const sepY = doc.y + 20;
    doc.moveTo(50, sepY).lineTo(pageWidth - 50, sepY).lineWidth(2).strokeColor(COLORS.border).stroke();

    // Bloc Métadonnées
    doc.y = sepY + 25;
    const metaBoxY = doc.y;
    doc.roundedRect(50, metaBoxY, 495, 140, 8).fillAndStroke(COLORS.white, COLORS.border);

    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(12).text('INFORMATIONS OFFICIELLES DU DOCUMENT', 70, metaBoxY + 18);
    
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.body).text('Système :', 70, metaBoxY + 45);
    doc.font('Helvetica').fillColor(COLORS.dark).text('École 3.0 / Réseau SEEEC (Ministère & Écoles)', 150, metaBoxY + 45);

    doc.font('Helvetica-Bold').fillColor(COLORS.body).text('Diffusion :', 70, metaBoxY + 65);
    doc.font('Helvetica').fillColor(COLORS.dark).text('Super Administrateurs, Directeurs, Développeurs, Équipes IT', 150, metaBoxY + 65);

    doc.font('Helvetica-Bold').fillColor(COLORS.body).text('Publication :', 70, metaBoxY + 85);
    doc.font('Helvetica').fillColor(COLORS.dark).text(`${version} • Année Académique 2026-2027`, 150, metaBoxY + 85);

    doc.font('Helvetica-Bold').fillColor(COLORS.body).text('Statut :', 70, metaBoxY + 105);
    doc.font('Helvetica-Bold').fillColor(COLORS.emerald).text('DOCUMENT OFFICIEL CERTIFIÉ ET OPÉRATIONNEL', 150, metaBoxY + 105);

    // Pied de page couverture
    doc.rect(0, pageHeight - 60, pageWidth, 60).fill(COLORS.primaryDark);
    doc.fillColor(COLORS.white).font('Helvetica').fontSize(9).text('© 2026 SEEEC — Tous droits réservés. Reproduction et diffusion réglementées.', 50, pageHeight - 38, { align: 'center', width: 495 });

    doc.addPage();
  }

  // Section Header
  addSectionTitle(title: string, tag?: string) {
    const doc = this.doc;
    if (doc.y > 660) doc.addPage();

    doc.moveDown(0.8);
    const startY = doc.y;

    if (tag) {
      doc.rect(50, startY, 90, 16).fill(COLORS.secondary);
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8).text(tag.toUpperCase(), 50, startY + 4, { width: 90, align: 'center' });
      doc.y = startY + 22;
    }

    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(16).text(title, 50, doc.y, { width: 495 });
    const lineY = doc.y + 4;
    doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1.5).strokeColor(COLORS.secondary).stroke();
    doc.y = lineY + 8;
  }

  // Subsection Header
  addSubSection(title: string) {
    const doc = this.doc;
    if (doc.y > 700) doc.addPage();
    doc.moveDown(0.5);
    doc.fillColor(COLORS.primaryDark).font('Helvetica-Bold').fontSize(12).text(title, 50, doc.y, { width: 495 });
    doc.moveDown(0.2);
  }

  // Paragraph Text
  addParagraph(text: string) {
    const doc = this.doc;
    if (doc.y > 720) doc.addPage();
    doc.fillColor(COLORS.body).font('Helvetica').fontSize(9.5).text(text, 50, doc.y, { width: 495, align: 'justify', lineGap: 3 });
    doc.moveDown(0.4);
  }

  // Bullet list
  addBulletList(items: { title: string; desc: string }[]) {
    const doc = this.doc;
    for (const item of items) {
      if (doc.y > 720) doc.addPage();
      const currentY = doc.y;
      
      // Point puce
      doc.circle(56, currentY + 5, 2.5).fill(COLORS.secondary);
      
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.primaryDark).text(item.title + ' : ', 65, currentY, { continued: true });
      doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body).text(item.desc, { width: 480, lineGap: 2 });
      doc.y += 3;
    }
    doc.moveDown(0.3);
  }

  // Callout Box
  addCallout(title: string, text: string, type: 'info' | 'success' | 'warning' = 'info') {
    const doc = this.doc;
    if (doc.y > 680) doc.addPage();

    const boxColor = type === 'success' ? COLORS.emerald : type === 'warning' ? COLORS.accent : COLORS.secondary;
    const bgColor = type === 'success' ? '#ECFDF5' : type === 'warning' ? '#FFFBEB' : '#F0F9FF';
    
    doc.moveDown(0.4);
    const startY = doc.y;
    const boxWidth = 495;
    
    // Mesure approximative de la hauteur
    const textHeight = doc.heightOfString(text, { width: boxWidth - 30 }) + 35;

    doc.roundedRect(50, startY, boxWidth, textHeight, 6).fillAndStroke(bgColor, boxColor);
    doc.rect(50, startY, 5, textHeight).fill(boxColor);

    doc.fillColor(boxColor).font('Helvetica-Bold').fontSize(10).text(title, 65, startY + 8);
    doc.fillColor(COLORS.dark).font('Helvetica').fontSize(8.5).text(text, 65, startY + 24, { width: boxWidth - 30, lineGap: 2 });

    doc.y = startY + textHeight + 8;
  }

  // Code Block Box
  addCodeBlock(title: string, code: string) {
    const doc = this.doc;
    if (doc.y > 660) doc.addPage();

    doc.moveDown(0.4);
    const startY = doc.y;
    const boxWidth = 495;
    const codeHeight = doc.heightOfString(code, { width: boxWidth - 24 }) + 28;

    doc.roundedRect(50, startY, boxWidth, codeHeight, 6).fillAndStroke('#0F172A', '#1E293B');

    // Title bar
    doc.fillColor('#94A3B8').font('Helvetica-Bold').fontSize(8).text(title.toUpperCase(), 62, startY + 7);
    doc.moveTo(50, startY + 18).lineTo(545, startY + 18).lineWidth(0.5).strokeColor('#334155').stroke();

    // Code content
    doc.fillColor('#38BDF8').font('Courier').fontSize(8).text(code, 62, startY + 24, { width: boxWidth - 24, lineGap: 2 });

    doc.y = startY + codeHeight + 8;
  }

  // Simple Clean Table
  addTable(headers: string[], rows: string[][], colWidths: number[]) {
    const doc = this.doc;
    if (doc.y > 650) doc.addPage();

    doc.moveDown(0.4);
    const startY = doc.y;
    const tableWidth = 495;
    const rowHeight = 22;

    // Header Row
    doc.rect(50, startY, tableWidth, rowHeight).fill(COLORS.primary);
    let xOffset = 50;
    headers.forEach((h, idx) => {
      const w = colWidths[idx] || 100;
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(8.5).text(h, xOffset + 6, startY + 6, { width: w - 12, align: 'left' });
      xOffset += w;
    });

    let currentY = startY + rowHeight;

    // Rows
    rows.forEach((row, rowIdx) => {
      if (currentY > 740) {
        doc.addPage();
        currentY = 60;
      }

      const isEven = rowIdx % 2 === 0;
      doc.rect(50, currentY, tableWidth, rowHeight).fill(isEven ? '#FFFFFF' : '#F8FAFC');
      doc.rect(50, currentY, tableWidth, rowHeight).lineWidth(0.5).strokeColor(COLORS.border).stroke();

      let cellX = 50;
      row.forEach((cell, cIdx) => {
        const w = colWidths[cIdx] || 100;
        doc.fillColor(COLORS.body).font('Helvetica').fontSize(8).text(cell, cellX + 6, currentY + 6, { width: w - 12 });
        cellX += w;
      });

      currentY += rowHeight;
    });

    doc.y = currentY + 10;
  }

  // Finalisation et pagination
  finalize(): Promise<void> {
    const doc = this.doc;
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Ne pas numéroter la couverture
      if (i === 0) continue;

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;

      // En-tête haut de page
      doc.moveTo(50, 40).lineTo(pageWidth - 50, 40).lineWidth(0.5).strokeColor(COLORS.border).stroke();
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5).text('ÉCOLE 3.0 • SYSTÈME INTÉGRÉ DE GESTION SCOLAIRE & ACADÉMIQUE', 50, 28);
      doc.text(this.docTitle, 320, 28, { width: 225, align: 'right' });

      // Pied de page bas de page
      doc.moveTo(50, pageHeight - 40).lineTo(pageWidth - 50, pageHeight - 40).lineWidth(0.5).strokeColor(COLORS.border).stroke();
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5).text('Document Officiel SEEEC — Reproduction et usage interne', 50, pageHeight - 32);
      doc.font('Helvetica-Bold').text(`Page ${i + 1} / ${range.count}`, 450, pageHeight - 32, { width: 95, align: 'right' });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      this.stream.on('finish', () => resolve());
      this.stream.on('error', (err) => reject(err));
    });
  }
}

/**
 * 1. GÉNÉRATION DU RAPPORT GLOBAL DE LA PLATEFORME
 */
async function generateGlobalReport() {
  const outputPath = path.resolve('..', 'RAPPORT_GLOBAL_PLATEFORME_ECOLE3.0.pdf');
  const builder = new DocumentPDFBuilder(
    outputPath,
    'RAPPORT TECHNIQUE & FONCTIONNEL GLOBAL',
    'Architecture, Modules Métiers, Sécurité RBAC et Spécifications Opérationnelles'
  );

  builder.drawCoverPage('Rapport d\'Ingénierie & Fonctionnel', 'Version 3.0 Stable — Août 2026');

  // 1. SYNTHÈSE EXÉCUTIVE
  builder.addSectionTitle('1. Synthèse Exécutive & Vision Stratégique', 'Général');
  builder.addParagraph(
    'La plateforme École 3.0 (SEEEC - Système d\'Exploitation pour les Établissements d\'Enseignement et de Communication) est une solution logicielle cloud et modulaire conçue spécifiquement pour moderniser, standardiser et fiabiliser la gestion pédagogique, administrative et financière des établissements scolaires primaires, secondaires et techniques (Côte d\'Ivoire et zone francophone).'
  );
  builder.addParagraph(
    'Elle résout les défis majeurs de l\'écosystème scolaire actuel : la lenteur des calculs de moyennes, les fraudes sur les bulletins de notes et cartes scolaires, le manque de transparence pour les parents, le cloisonnement des ressources pédagogiques et l\'absence de suivi automatisé de la conduite et de l\'assiduité.'
  );

  builder.addCallout(
    'Points Forts de la Plateforme École 3.0',
    '• Automatisation intégrale des calculs de moyennes et génération de bulletins officiels conformes en 1-clic.\n• Cartes scolaires numériques avec QR Code infalsifiable permettant la vérification d\'authenticité instantanée.\n• Système de validation institutionnelle par le Super Admin des inscriptions d\'écoles.\n• Séparation stricte de la Bibliothèque Numérique nationale et des supports de cours par chapitre.\n• Registre vie scolaire temps réel reliant les absences au barème officiel de conduite sur 20.',
    'success'
  );

  // 2. ARCHITECTURE TECHNIQUE & STACK
  builder.addSectionTitle('2. Architecture Système & Stack Technologique', 'Architecture');
  builder.addParagraph(
    'L\'application repose sur une architecture découplée Client-Serveur moderne (Frontend SPA en React/TypeScript et Backend REST API en Node.js/Express/TypeScript) communicant via HTTP/JSON sécurisé et WebSockets pour le temps réel.'
  );

  builder.addTable(
    ['Couche Applicative', 'Technologies Utilisées', 'Rôle & Justification Technique'],
    [
      ['Frontend UI/UX', 'React 18, TypeScript, Vite, TailwindCSS', 'Interface utilisateur réactive, typée et ultra-rapide (PWA)'],
      ['Backend API', 'Node.js, Express, TypeScript, Zod', 'API RESTful sécurisée avec validation stricte des entrées'],
      ['Base de Données', 'PostgreSQL (Supabase Pooler), Prisma ORM', 'Persistance relationnelle robuste avec migrations versionnées'],
      ['Authentification', 'JWT, bcrypt, RBAC Middleware', 'Sécurité multi-niveaux par rôle et par établissement'],
      ['Temps Réel', 'Socket.IO (WebSockets)', 'Messagerie instantanée inter-utilisateurs et notifications live'],
      ['Génération PDF', 'jsPDF, jsPDF-AutoTable, HTML2Canvas', 'Moteur de rendu vectoriel pour bulletins et cartes scolaires'],
      ['Stockage Fichiers', 'Supabase Storage Buckets', 'Hébergement sécurisé des documents, vidéos, audios et photos']
    ],
    [110, 155, 230]
  );

  // 3. CARTOGRAPHIE DES ESPACES & RÔLES
  builder.addSectionTitle('3. Cartographie Détaillée des 6 Espaces Utilisateurs', 'Modules');
  builder.addParagraph(
    'La plateforme applique une politique stricte de Contrôle d\'Accès Basé sur les Rôles (RBAC). Chaque type d\'utilisateur dispose d\'un tableau de bord sur-mesure et d\'outils dédiés :'
  );

  builder.addBulletList([
    { title: 'Super Administrateur (Direction Générale / Ministère)', desc: 'Supervise l\'ensemble du réseau national. Valide et active les nouveaux établissements inscrits, gère les abonnements, les types d\'enseignement, les matières, les niveaux et les configurations globales.' },
    { title: 'Directeur d\'Établissement', desc: 'Pilote son école. Gère les classes, les effectifs (élèves, enseignants, éducateurs), valide les bulletins trimestriels, produit les cartes scolaires de l\'école et diffuse les annonces officielles.' },
    { title: 'Éducateur (Vie Scolaire)', desc: 'Registre officiel des absences et retards par créneau horaire. Calcul automatisé des notes de conduite sur 20 (Coefficient 1), saisie des appréciations de vie scolaire sur les bulletins.' },
    { title: 'Enseignant', desc: 'Gestion des cours académiques, ajout de chapitres multimédias (fichiers, vidéos YouTube/MP4, audios, liens web), saisie des devoirs et notes, calcul des moyennes de classe.' },
    { title: 'Apprenant (Élève)', desc: 'Accès aux cours et chapitres, consultation des notes et devoirs, carte scolaire numérique individuelle avec QR Code, bibliothèque numérique et forum d\'entraide.' },
    { title: 'Parent d\'Élève', desc: 'Consultation en temps réel des notes, retards, absences et conduite de leurs enfants, téléchargement des bulletins scolaires officiels, messagerie directe avec l\'école.' }
  ]);

  // 4. FONCTIONNALITÉS MÉTIERS CLÉS
  builder.addSectionTitle('4. Fonctionnalités Métiers Clés', 'Fonctionnel');

  builder.addSubSection('4.1 Générateur Automatique de Bulletins Officiels');
  builder.addParagraph(
    'Le module de bulletins génère des documents officiels trimestriels et annuels aux normes nationales avec calcul automatique des moyennes par matière, pondération par coefficients, classement de classe, moyenne générale, mentions (Félicitations, Tableau d\'Honneur, Avertissement) et intégration de la note de conduite.'
  );

  builder.addSubSection('4.2 Cartes Scolaires Sécurisées avec QR Code');
  builder.addParagraph(
    'Chaque élève dispose d\'une carte d\'identité scolaire numérique générée au format standard ISO, incluant la photo d\'identité, le matricule national, la classe, l\'établissement et un QR Code chiffré redirigeant vers la page publique de vérification d\'authenticité.'
  );

  builder.addSubSection('4.3 Workflow de Validation & Activation des Écoles');
  builder.addParagraph(
    'Lorsqu\'un directeur inscrit une nouvelle école depuis la vitrine, le compte est créé au statut "En attente de validation" (isActive: false, subscriptionStatus: "PENDING"). Le Super Admin dispose d\'une interface d\'activation en 1-clic pour auditer l\'école et débloquer ses accès complets.'
  );

  builder.addSubSection('4.4 Bibliothèque Numérique & Supports de Cours');
  builder.addParagraph(
    'Séparation hermétique : la Bibliothèque Numérique regroupe les annales, manuels et fiches officielles téléchargeables, tandis que les supports de cours (vidéos, PDF, liens) restent attachés aux chapitres pédagogiques correspondants.'
  );

  // 5. MODÈLE DE DONNÉES
  builder.addSectionTitle('5. Schéma & Modèle de Données (Prisma ORM)', 'Base de Données');
  builder.addParagraph(
    'La base de données PostgreSQL comprend 30+ tables interconnectées garantissant l\'intégrité référentielle, la traçabilité des actions et l\'isolation des données entre établissements scolaires :'
  );

  builder.addBulletList([
    { title: 'School & Subscription', desc: 'Entité établissement (nom, code SCH-XXXX, ville, types) liée à son contrat de licence et son directeur.' },
    { title: 'User & Role', desc: 'Identifiants, mot de passe hashé bcrypt, rôles (SUPER_ADMIN, DIRECTEUR, EDUCATEUR, ENSEIGNANT, APPRENANT, PARENT).' },
    { title: 'Class & Enrollment', desc: 'Classes (6ème 1, 3ème A...) rattachées à un niveau, une école et regroupant les élèves inscrits.' },
    { title: 'Course, Chapter & Resource', desc: 'Arborescence pédagogique complète avec ressources multimédias sécurisées.' },
    { title: 'Evaluation, Grade & AnnualAverage', desc: 'Devoirs, notes coefficientées, moyennes périodiques et classements.' },
    { title: 'Absence & ConductRecord', desc: 'Événements de vie scolaire et note de conduite calculée automatiquement.' }
  ]);

  builder.addCallout(
    'Sécurité et Conformité des Données',
    'Toutes les requêtes API sont protégées par le middleware d\'authentification JWT et le contrôle d\'isolation par école (schoolId). Les mots de passe sont hashés avec un salage bcrypt à 10 tours.',
    'info'
  );

  await builder.finalize();
  console.log(`✅ Rapport global généré : ${outputPath}`);
}

/**
 * 2. GÉNÉRATION DU GUIDE D'INSTALLATION ET DÉPLOIEMENT
 */
async function generateDeploymentGuide() {
  const outputPath = path.resolve('..', 'GUIDE_DEPLOIEMENT_ET_UTILISATION_ECOLE3.0.pdf');
  const builder = new DocumentPDFBuilder(
    outputPath,
    'GUIDE D\'INSTALLATION, DÉPLOIEMENT & EXPLOITATION',
    'Manuel Technique Complet : Environnement Local, Production Cloud & Exploitation'
  );

  builder.drawCoverPage('Guide Déploiement & Exploitation', 'Manuel Technique — Août 2026');

  // 1. PRÉREQUIS & ENVIRONNEMENT
  builder.addSectionTitle('1. Prérequis & Environnement Système', 'Prérequis');
  builder.addParagraph(
    'Pour déployer et exploiter la plateforme École 3.0, l\'infrastructure doit répondre aux spécifications techniques suivantes :'
  );

  builder.addBulletList([
    { title: 'Node.js', desc: 'Version 18.x LTS, 20.x LTS ou supérieure (Node.js v24 supporté).' },
    { title: 'PostgreSQL / Supabase', desc: 'PostgreSQL 14+ ou instance Supabase avec pool de connexions (Transaction Pooler PGBouncer port 6543 / Direct port 5432).' },
    { title: 'Gestionnaire de paquets', desc: 'npm v9+, npx ou yarn.' },
    { title: 'Système d\'Exploitation', desc: 'Linux (Ubuntu 22.04 / Debian 12 recommandé en prod), Windows 10/11 ou macOS pour le dev.' },
    { title: 'Compte Cloud', desc: 'Vercel (Frontend), Render / Railway / VPS (Backend), Supabase (BDD & Stockage Fichiers).' }
  ]);

  // 2. INSTALLATION EN LOCAL (DEV)
  builder.addSectionTitle('2. Installation & Lancement en Environnement Local', 'Local Dev');
  builder.addParagraph(
    'Suivez ces étapes pour installer et exécuter l\'ensemble du projet en local :'
  );

  builder.addCodeBlock('Étape 1 : Cloner le Répertoire Git', 'git clone https://github.com/richkardigital/ecole3.0.git\ncd ecole3.0');

  builder.addCodeBlock('Étape 2 : Configuration Backend (server/.env)', 'PORT=5000\nDATABASE_URL="postgresql://user:pass@host:6543/postgres?pgbouncer=true"\nDIRECT_URL="postgresql://user:pass@host:5432/postgres"\nJWT_SECRET="votre_cle_secrete_jwt_super_longue_et_securisee"\nCORS_ORIGIN="http://localhost:5173"\nSUPABASE_URL="https://votre-projet.supabase.co"\nSUPABASE_KEY="votre_supabase_anon_key"');

  builder.addCodeBlock('Étape 3 : Installation & Migration Backend', 'cd server\nnpm install\nnpx prisma generate\nnpx prisma db push\nnpm run seed\nnpm run dev');

  builder.addCodeBlock('Étape 4 : Configuration & Lancement Frontend', 'cd ../client\nnpm install\n# Créer client/.env : VITE_API_URL=http://localhost:5000/api\nnpm run dev');

  builder.addCallout(
    'Comptes Démo Initialisés par le Seed',
    '• Super Admin : superadmin@example.com / password123\n• Directeur : directeur@ecole1.com / password123\n• Éducateur : educateur@ecole1.com / password123\n• Enseignant : enseignant@ecole1.com / password123\n• Apprenant : apprenant@ecole1.com / password123\n• Parent : parent@ecole1.com / password123',
    'success'
  );

  // 3. DÉPLOIEMENT EN PRODUCTION
  builder.addSectionTitle('3. Déploiement en Production Cloud', 'Production');
  
  builder.addSubSection('3.1 Déploiement du Frontend sur Vercel');
  builder.addParagraph(
    '1. Connectez votre dépôt GitHub à votre compte Vercel.\n2. Sélectionnez le dossier racine `client` comme Root Directory.\n3. Configurez la variable d\'environnement : `VITE_API_URL=https://api.votre-domaine.com/api`.\n4. Vérifiez la présence du fichier `client/vercel.json` pour la réécriture des routes SPA (Single Page Application).'
  );

  builder.addSubSection('3.2 Déploiement du Backend sur Render / Railway / VPS');
  builder.addParagraph(
    '1. Définissez le dossier racine sur `server`.\n2. Build Command : `npm install && npx prisma generate && npx tsc`.\n3. Start Command : `node dist/src/index.js`.\n4. Renseignez toutes les variables d\'environnement en production (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`).'
  );

  builder.addCodeBlock('Exemple de Configuration NGINX Reverse Proxy (VPS Linux)', 'server {\n    server_name api.ecole3.ci;\n    location / {\n        proxy_pass http://127.0.0.1:5000;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_cache_bypass $http_upgrade;\n    }\n}');

  // 4. GUIDE D'EXPLOITATION PAR RÔLE
  builder.addSectionTitle('4. Guide d\'Exploitation & Processus Métiers', 'Opérations');

  builder.addSubSection('Processus 1 : Inscription et Validation d\'un Établissement');
  builder.addParagraph(
    '1. Le directeur remplit le formulaire sur la vitrine (`/register-school`).\n2. Le compte est enregistré avec le statut "En attente de validation".\n3. Le Super Admin se connecte, se rend dans "Toutes les Écoles" (`/admin/schools`) ou "Abonnements" (`/admin/subscriptions`).\n4. Le Super Admin clique sur le bouton "Activer" : l\'école et le compte directeur sont activés instantanément.'
  );

  builder.addSubSection('Processus 2 : Configuration d\'une Nouvelle Année Scolaire');
  builder.addParagraph(
    '1. Dans l\'espace Super Admin, aller sur "Années Scolaires" (`/admin/academic-years`).\n2. Créer l\'année académique (ex: 2026-2027) et définir `isCurrent: true`.\n3. Les directeurs peuvent alors créer leurs classes et y affecter les élèves.'
  );

  builder.addSubSection('Processus 3 : Calcul des Notes de Conduite et Bulletins');
  builder.addParagraph(
    '1. L\'éducateur saisit les absences au fil de l\'eau.\n2. Dans "Gestion de la Conduite" (`/life/conduct`), cliquer sur "Calcul Automatique (Toute la classe)".\n3. Les notes de conduite sur 20 sont calculées et injectées automatiquement dans les bulletins trimestriels.'
  );

  // 5. MAINTENANCE & DÉPANNAGE
  builder.addSectionTitle('5. Maintenance, Sauvegardes & Dépannage', 'Maintenance');

  builder.addBulletList([
    { title: 'Sauvegarde de Base de Données', desc: 'Exécuter régulièrement : pg_dump -U postgres -h host -d dbname > backup_$(date +%F).sql' },
    { title: 'Erreur "Database Connection Pool"', desc: 'Vérifier que la variable DATABASE_URL pointe bien vers le port 6543 avec le paramètre ?pgbouncer=true.' },
    { title: 'Erreur "CORS Policy"', desc: 'Vérifier que la variable CORS_ORIGIN sur le serveur correspond exactement à l\'URL du frontend en production.' },
    { title: 'Synchronisation Schéma Prisma', desc: 'En cas d\'évolution du schéma, exécuter : npx prisma db push ou npx prisma migrate deploy.' }
  ]);

  builder.addCallout(
    'Assistance Technique & Support SEEEC',
    'Pour toute assistance relative à l\'infrastructure ou au paramétrage des serveurs, contactez l\'équipe technique à support@ecole3.0.ci ou consultez le dépôt officiel.',
    'info'
  );

  await builder.finalize();
  console.log(`✅ Guide de déploiement généré : ${outputPath}`);
}

async function main() {
  console.log('🚀 Début de génération des documents PDF officiels...');
  await generateGlobalReport();
  await generateDeploymentGuide();
  console.log('✨ Tous les documents PDF ont été générés avec succès !');
}

main().catch(console.error);
