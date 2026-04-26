// src/hooks/useSilentSentry.js
// Web version — uses browser Geolocation API + setInterval instead of expo-location.
import { useState, useEffect, useRef, useCallback } from 'react';
import { setCourtPending, releaseCourt } from '../services/firebaseService';

const PENDING_MS = 5 * 60 * 1000;
const RELEASE_MS = 10 * 60 * 1000;

// Haversine distance in meters
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const toRad = (d) => d * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useSilentSentry = (hubData, courtId, uid, hubId = 'central_park') => {
  const [isInside, setIsInside] = useState(true);
  const [distance, setDistance] = useState(0);
  const [forceOutside, setForceOutside] = useState(false);
  const pendingTimer = useRef(null);
  const releaseTimer = useRef(null);
  const watchId = useRef(null);
  const forceRef = useRef(false);

  // Keep force ref in sync
  useEffect(() => { forceRef.current = forceOutside; }, [forceOutside]);

  // Foreground geolocation watcher
  useEffect(() => {
    if (!hubData || !navigator.geolocation) return;

    const onPos = (pos) => {
      let dist = haversine(
        pos.coords.latitude, pos.coords.longitude,
        hubData.hub_lat, hubData.hub_lng
      );
      if (forceRef.current) dist = (hubData.radius_meters || 50) + 100;
      setDistance(Math.round(dist));
      setIsInside(dist <= (hubData.radius_meters || 50));
    };

    const onErr = (err) => console.warn('Geolocation error:', err.message);

    watchId.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    });

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [hubData]);

  // Silent Sentry enforcement timers (when user has a court)
  useEffect(() => {
    if (!courtId || !uid || isInside) {
      // Clear timers if user came back or has no court
      clearTimeout(pendingTimer.current);
      clearTimeout(releaseTimer.current);
      pendingTimer.current = null;
      releaseTimer.current = null;
      return;
    }

    // User is outside and has a court — start timers (only once)
    if (!pendingTimer.current) {
      pendingTimer.current = setTimeout(async () => {
        try { await setCourtPending(hubId, courtId); } catch (e) { console.error(e); }
      }, PENDING_MS);

      releaseTimer.current = setTimeout(async () => {
        try { await releaseCourt(hubId, courtId); } catch (e) { console.error(e); }
        pendingTimer.current = null;
        releaseTimer.current = null;
      }, RELEASE_MS);
    }

    return () => {
      clearTimeout(pendingTimer.current);
      clearTimeout(releaseTimer.current);
      pendingTimer.current = null;
      releaseTimer.current = null;
    };
  }, [courtId, uid, isInside, hubId]);

  const toggleForceOutside = useCallback(() => {
    setForceOutside((p) => !p);
  }, []);

  return { isInside, distance, forceOutside, toggleForceOutside };
};
