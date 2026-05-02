import { createContext, useContext, useState, type ReactNode } from 'react';

export type Role = 'admin' | 'team' | null;

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  clearRole: () => void;
}

const STORAGE_KEY = 'coordina_role';

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'admin' || stored === 'team') return stored;
    return null;
  });

  const setRole = (newRole: Role) => {
    if (newRole === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, newRole);
    }
    setRoleState(newRole);
  };

  const clearRole = () => setRole(null);

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
