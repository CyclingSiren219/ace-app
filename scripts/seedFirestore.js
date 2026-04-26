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

    // Inside seed() function in scripts/seedFirestore.js
  const hubId = 'usf_varsity_courts'; // Unique ID for the hub
  await setDoc(doc(db, 'hubs', hubId), {
    name: 'USF Varsity Tennis Courts',
    total_courts: 12,           // Updated number of courts
    hub_lat: 28.0625,           // Latitude near USF
    hub_lng: -82.4130,          // Longitude near USF
    radius_meters: 100,         // Geofencing radius
  });
  console.log('✅ Created hub:', hubId);

// Update the loop to create 12 courts instead of 4
for (let i = 1; i <= 12; i++) {
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
