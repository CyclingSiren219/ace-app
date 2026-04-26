// scripts/seedFirestore.js
// Run with: node scripts/seedFirestore.js
// Seeds Firestore with initial hub and courts data.
// Reads from .env using VITE_ prefix vars.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Parse .env file manually (no dotenv dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) envVars[key.trim()] = vals.join('=').trim();
  });
} catch (e) {
  console.error('❌ Could not read .env file:', e.message);
  process.exit(1);
}

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('🌱 Seeding Firestore...');

  const hubId = 'central_park';
  await setDoc(doc(db, 'hubs', hubId), {
    name: 'Central Park Tennis Center',
    total_courts: 4,
    hub_lat: 40.7128,
    hub_lng: -74.006,
    radius_meters: 50,
  });
  console.log('✅ Created hub:', hubId);

  for (let i = 1; i <= 4; i++) {
    const courtId = `court_${i}`;
    await setDoc(doc(db, 'hubs', hubId, 'courts', courtId), {
      status: 'open',
      current_player_uid: null,
    });
    console.log(`  ✅ Created court: ${courtId}`);
  }

  console.log('\n🎾 Firestore seeded successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
