// src/hooks/useHub.js
import { useState, useEffect } from 'react';
import { subscribeToHub, subscribeToCourts, subscribeToWaitlist } from '../services/firebaseService';

const DEFAULT_HUB_ID = 'central_park';

export const useHub = (hubId = DEFAULT_HUB_ID) => {
  const [hub, setHub] = useState(null);
  const [courts, setCourts] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const u1 = subscribeToHub(hubId, (h) => { setHub(h); setLoading(false); });
    const u2 = subscribeToCourts(hubId, setCourts);
    const u3 = subscribeToWaitlist(hubId, setWaitlist);
    return () => { u1(); u2(); u3(); };
  }, [hubId]);

  const activeCourts = courts.filter((c) => c.status === 'active' || c.status === 'pending').length;

  return { hub, courts, waitlist, activeCourts, totalCourts: courts.length, loading };
};
