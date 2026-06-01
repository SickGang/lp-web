import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';

/** true после чтения auth-storage из localStorage */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuth.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuth.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useAuth.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
