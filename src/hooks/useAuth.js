// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthChange, getUserDoc } from '../services/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          setProfile(await getUserDoc(fbUser.uid));
        } catch { setProfile(null); }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, profile, loading };
};
