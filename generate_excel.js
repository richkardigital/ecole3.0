import XLSX from 'xlsx';

const elevesData = [
  {
    'Matricule': 'ELV-26-001',
    'Prénom': 'Yao Cédric',
    'Nom': 'KOUASSI',
    'Email': 'yao.kouassi@test.ci',
    'Sexe': 'M',
    'Date de naissance': '2011-05-12',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020304'
  },
  {
    'Matricule': 'ELV-26-002',
    'Prénom': 'Akissi Grâce',
    'Nom': 'KOFFI',
    'Email': 'akissi.koffi@test.ci',
    'Sexe': 'F',
    'Date de naissance': '2011-11-03',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020305'
  },
  {
    'Matricule': 'ELV-26-003',
    'Prénom': 'Moussa',
    'Nom': 'BAMBA',
    'Email': 'moussa.bamba@test.ci',
    'Sexe': 'M',
    'Date de naissance': '2010-01-21',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020306'
  },
  {
    'Matricule': 'ELV-26-004',
    'Prénom': 'Affoué Marie',
    'Nom': "N'GUESSAN",
    'Email': 'affoue.nguessan@test.ci',
    'Sexe': 'F',
    'Date de naissance': '2011-08-15',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020307'
  },
  {
    'Matricule': 'ELV-26-005',
    'Prénom': 'Ibrahim',
    'Nom': 'TRAORÉ',
    'Email': 'ibrahim.traore@test.ci',
    'Sexe': 'M',
    'Date de naissance': '2011-02-04',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020308'
  },
  {
    'Matricule': 'ELV-26-006',
    'Prénom': 'Fanta',
    'Nom': 'TOURE',
    'Email': 'fanta.toure@test.ci',
    'Sexe': 'F',
    'Date de naissance': '2011-07-29',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020309'
  },
  {
    'Matricule': 'ELV-26-007',
    'Prénom': 'Konan Franck',
    'Nom': 'KOUAME',
    'Email': 'franck.kouame@test.ci',
    'Sexe': 'M',
    'Date de naissance': '2010-10-10',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020310'
  },
  {
    'Matricule': 'ELV-26-008',
    'Prénom': 'Aïssatou',
    'Nom': 'DIALLO',
    'Email': 'aissatou.diallo@test.ci',
    'Sexe': 'F',
    'Date de naissance': '2011-12-05',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020311'
  },
  {
    'Matricule': 'ELV-26-009',
    'Prénom': 'Kouadio Ange',
    'Nom': 'YAO',
    'Email': 'ange.yao@test.ci',
    'Sexe': 'M',
    'Date de naissance': '2010-06-19',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020312'
  },
  {
    'Matricule': 'ELV-26-010',
    'Prénom': 'Amenan Sylvie',
    'Nom': 'KONAN',
    'Email': 'sylvie.konan@test.ci',
    'Sexe': 'F',
    'Date de naissance': '2011-03-22',
    'Rôle': 'Apprenant',
    'Téléphone': '+2250701020313'
  }
];

const profsData = [
  {
    'Matricule': 'PRF-26-001',
    'Prénom': 'Ténéma',
    'Nom': 'YÉO',
    'Email': 'tenema.yeo@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1985-04-12',
    'Rôle': 'Enseignant',
    'Téléphone': '0102030405'
  },
  {
    'Matricule': 'PRF-26-002',
    'Prénom': 'Adama',
    'Nom': 'KONE',
    'Email': 'adama.kone@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1988-09-20',
    'Rôle': 'Enseignant',
    'Téléphone': '0506070809'
  },
  {
    'Matricule': 'PRF-26-003',
    'Prénom': 'Salimata',
    'Nom': 'COULIBALY',
    'Email': 's.coulibaly@ecole.ci',
    'Sexe': 'F',
    'Date de naissance': '1992-01-15',
    'Rôle': 'Enseignant',
    'Téléphone': '0708091011'
  },
  {
    'Matricule': 'PRF-26-004',
    'Prénom': 'Gnahoré',
    'Nom': 'ZADI',
    'Email': 'gnahore.zadi@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1983-11-05',
    'Rôle': 'Enseignant',
    'Téléphone': '0111223344'
  },
  {
    'Matricule': 'PRF-26-005',
    'Prénom': 'Kouamé Jean',
    'Nom': 'ALLAH',
    'Email': 'jean.allah@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1987-06-30',
    'Rôle': 'Enseignant',
    'Téléphone': '0555667788'
  },
  {
    'Matricule': 'PRF-26-006',
    'Prénom': 'Oumar',
    'Nom': 'SYLLA',
    'Email': 'oumar.sylla@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1990-03-25',
    'Rôle': 'Enseignant',
    'Téléphone': '0777889900'
  },
  {
    'Matricule': 'PRF-26-007',
    'Prénom': 'Flan',
    'Nom': 'GUEI',
    'Email': 'flan.guei@ecole.ci',
    'Sexe': 'M',
    'Date de naissance': '1986-08-14',
    'Rôle': 'Enseignant',
    'Téléphone': '0122334455'
  },
  {
    'Matricule': 'PRF-26-008',
    'Prénom': 'Mariam',
    'Nom': 'DIABATÉ',
    'Email': 'mariam.diabate@ecole.ci',
    'Sexe': 'F',
    'Date de naissance': '1994-12-02',
    'Rôle': 'Enseignant',
    'Téléphone': '0522334455'
  }
];

const wsEleves = XLSX.utils.json_to_sheet(elevesData);
const wbEleves = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbEleves, wsEleves, "Élèves 4ème A");
XLSX.writeFile(wbEleves, "./Eleves_4emeA.xlsx");

const wsProfs = XLSX.utils.json_to_sheet(profsData);
const wbProfs = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbProfs, wsProfs, "Professeurs 4ème");
XLSX.writeFile(wbProfs, "./Professeurs_4eme.xlsx");

console.log("Excel files created successfully!");
