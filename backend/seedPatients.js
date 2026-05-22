const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Unable to open database', err);
    process.exit(1);
  }
});

const wilayas = ['Tlemcen', 'Oran', 'Alger', 'Bechar', 'Sidi Bel Abbes', 'Ain Temouchent'];

const dairasByWilaya = {
  'Tlemcen': ['Maghnia', 'Remchi', 'Nedroma', 'Mansourah'],
  'Oran': ['Bir El Djir', 'Es Senia', 'Arzew'],
  'Alger': ['Bab Ezzouar', 'Hydra', 'Kouba'],
  'Bechar': ['Bechar', 'Kenadsa'],
  'Sidi Bel Abbes': ['Telagh', 'Ras El Ma'],
  'Ain Temouchent': ['El Amria', 'Hammam Bouhadjar'],
};

const cancerTypeNames = ['Sein', 'Poumon', 'Colon', 'Prostate', 'Leucemie', 'Estomac', 'Foie', 'Col de l’utérus'];

const annees = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePatientSeeds(count) {
  const seeds = [];
  for (let i = 0; i < count; i++) {
    const wilaya = randomFrom(wilayas);
    const daira = randomFrom(dairasByWilaya[wilaya]);
    const sexe = randomFrom(['Masculin', 'Feminin']);
    const age = randomInt(20, 80);
    const annee = randomFrom(annees);

    // Realistic cancer combinations
    let cancer;
    if (sexe === 'Masculin') {
      cancer = randomFrom(['Poumon', 'Colon', 'Prostate', 'Leucemie', 'Estomac', 'Foie']);
    } else {
      cancer = randomFrom(['Sein', 'Poumon', 'Colon', 'Leucemie', 'Estomac', 'Foie', 'Col de l’utérus']);
    }

    seeds.push([wilaya, daira, sexe, age, cancer, annee]);
  }
  return seeds;
}

const patientSeeds = generatePatientSeeds(50); // Generate 50 records for diversity

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function seed() {
  try {
    await runQuery('BEGIN TRANSACTION');

    // Insert static entities if missing
    for (const name of wilayas) {
      await runQuery('INSERT OR IGNORE INTO patients_wilaya(name) VALUES (?)', [name]);
    }

    for (const name of cancerTypeNames) {
      await runQuery('INSERT OR IGNORE INTO patients_cancertype(name, cim10_code) VALUES (?, ?)', [name, null]);
    }

    for (const [wilayaName, communeName, sexe, age, cancerName, annee] of patientSeeds) {
      const wilayaRow = await getQuery('SELECT id FROM patients_wilaya WHERE name = ?', [wilayaName]);
      if (!wilayaRow) throw new Error(`Wilaya not found: ${wilayaName}`);

      await runQuery('INSERT OR IGNORE INTO patients_commune(name, postal_code, wilaya_id) VALUES (?, ?, ?)', [communeName, '00000', wilayaRow.id]);

      const communeRow = await getQuery('SELECT id FROM patients_commune WHERE name = ? AND wilaya_id = ?', [communeName, wilayaRow.id]);
      if (!communeRow) throw new Error(`Commune not found: ${communeName}`);

      const cancerTypeRow = await getQuery('SELECT id FROM patients_cancertype WHERE name = ?', [cancerName]);
      if (!cancerTypeRow) throw new Error(`Cancer type not found: ${cancerName}`);

      const now = new Date();
      const createdAt = `${formatDate(now)} 00:00:00`;
      const birthYear = new Date().getFullYear() - age;
      const dateNaissance = `${birthYear}-06-15`;
      const numeroDossier = `SEED-${wilayaName.slice(0, 3).toUpperCase()}-${communeRow.id}-${annee}-${Math.floor(Math.random() * 10000)}`;
      const firstName = `Patient${Math.floor(Math.random() * 1000)}`;
      const lastName = `Seed`;

      const res = await runQuery(
        'INSERT INTO patients_patient(numero_dossier, date_naissance, sexe, created_at, updated_at, first_name, last_name, phone, data_source, is_merged, commune_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [numeroDossier, dateNaissance, sexe, createdAt, createdAt, firstName, lastName, '0000000000', 'seed', 0, communeRow.id]
      );

      const patientId = res.lastID;
      await runQuery(
        'INSERT INTO patients_cancer(stade_clinique, stade_pathologique, tnm, grade, date_diagnostic, data_source, created_at, updated_at, patient_id, cancer_type_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['III', 'III', 'T2N1M0', '2', `${annee}-06-15`, 'seed', createdAt, createdAt, patientId, cancerTypeRow.id]
      );
    }

    await runQuery('COMMIT');
    console.log('Seed data inserted successfully.');
  } catch (err) {
    console.error('Error seeding data:', err);
    await runQuery('ROLLBACK');
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed.');
    });
  }
}

seed();
