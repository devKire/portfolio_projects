'use client';

import { useCallback, useEffect, useRef } from 'react';

export type SaveStatus = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  draftKey: string,
  selectedNoteId: string | null | undefined,
  debounceMs = 1000
) {
  const statusRef = useRef<SaveStatus>('idle');
  const lastSavedRef = useRef(draftKey);
  const latestDraftKeyRef = useRef(draftKey);
  const saveFnRef = useRef<() => Promise<boolean>>(() => Promise.resolve(true));
  const onStatusChangeRef = useRef<(status: SaveStatus) => void>(() => {});
  const savingPromiseRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    latestDraftKeyRef.current = draftKey;
  }, [draftKey]);

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
    const keyToSave = latestDraftKeyRef.current;
    if (keyToSave === lastSavedRef.current) return true;

    if (savingPromiseRef.current) {
      await savingPromiseRef.current;
      if (latestDraftKeyRef.current === lastSavedRef.current) return true;
    }

    setStatus('saving');

    const promise = (async () => {
      const ok = await saveFnRef.current();
      if (ok) {
        lastSavedRef.current = keyToSave;
        setStatus(
          latestDraftKeyRef.current === keyToSave ? 'saved' : 'editing'
        );
        return true;
      }
      setStatus('error');
      return false;
    })();

    savingPromiseRef.current = promise;
    try {
      return await promise;
    } catch {
      setStatus('error');
      return false;
    } finally {
      if (savingPromiseRef.current === promise) savingPromiseRef.current = null;
    }
  }, [selectedNoteId, setStatus]);

  const markSaved = useCallback(
    (status: SaveStatus = 'saved', key = latestDraftKeyRef.current) => {
      lastSavedRef.current = key;
      setStatus(status);
    },
    [setStatus]
  );

  const hasPendingChanges = useCallback(() => {
    return Boolean(
      selectedNoteId && latestDraftKeyRef.current !== lastSavedRef.current
    );
  }, [selectedNoteId]);

  useEffect(() => {
    if (!selectedNoteId) {
      lastSavedRef.current = draftKey;
      setStatus('idle');
      return;
    }
    if (draftKey === lastSavedRef.current) return;
    setStatus('editing');

    const timer = setTimeout(async () => {
      await triggerSave();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [draftKey, selectedNoteId, debounceMs, setStatus, triggerSave]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (statusRef.current === 'editing' || statusRef.current === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const flush = () => {
      if (hasPendingChanges()) void triggerSave();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', handler);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handler);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasPendingChanges, triggerSave]);

  return {
    registerSave,
    onStatusChange,
    triggerSave,
    markSaved,
    hasPendingChanges,
  };
}
