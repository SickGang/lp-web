import { useEffect } from 'react';
import { useColorMode } from '@chakra-ui/react';
import {
  applyDocumentTheme,
  resolveTheme,
  useTheme,
} from '../hooks/useTheme';

/** Синхронизирует Zustand → Chakra color mode и класс на <html> для Tailwind/shadcn. */
export function ThemeSync() {
  const preference = useTheme((s) => s.preference);
  const { setColorMode } = useColorMode();

  useEffect(() => {
    const resolved = resolveTheme(preference);
    setColorMode(resolved);
    applyDocumentTheme(resolved);
  }, [preference, setColorMode]);

  useEffect(() => {
    if (preference !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = resolveTheme('system');
      setColorMode(resolved);
      applyDocumentTheme(resolved);
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference, setColorMode]);

  return null;
}
