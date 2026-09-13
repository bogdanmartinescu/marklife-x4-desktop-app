import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { nextModalCount } from './modal-count.js';

interface ModalContextValue {
  modalOpen: boolean;
  beginModal: () => void;
  endModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider(props: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const beginModal = useCallback(() => {
    setCount((current) => nextModalCount(current, 1));
  }, []);
  const endModal = useCallback(() => {
    setCount((current) => nextModalCount(current, -1));
  }, []);
  const value = useMemo(
    () => ({
      modalOpen: count > 0,
      beginModal,
      endModal,
    }),
    [beginModal, count, endModal],
  );
  return <ModalContext.Provider value={value}>{props.children}</ModalContext.Provider>;
}

export function useModalState(): ModalContextValue {
  const value = useContext(ModalContext);
  if (!value) {
    throw new Error('useModalState must be used inside ModalProvider');
  }
  return value;
}

export function useOptionalModalRegistry(): Pick<ModalContextValue, 'beginModal' | 'endModal'> | null {
  const value = useContext(ModalContext);
  if (!value) {
    return null;
  }
  return { beginModal: value.beginModal, endModal: value.endModal };
}
