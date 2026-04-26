# 🎾 Ace App (Web)

**Real-time, GPS-enforced tennis court queue management — web edition.**

## Quick Start

```bash
# 1. Install deps
npm install

# 2. Add your Firebase credentials to .env (use VITE_ prefix)
cp .env.example .env

# 3. Seed Firestore with hub + courts
npm run seed

# 4. Start dev server
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Auth + DB | Firebase Auth + Firestore |
| Maps | Leaflet + react-leaflet (free, no API key) |
| Location | Browser Geolocation API |
| Icons | Lucide React |
| Styling | Vanilla CSS with custom properties |

## Project Structure

```
ace-app-1/
├── index.html                       # Vite entry w/ Inter font + Leaflet CSS
├── vite.config.js                   # Vite + React plugin
├── src/
│   ├── main.jsx                     # React DOM mount
│   ├── App.jsx                      # Auth-gated routing
│   ├── index.css                    # Full dark theme design system
│   ├── config/firebase.js           # Firebase singleton
│   ├── hooks/
│   │   ├── useAuth.js               # Auth state listener
│   │   ├── useHub.js                # Real-time hub/courts/waitlist
│   │   └── useSilentSentry.js       # Geofencing (browser Geolocation API)
│   ├── pages/
│   │   ├── LoginPage.jsx            # Email/password login
│   │   ├── SignUpPage.jsx           # Registration
│   │   └── DashboardPage.jsx        # Map-first dashboard
│   └── services/firebaseService.js  # All Firebase operations
├── scripts/seedFirestore.js         # DB seed script
├── .env                             # Firebase creds (git-ignored)
└── .env.example                     # Template
```

## Key Differences from Mobile Version

- **Maps**: Leaflet with free CartoDB dark tiles (no API key required)
- **Location**: Browser Geolocation API instead of expo-location
- **Notifications**: Browser Notification API instead of expo-notifications
- **Styling**: Vanilla CSS with design tokens instead of NativeWind
- **Navigation**: React Router instead of React Navigation
