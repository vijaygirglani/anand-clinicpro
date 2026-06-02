import { createContext, useContext, useState, type ReactNode } from "react";
import { getActiveSession, logout } from "@/lib/settings";

interface AuthCtx {
  isLoggedIn: boolean;
  switchDoctor: () => void;
}

const AuthContext = createContext<AuthCtx>({ isLoggedIn: false, switchDoctor: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getActiveSession());

  const switchDoctor = () => {
    logout();
    setIsLoggedIn(false);
  };

  const handleLogin = () => setIsLoggedIn(true);

  return (
    <AuthContext.Provider value={{ isLoggedIn, switchDoctor }}>
      {/* Pass login callback via a second context or just expose it */}
      <LoginContext.Provider value={handleLogin}>
        {children}
      </LoginContext.Provider>
    </AuthContext.Provider>
  );
}

const LoginContext = createContext<() => void>(() => {});

export const useAuth = () => useContext(AuthContext);
export const useLogin = () => useContext(LoginContext);
