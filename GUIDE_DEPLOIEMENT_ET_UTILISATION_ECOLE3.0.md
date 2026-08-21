# 🚀 GUIDE COMPLET D'INSTALLATION, DÉPLOIEMENT & UTILISATION OPÉRATIONNELLE — ÉCOLE 3.0

> **Manuel Technique & Guide d'Exploitation Officiel**  
> **Système :** SEEEC — Plateforme École 3.0  
> **Version :** 3.0 Stable • Année Académique 2026-2027  
> **Dépôt Officiel :** https://github.com/richkardigital/ecole3.0.git  

---

## 📑 Sommaire du Guide

1. [Prérequis & Environnement Système](#1-prérequis--environnement-système)
2. [Installation & Lancement en Environnement Local (Développement)](#2-installation--lancement-en-environnement-local-développement)
3. [Configuration des Variables d'Environnement (.env)](#3-configuration-des-variables-denvironnement-env)
4. [Guide de Déploiement Complet en Production](#4-guide-de-déploiement-complet-en-production)
   - 4.1 [Déploiement Frontend sur Vercel](#41-déploiement-frontend-sur-vercel)
   - 4.2 [Déploiement Backend sur Render / Railway](#42-déploiement-backend-sur-render--railway)
   - 4.3 [Déploiement Full-Stack sur VPS Linux (Ubuntu / NGINX / PM2)](#43-déploiement-full-stack-sur-vps-linux-ubuntu--nginx--pm2)
5. [Configuration des Services Tiers (Supabase, Stockage, SMTP)](#5-configuration-des-services-tiers-supabase-stockage-smtp)
6. [Guide d'Exploitation Opérationnelle Pas-à-Pas par Rôle](#6-guide-dexploitation-opérationnelle-pas-à-pas-par-rôle)
   - 6.1 [Guide Super Administrateur](#61-guide-super-administrateur)
   - 6.2 [Guide Directeur d'Établissement](#62-guide-directeur-détablissement)
   - 6.3 [Guide Éducateur (Vie Scolaire)](#63-guide-éducateur-vie-scolaire)
   - 6.4 [Guide Enseignant](#64-guide-enseignant)
   - 6.5 [Guide Apprenant & Parent](#65-guide-apprenant--parent)
7. [Maintenance, Sauvegardes & Dépannage (Troubleshooting)](#7-maintenance-sauvegardes--dépannage-troubleshooting)

---

## 1. Prérequis & Environnement Système

Avant d'installer ou de déployer la plateforme, assurez-vous que les outils suivants sont installés sur votre machine ou serveur :

- **Node.js** : Version `18.x`, `20.x` (LTS recommandé) ou `24.x`.
- **Git** : Installé et configuré.
- **Gestionnaire de paquets** : `npm` (inclus avec Node.js), `npx` ou `yarn`.
- **Base de données** : PostgreSQL 14+ ou instance Cloud Supabase Database.
- **Système d'exploitation supporté** : Linux (Ubuntu 22.04 LTS recommandé en prod), Windows 10/11 ou macOS.

---

## 2. Installation & Lancement en Environnement Local (Développement)

### Étape 1 : Cloner le Répertoire GitHub
```bash
git clone https://github.com/richkardigital/ecole3.0.git
cd ecole-connecte-new
```

### Étape 2 : Installation & Lancement du Backend
```bash
# Se rendre dans le dossier server
cd server

# Installer les dépendances
npm install

# Générer le client Prisma ORM
npx prisma generate

# Pousser le schéma vers la base de données
npx prisma db push

# Exécuter le seed des données par défaut (Super Admin, rôles, matières, souscriptions)
npm run seed

# Lancer le serveur backend en mode développement (Port 5000)
npm run dev
```

### Étape 3 : Installation & Lancement du Frontend
```bash
# Ouvrir un second terminal et se rendre dans client
cd client

# Installer les dépendances
npm install

# Lancer le serveur de développement Vite (Port 5173)
npm run dev
```

Accédez ensuite à l'application dans votre navigateur : **`http://localhost:5173`**.

---

## 3. Configuration des Variables d'Environnement (.env)

### Fichier `server/.env` (Backend) :
```env
# Port d'écoute du serveur Express
PORT=5000

# URL de connexion PostgreSQL (Pooler Supabase port 6543 avec pgbouncer)
DATABASE_URL="postgresql://postgres.votre-projet:motdepasse@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# URL directe PostgreSQL (Port 5432 standard pour les migrations Prisma)
DIRECT_URL="postgresql://postgres.votre-projet:motdepasse@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Clé secrète de signature des Tokens JWT
JWT_SECRET="votre_cle_secrete_jwt_super_longue_et_aleatoire_2026"

# Origines autorisées pour les requêtes CORS
CORS_ORIGIN="http://localhost:5173,https://ecole3.ci,https://votre-app.vercel.app"

# Configuration Supabase Storage (Upload de fichiers et images)
SUPABASE_URL="https://votre-projet.supabase.co"
SUPABASE_KEY="votre_cle_anon_ou_service_role_supabase"
```

### Fichier `client/.env` (Frontend) :
```env
# URL de l'API Backend
VITE_API_URL="http://localhost:5000/api"
```

---

## 4. Guide de Déploiement Complet en Production

### 4.1 Déploiement Frontend sur Vercel
1. Rendez-vous sur **[Vercel Dashboard](https://vercel.com)** et cliquez sur **Add New Project**.
2. Importez le dépôt GitHub `richkardigital/ecole3.0`.
3. Configurez les paramètres du projet :
   - **Framework Preset** : `Vite`
   - **Root Directory** : `client`
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
4. Ajoutez la variable d'environnement :
   - `VITE_API_URL` = `https://api.votre-domaine.com/api` (ou l'URL de votre backend Render/Railway).
5. Cliquez sur **Deploy**.

> **Note SPA Routing** : Le fichier `client/vercel.json` est déjà préconfiguré pour rediriger toutes les requêtes vers `index.html` :
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

### 4.2 Déploiement Backend sur Render ou Railway

#### Déploiement sur Render :
1. Créez un **Web Service** connecté au dépôt GitHub.
2. Définissez le **Root Directory** sur `server`.
3. **Environment** : `Node`
4. **Build Command** : `npm install && npx prisma generate && npx tsc`
5. **Start Command** : `node dist/src/index.js`
6. Ajoutez les variables d'environnement dans l'onglet **Environment** (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_KEY`).

---

### 4.3 Déploiement Full-Stack sur VPS Linux (Ubuntu / Debian)

#### 1. Préparation du serveur VPS :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm git nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

#### 2. Déploiement du Backend avec PM2 :
```bash
cd /var/www/ecole3/server
npm install
npx prisma generate
npx tsc
pm2 start dist/src/index.js --name "ecole3-api"
pm2 save
pm2 startup
```

#### 3. Configuration NGINX Reverse Proxy & SSL :
Créez `/etc/nginx/sites-available/ecole3` :
```nginx
server {
    server_name api.ecole3.ci;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Activez le site et installez le certificat SSL Let's Encrypt :
```bash
sudo ln -s /etc/nginx/sites-available/ecole3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.ecole3.ci
```

---

## 5. Guide d'Exploitation Opérationnelle Pas-à-Pas

### 5.1 Guide Super Administrateur (Direction Générale / Ministère)
1. **Connexion** : Rendez-vous sur `/login` et utilisez vos identifiants Super Admin.
2. **Initialisation de l'Année Académique** :
   - Allez sur **Années Scolaires** (`/admin/academic-years`).
   - Créez l'année scolaire (ex: `2026-2027`), définissez les dates de début/fin et cochez `Année en cours (Actif)`.
3. **Validation & Activation d'une Nouvelle École** :
   - Lorsqu'une école s'inscrit, rendez-vous sur **Toutes les Écoles** (`/admin/schools`) ou **Abonnements** (`/admin/subscriptions`).
   - Repérez le badge ambre `En attente de validation`.
   - Cliquez sur le bouton vert **`Activer`** : l'école et le compte du Directeur sont activés immédiatement.

---

### 5.2 Guide Directeur d'Établissement
1. **Création des Classes** :
   - Accédez à **Classes & Effectifs** (`/directeur/classes`).
   - Cliquez sur `Nouvelle Classe`, choisissez le niveau officiel (ex: 6ème, Terminale D) et donnez un nom (ex: 6ème A).
2. **Enregistrement des Enseignants & Élèves** :
   - Allez sur **Mes Utilisateurs** (`/directeur/users`).
   - Créez les comptes enseignants et éducateurs, ou importez la liste des élèves par fichier Excel.
3. **Génération des Cartes Scolaires** :
   - Rendez-vous sur **Cartes Scolaires** (`/directeur/cards`).
   - Sélectionnez la classe et cliquez sur `Générer les cartes scolaires (PDF)`.
4. **Validation des Bulletins** :
   - À la fin du trimestre, accédez à **Bulletins Trimestriels** (`/directeur/report-cards`).
   - Validez les moyennes et téléchargez les bulletins officiels signés.

---

### 5.3 Guide Éducateur (Vie Scolaire)
1. **Saisie des Absences Quotidiennes** :
   - Allez sur **Gestion des Absences** (`/life/absences`).
   - Sélectionnez la classe, l'élève, la date et le créneau horaire, puis précisez si l'absence est justifiée ou non.
2. **Calcul Automatique de la Conduite** :
   - Accédez à **Gestion de la Conduite** (`/life/conduct`).
   - Sélectionnez la classe et le trimestre, puis cliquez sur `Calcul Automatique (Toute la classe)`.
   - La note sur 20 est calculée et intégrée instantanément au bulletin.

---

### 5.4 Guide Enseignant
1. **Création d'un Cours & Chapitres** :
   - Allez sur **Mes Cours** (`/enseignant/courses`).
   - Créez un cours pour votre classe, ajoutez les chapitres d'apprentissage et déposez vos supports (PDF, Vidéos YouTube/MP4, notes audio, liens web).
2. **Saisie des Notes & Devoirs** :
   - Accédez à **Saisie Notes & Bulletins** (`/enseignant/report-cards`).
   - Saisissez les notes d'interrogations et de devoirs surveillés. Les moyennes pondérées se calculent automatiquement.

---

## 6. Maintenance, Sauvegardes & Dépannage (Troubleshooting)

### 1. Sauvegarde Automatique de la Base de Données :
```bash
# Sauvegarder la base de données PostgreSQL
pg_dump -U postgres -h aws-0-eu-central-1.pooler.supabase.com -p 5432 postgres > backup_$(date +%Y%m%d).sql
```

### 2. Dépannage des Erreurs Courantes :

| Symptôme / Erreur | Cause Probable | Solution Recommandée |
| :--- | :--- | :--- |
| **`Connection pool timeout`** | Trop de connexions ouvertes sur PostgreSQL | Utiliser l'URL de connexion du pooler Supabase (`port 6543` avec `?pgbouncer=true`). |
| **`CORS Policy Error`** | L'URL du frontend n'est pas dans `CORS_ORIGIN` | Vérifier et mettre à jour `CORS_ORIGIN` dans `server/.env` pour inclure l'URL exacte du client. |
| **`Compte en cours d'activation`** | L'école n'a pas encore été activée | Le Super Admin doit se rendre sur `/admin/schools` et cliquer sur **Activer**. |
| **`Token JWT Expiré`** | Session utilisateur dépassée (24h) | L'utilisateur doit se reconnecter sur `/login`. |

---
*Fin du Guide de Déploiement & d'Exploitation — Plateforme École 3.0*
