# 📘 RAPPORT TECHNIQUE & FONCTIONNEL GLOBAL — PLATEFORME ÉCOLE 3.0 (SEEEC)

> **Document Officiel Institutionnel**  
> **Système :** SEEEC — Système d'Exploitation pour les Établissements d'Enseignement et de Communication  
> **Version :** 3.0 Stable • Année Académique 2026-2027  
> **Date de Publication :** Août 2026  
> **Statut :** Production Certifiée  

---

## 📑 Sommaire Exécutif

1. [Introduction & Vision Stratégique](#1-introduction--vision-stratégique)
2. [Architecture Technique & Stack Technologique](#2-architecture-technique--stack-technologique)
3. [Cartographie des 6 Espaces Utilisateurs (RBAC)](#3-cartographie-des-6-espaces-utilisateurs-rbac)
   - 3.1 [Espace Vitrine Publique & Souscription](#31-espace-vitrine-publique--souscription)
   - 3.2 [Espace Super Administrateur (Ministère / Direction Nationale)](#32-espace-super-administrateur-ministère--direction-nationale)
   - 3.3 [Espace Directeur d'Établissement](#33-espace-directeur-détablissement)
   - 3.4 [Espace Éducateur (Vie Scolaire & Discipline)](#34-espace-éducateur-vie-scolaire--discipline)
   - 3.5 [Espace Enseignant](#35-espace-enseignant)
   - 3.6 [Espace Apprenant (Élève)](#36-espace-apprenant-élève)
   - 3.7 [Espace Parent d'Élève](#37-espace-parent-délève)
4. [Modules Transversaux & Innovations Métiers](#4-modules-transversaux--innovations-métiers)
   - 4.1 [Générateur Automatique de Bulletins Officiels](#41-générateur-automatique-de-bulletins-officiels)
   - 4.2 [Cartes Scolaires Numériques Sécurisées avec QR Code](#42-cartes-scolaires-numériques-sécurisées-avec-qr-code)
   - 4.3 [Workflow de Validation & d'Activation des Écoles](#43-workflow-de-validation--dactivation-des-écoles)
   - 4.4 [Bibliothèque Numérique vs Supports de Cours](#44-bibliothèque-numérique-vs-supports-de-cours)
   - 4.5 [Gestion des Absences & Registre de Conduite](#45-gestion-des-absences--registre-de-conduite)
   - 4.6 [Messagerie Instantanée & Nos Annonces (Flash News)](#46-messagerie-instantanée--nos-annonces-flash-news)
5. [Modèle de Données Relationnel (Prisma ORM & PostgreSQL)](#5-modèle-de-données-relationnel-prisma-orm--postgresql)
6. [Sécurité, Intégrité des Données & Conformité](#6-sécurité-intégrité-des-données--conformité)

---

## 1. Introduction & Vision Stratégique

La plateforme **École 3.0** s'inscrit dans la dynamique de transformation numérique intégrale des systèmes éducatifs en Côte d'Ivoire et dans la zone francophone d'Afrique. Conçue comme un **ERP scolaire unifié et modulaire**, elle abolit les barrières entre administration, enseignants, éducateurs, élèves et parents.

### Les 5 Piliers Stratégiques :
1. **Éradication de la fraude scolaire** : Sécurisation cryptographique des cartes scolaires et bulletins par QR Code infalsifiable et signatures/cachets numériques.
2. **Gain de temps massif** : Automatisation intégrale des calculs de moyennes, des rangs, des mentions et des relevés de notes trimestriels/annuels en 1 clic.
3. **Assiduité & Discipline transparente** : Registre d'absences en temps réel corrélé directement au barème officiel de la note de conduite sur 20 (Coefficient 1).
4. **Pédagogie 3.0 & Ressources partagées** : Supports de cours multimédias (documents, vidéos MP4/YouTube, audios, liens web) et Bibliothèque Numérique nationale.
5. **Inclusion parentale instantanée** : Espace dédié permettant aux parents de suivre en temps réel la progression académique et comportementale de leurs enfants.

---

## 2. Architecture Technique & Stack Technologique

Le système s'articule autour d'une architecture découplée **Client-Serveur (SPA + RESTful API)** conçue pour la scalabilité, la haute disponibilité et la réactivité instantanée.

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND (CLIENT)                    │
│      React 18 • TypeScript • Vite • TailwindCSS        │
│          PWA Offline Ready • Lucide Icons              │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼─────────────────────────────┐
│                    BACKEND (SERVEUR)                   │
│      Node.js • Express • TypeScript • Zod Validation   │
│         JWT Auth • RBAC Middleware • Socket.IO         │
└──────────────────────────┬─────────────────────────────┘
                           │ Prisma ORM 5
┌──────────────────────────▼─────────────────────────────┐
│                   PERSISTANCE & CLOUD                  │
│       PostgreSQL (Supabase Pooler) • Supabase Storage  │
└────────────────────────────────────────────────────────┘
```

### Détail des Composants Techniques :

| Composant | Technologie | Description & Valeur Ajoutée |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 & TypeScript | SPA fluide, entièrement typée, composants modulaires et réutilisables. |
| **Tooling & Build** | Vite 5 | Compilation ultra-rapide, Hot Module Replacement (HMR). |
| **Styling & Design System** | TailwindCSS & Vanilla CSS | Design institutionnel soigné (Violet Royal `#4D3E90`, Bleu Ciel `#189CD8`). |
| **Backend REST API** | Express & TypeScript | Endpoints REST structurés avec typage strict et gestion centralisée des erreurs. |
| **ORM & Base de données** | Prisma 5 & PostgreSQL | Schéma déclaratif avec 30+ tables relationnelles, migrations automatiques et typage synchrone. |
| **Sécurité & Validation** | Zod, Helmet, Rate-Limit, bcrypt | Validation schématique de chaque payload, protection contre les attaques XSS/HPP et hashage fort (10 rounds). |
| **Moteur Temps Réel** | Socket.IO (WebSockets) | Synchronisation instantanée des discussions de forum, messagerie privée et alertes d'annonces. |
| **Génération PDF** | jsPDF, jsPDF-AutoTable, PDFKit | Rendu vectoriel haute précision pour bulletins scolaires, reçus, cartes d'élèves et rapports. |
| **Stockage Cloud** | Supabase Storage Buckets | Hébergement distribué et sécurisé pour logos d'écoles, signatures, tampons, photos d'élèves et supports. |

---

## 3. Cartographie des 6 Espaces Utilisateurs (RBAC)

### 3.1 Espace Vitrine Publique & Souscription
- **Présentation Institutionnelle** : Page d'accueil moderne avec mise en valeur des atouts de la plateforme.
- **Grille Tarifaire & Packs** : Offres d'abonnement adaptées (Découverte, Pro, Mixte).
- **Formulaire d'Inscription Multi-étapes** : Inscription d'un établissement en 3 étapes (Profil Directeur, Identité de l'École, Choix du Pack).
- **Recherche Express Parent** : Consultation rapide du dossier scolaire de l'enfant sans connexion obligatoire.
- **Vérification d'Authenticité** : Validation publique par QR Code des bulletins et cartes scolaires.

### 3.2 Espace Super Administrateur (Ministère / Direction Nationale)
- **Supervision Multi-Établissements** : Monitoring global de toutes les écoles connectées au réseau SEEEC.
- **Workflow de Validation en 1-Clic** : Réception des demandes d'inscription d'écoles, audit des pièces et activation immédiate des accès.
- **Gestion des Formules d'Abonnement** : Création, modification et tarification des packs d'abonnement (`/admin/subscriptions`).
- **Gestion des Référentiels Nationaux** : Types d'enseignement, types d'établissements, matières nationales, niveaux et années scolaires.
- **Modération Globale** : Gestion des utilisateurs, surveillance des logs d'audit et diffusion de Flash News nationales.

### 3.3 Espace Directeur d'Établissement
- **Pilotage de l'École** : Dashboard avec effectifs totaux, classes ouvertes, enseignants affectés et taux de présence.
- **Gestion des Classes & Effectifs** : Création des classes par niveau, inscription des élèves et affectation des professeurs principaux.
- **Validation des Bulletins** : Relecture, approbation et édition des bulletins trimestriels avec signature et cachet numérisés.
- **Génération des Cartes Scolaires** : Impression en masse des cartes d'élèves recto-verso avec QR Code certifié.
- **Nos Annonces** : Diffusion d'informations officielles ciblées (élèves, enseignants, parents).

### 3.4 Espace Éducateur (Vie Scolaire & Discipline)
- **Registre Officiel des Absences** : Saisie rapide des absences et retards par classe, élève et créneau horaire avec motif et justificatif.
- **Gestion de la Conduite** : Calculateur automatique de la note de conduite sur 20 basé sur le barème officiel des absences.
- **Appréciation de Vie Scolaire** : Injection directe du commentaire de l'éducateur sur le bulletin officiel de chaque élève.

### 3.5 Espace Enseignant
- **Mes Cours & Chapitres** : Structuration de l'arborescence des cours avec chapitres et objectifs pédagogiques.
- **Supports Multimédias** : Intégration de documents (PDF, Word, Excel), vidéos YouTube/MP4, notes vocales et liens web.
- **Saisie des Devoirs & Évaluations** : Enregistrement des notes avec coefficients, calcul automatique des moyennes de classe.
- **Forum de Discussion** : Animation des échanges pédagogiques et réponse aux questions des apprenants.

### 3.6 Espace Apprenant (Élève)
- **Tableau de Bord Personnel** : Planning des cours, devoirs à rendre et dernières notes publiées.
- **Accès aux Cours** : Consultation des cours, visionnage des vidéos pédagogiques et téléchargement des supports.
- **Ma Carte Scolaire Numérique** : Carte d'identité scolaire accessible sur smartphone avec QR Code infalsifiable.
- **Mes Bulletins & Relevés** : Consultation et téléchargement des bulletins trimestriels dès validation par la direction.
- **Bibliothèque Numérique** : Accès au répertoire des manuels scolaires officiels et fiches de révision.

### 3.7 Espace Parent d'Élève
- **Suivi Multi-Enfants** : Vue unifiée permettant à un parent de suivre plusieurs enfants inscrits dans différents niveaux ou classes.
- **Alertes Assiduité & Conduite** : Notification immédiate en cas d'absence non justifiée ou de retard signalé par la vie scolaire.
- **Consultation des Résultats** : Notes, classements et téléchargement du bulletin scolaire en PDF certifié.
- **Contact Établissement** : Messagerie directe avec l'administration et le corps professoral.

---

## 4. Modules Transversaux & Innovations Métiers

### 4.1 Générateur Automatique de Bulletins Officiels
- **Conformité Nationale** : Modèle de bulletin standardisé incluant moyennes d'interrogations, devoirs surveillés, moyenne de classe, rang et mentions.
- **Note de Conduite Intégrée** : Matière officielle à coefficient 1 reflétant l'assiduité de l'élève.
- **Cachet & Signature Électroniques** : Tampon officiel et signature du directeur intégrés directement dans le rendu PDF.
- **QR Code de Sécurité** : Lien de traçabilité permettant aux autorités et universités de certifier l'authenticité du document.

### 4.2 Cartes Scolaires Numériques Sécurisées
- **Format Standardisé ISO** : Carte recto/verso aux couleurs de l'établissement avec photo de l'élève, matricule, classe et année scolaire.
- **QR Code Dynamique** : Scan instantané par caméra smartphone affichant le statut de scolarité actif de l'élève en temps réel.

### 4.3 Workflow de Validation Institutionnelle des Écoles
- **Statut "En Attente de Validation"** : Les nouvelles inscriptions depuis la vitrine sont bloquées par défaut (`isActive: false`, `subscriptionStatus: "PENDING"`).
- **Validation Super Admin** : Activation sécurisée en 1-clic débloquant simultanément l'établissement, le compte du directeur et son abonnement.

### 4.4 Séparation Hermétique des Ressources
- **Bibliothèque Numérique (Librairie 3.0)** : Répertoire public/institutionnel des manuels, fascicules et annales par niveau et matière.
- **Supports de Chapitres de Cours** : Ressources spécifiques attachées à la progression pédagogique de l'enseignant.

---

## 5. Modèle de Données Relationnel (Prisma ORM)

```prisma
model School {
  id                   String        @id @default(uuid())
  name                 String
  code                 String        @unique
  ville                String?
  address              String?
  phone                String?
  email                String?
  isActive             Boolean       @default(true)
  subscriptionStatus   String        @default("ACTIVE")
  subscriptionId       String?
  managerId            String?       @unique
  users                User[]
  classes              Class[]
  academicYears        AcademicYear[]
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  firstName String
  lastName  String
  role      Role     // SUPER_ADMIN, DIRECTEUR, EDUCATEUR, ENSEIGNANT, APPRENANT, PARENT
  isActive  Boolean  @default(true)
  schoolId  String?
}
```

---

## 6. Sécurité, Intégrité & Conformité

- **Isolation Multi-Tenant** : Cloisonnement strict des données scolaires par `schoolId` sur toutes les requêtes Prisma.
- **Chiffrement des Mots de Passe** : Salage et hashage bcrypt unidirectionnel.
- **Protection des Endpoints** : Middlewares `authenticate` et `requireRole([...])` vérifiant les permissions sur chaque route.
- **Conformité RGPD / Protection des Données Personnelles** : Données des mineurs protégées, aucun partage tiers non consenti.

---
*Fin du Rapport Global — Plateforme École 3.0 / Réseau SEEEC*
