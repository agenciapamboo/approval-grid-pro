import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ApproverData {
  id: string;
  name: string;
  email: string;
  clientId: string;
  agencyId: string;
}

interface ApproverContextType {
  approverData: ApproverData | null;
  setApproverData: (data: ApproverData | null) => void;
  clearApproverData: () => void;
}

const ApproverContext = createContext<ApproverContextType | undefined>(undefined);

const STORAGE_KEY = 'approver_session';

export function ApproverProvider({ children }: { children: ReactNode }) {
  const [approverData, setApproverDataState] = useState<ApproverData | null>(() => {
    // Carregar do sessionStorage ao inicializar
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setApproverData = (data: ApproverData | null) => {
    setApproverDataState(data);
    if (data) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearApproverData = () => {
    setApproverDataState(null);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  // Limpar dados ao fechar navegador (sessionStorage já faz isso automaticamente)
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(STORAGE_KEY);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ApproverContext.Provider value={{ approverData, setApproverData, clearApproverData }}>
      {children}
    </ApproverContext.Provider>
  );
}

export function useApprover() {
  const context = useContext(ApproverContext);
  if (context === undefined) {
    throw new Error('useApprover must be used within an ApproverProvider');
  }
  return context;
}
