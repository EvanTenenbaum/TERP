import { useEffect } from 'react';

export function useFormDirtyState(isDirty: boolean) {
  useEffect(() => {
    const handler = (e: globalThis.BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
