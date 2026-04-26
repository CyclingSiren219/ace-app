// src/pages/DashboardPage.jsx
// Core map-first dashboard with Leaflet, court markers, geofence,
// floating UI elements, and bottom sheets.
import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  LogOut, Users, AlertTriangle, Bug, MapPin,
} from 'lucide-react';
import { useHub } from '../hooks/useHub';
import { useSilentSentry } from '../hooks/useSilentSentry';
import {
  claimCourt, joinWaitlist, leaveWaitlist, signOut, getUserDoc,
} from '../services/firebaseService';

const HUB_ID = 'central_park';

// Dark CartoDB tiles (free, no API key)
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const STATUS_COLORS = {
  open: '#D6FF00',
  active: '#8B3A3A',
  pending: '#FF8A00',
};
const STATUS_LABELS = {
  open: 'Available',
  active: 'In Play',
  pending: 'Releasing…',
};

// Generate court positions in a circle around the hub
const getCourtPos = (i, total, lat, lng) => {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2;
  const offset = 0.00015;
  return [lat + offset * Math.sin(angle), lng + offset * Math.cos(angle)];
};

// Build a Leaflet divIcon for a court marker
const createCourtIcon = (status, number) => {
  return L.divIcon({
    className: '',
    html: `<div class="court-marker ${status}">${number}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

// ── Auto-center map on hub ──
function MapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function DashboardPage({ user }) {
  const { hub, courts, waitlist, activeCourts, totalCourts, loading } = useHub(HUB_ID);

  const userCourtId = useMemo(() => {
    const c = courts.find((c) => c.current_player_uid === user.uid);
    return c?.id || null;
  }, [courts, user.uid]);

  const { isInside, distance, forceOutside, toggleForceOutside } =
    useSilentSentry(hub, userCourtId, user.uid, HUB_ID);

  // UI state
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showJoinSheet, setShowJoinSheet] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [groupSize, setGroupSize] = useState(2);
  const [isOpenMatch, setIsOpenMatch] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch player name when court selected
  useEffect(() => {
    if (selectedCourt?.current_player_uid) {
      getUserDoc(selectedCourt.current_player_uid).then(setSelectedPlayer);
    } else {
      setSelectedPlayer(null);
    }
  }, [selectedCourt]);

  const userWaitEntry = waitlist.find((w) => w.uid === user.uid);
  const userWaitPos = userWaitEntry ? waitlist.indexOf(userWaitEntry) + 1 : null;

  // ── Actions ──
  const handleClaim = async () => {
    if (!selectedCourt || !isInside) return;
    setActionLoading(true);
    try {
      await claimCourt(HUB_ID, selectedCourt.id, user.uid);
      setSelectedCourt(null);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      await joinWaitlist(HUB_ID, user.uid, groupSize, isOpenMatch);
      setShowJoinSheet(false);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    try { await leaveWaitlist(HUB_ID, user.uid); }
    catch (err) { alert(err.message); }
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch { /* handled by auth listener */ }
  };

  // Loading state
  if (loading || !hub) {
    return (
      <div className="loading-screen">
        <h1>ACE</h1>
        <span>Court Queue</span>
        <div className="spinner" />
      </div>
    );
  }

  const center = [hub.hub_lat, hub.hub_lng];

  return (
    <div className="dashboard">
      {/* ═══ MAP ═══ */}
      <MapContainer
        center={center}
        zoom={18}
        className="map-container"
        zoomControl={true}
        attributionControl={false}
      >
        <MapCenter center={center} zoom={18} />
        <TileLayer url={DARK_TILES} />

        {/* Geofence circle */}
        <Circle
          center={center}
          radius={hub.radius_meters || 50}
          pathOptions={{
            color: 'rgba(214, 255, 0, 0.4)',
            fillColor: 'rgba(214, 255, 0, 0.06)',
            fillOpacity: 1,
            weight: 2,
          }}
        />

        {/* Court markers */}
        {courts.map((court, i) => {
          const pos = getCourtPos(i, courts.length, hub.hub_lat, hub.hub_lng);
          return (
            <Marker
              key={court.id}
              position={pos}
              icon={createCourtIcon(court.status, i + 1)}
              eventHandlers={{
                click: () => setSelectedCourt(court),
              }}
            />
          );
        })}
      </MapContainer>

      {/* ═══ FLOATING STATS HEADER ═══ */}
      <div className="stats-header">
        <div className="stats-header-info">
          <h2>{hub.name}</h2>
          <p>{activeCourts} / {totalCourts} Courts In Use</p>
        </div>
        <div className="stats-header-actions">
          <div className={`sentry-dot ${isInside ? 'inside' : 'outside'}`} />
          <button className="btn-icon" onClick={handleSignOut} title="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ═══ OUT-OF-RANGE BANNER ═══ */}
      {!isInside && (
        <div className="oor-banner">
          <AlertTriangle size={18} color="#EF4444" />
          <p>OUTSIDE HUB: RETURN TO SAVE YOUR SPOT</p>
        </div>
      )}

      {/* ═══ WAITLIST STATUS BAR ═══ */}
      {userWaitEntry && (
        <div className="waitlist-bar">
          <div className="waitlist-bar-info">
            <label>Waitlist Position</label>
            <p>#{userWaitPos} of {waitlist.length}</p>
          </div>
          <div className="waitlist-bar-actions">
            <Users size={22} color="#D6FF00" />
            <button className="btn-danger-ghost" onClick={handleLeave}>Leave</button>
          </div>
        </div>
      )}

      {/* ═══ JOIN WAITLIST FAB ═══ */}
      {!userWaitEntry && !userCourtId && (
        <div className="fab-join">
          <button onClick={() => {
            if (!isInside) return alert('You must be inside the hub to join the waitlist.');
            setShowJoinSheet(true);
          }}>
            Join Waitlist
          </button>
        </div>
      )}

      {/* ═══ DEV TOGGLE ═══ */}
      <button className="dev-toggle" onClick={() => setShowDevPanel(!showDevPanel)} title="Dev Tools">
        <Bug size={18} />
      </button>

      {/* ═══ DEV PANEL ═══ */}
      {showDevPanel && (
        <div className="dev-panel">
          <h4>🔧 Dev Tools</h4>
          <p>Distance: {distance}m / {hub.radius_meters || 50}m</p>
          <p>Status: {isInside ? '🟢 Inside' : '🔴 Outside'}</p>
          <button
            className={`dev-mock-btn ${forceOutside ? 'active' : ''}`}
            onClick={toggleForceOutside}
          >
            {forceOutside ? '🔴 Mock: Outside' : 'Mock Out of Range'}
          </button>
        </div>
      )}

      {/* ═══ COURT DETAIL SHEET ═══ */}
      {selectedCourt && (
        <div className="overlay-backdrop" onClick={() => setSelectedCourt(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div style={{ marginBottom: 16 }}>
              <h3 className="court-detail-title">
                {selectedCourt.id.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              <div className="court-status-badge">
                <div
                  className="court-status-dot"
                  style={{ background: STATUS_COLORS[selectedCourt.status] }}
                />
                <span className="court-status-label">
                  {STATUS_LABELS[selectedCourt.status]}
                </span>
              </div>
            </div>

            {selectedPlayer && (
              <div className="info-card">
                <label>Current Player</label>
                <p>{selectedPlayer.username}</p>
              </div>
            )}

            <div className="info-card" style={{ marginBottom: 24 }}>
              <label>Waitlist</label>
              <p>{waitlist.length} {waitlist.length === 1 ? 'person' : 'people'} waiting</p>
              {userWaitPos && (
                <p className="ace-highlight">Your position: #{userWaitPos}</p>
              )}
            </div>

            {selectedCourt.status === 'open' ? (
              <button
                className={isInside ? 'btn-primary' : 'btn-secondary'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={!isInside || actionLoading}
                onClick={handleClaim}
              >
                {!isInside && <MapPin size={16} />}
                {actionLoading ? 'Claiming…' : isInside ? 'Claim Court' : 'Walk Into Hub'}
              </button>
            ) : !userWaitEntry ? (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedCourt(null);
                  if (!isInside) return alert('You must be inside the hub.');
                  setShowJoinSheet(true);
                }}
              >
                Join Waitlist
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ═══ JOIN WAITLIST SHEET ═══ */}
      {showJoinSheet && (
        <div className="overlay-backdrop" onClick={() => setShowJoinSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <h3>Join Waitlist</h3>
              <button className="sheet-close" onClick={() => setShowJoinSheet(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Group Size</label>
              <div className="group-selector">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    className={`group-option ${groupSize === n ? 'selected' : ''}`}
                    onClick={() => setGroupSize(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="match-type-card">
              <div>
                <h4>Match Type</h4>
                <p>{isOpenMatch ? 'Public / Open' : 'Private'}</p>
              </div>
              <button
                className={`toggle ${!isOpenMatch ? 'active' : ''}`}
                onClick={() => setIsOpenMatch(!isOpenMatch)}
              >
                <div className="toggle-knob" />
              </button>
            </div>

            <button
              className="btn-primary"
              disabled={actionLoading}
              onClick={handleJoin}
            >
              {actionLoading ? 'Joining…' : 'Confirm & Join'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
