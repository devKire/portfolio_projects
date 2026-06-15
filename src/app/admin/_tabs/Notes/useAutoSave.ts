'use client';

import { useCallback, useEffect, useRef } from 'react';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  draftKey: string,
  selectedNoteId: string | null | undefined,
  debounceMs = 1000
) {
  const statusRef = useRef<SaveStatus>('idle');
  const lastSavedRef = useRef(draftKey);
  const saveFnRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));
  const onStatusChangeRef = useRef<(status: SaveStatus) => void>(() => {});

  const registerSave = useCallback((fn: () => Promise<boolean>) => {
    saveFnRef.current = fn;
  }, []);

  const onStatusChange = useCallback((cb: (status: SaveStatus) => void) => {
    onStatusChangeRef.current = cb;
  }, []);

  const setStatus = useCallback((status: SaveStatus) => {
    statusRef.current = status;
    onStatusChangeRef.current(status);
  }, []);

  const triggerSave = useCallback(async () => {
    if (!selectedNoteId) return true;
    setStatus('saving');
    try {
      const ok = await saveFnRef.current();
      if (ok) {
        lastSavedRef.current = draftKey;
        setStatus('saved');
        return true;
      } else {
        setStatus('error');
        return false;
      }
    } catch {
      setStatus('error');
      return false;
    }
  }, [selectedNoteId, draftKey, setStatus]);

  const markSaved = useCallback(() => {
    lastSavedRef.current = draftKey;
    setStatus('saved');
  }, [draftKey, setStatus]);

  useEffect(() => {
    if (!selectedNoteId) {
      setStatus('idle');
      return;
    }
    if (draftKey === lastSavedRef.current) return;
    setStatus('unsaved');

    const timer = setTimeout(async () => {
      setStatus('saving');
      try {
        const ok = await saveFnRef.current();
        if (ok) {
          lastSavedRef.current = draftKey;
          setStatus('saved');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [draftKey, selectedNoteId, debounceMs, setStatus]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (statusRef.current === 'unsaved' || statusRef.current === 'saving') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return { registerSave, onStatusChange, triggerSave, markSaved };
}
