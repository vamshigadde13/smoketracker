import { createContext, useContext, useEffect, useState } from 'react';
import { clearStoredAuthToken, getStoredAuthToken } from "../services/authProfile";

const AuthContext = createContext({
  loading: true,
  isAuthenticated: false,
  login: async () => { },
  logout: async () => { },
  refreshAuth: async () => { },
});

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const refreshAuth = async () => {
    const token = await getStoredAuthToken();
    setIsAuthenticated(Boolean(token));
  };

  useEffect(() => {
    (async () => {
      await refreshAuth();
      setLoading(false);
    })();
  }, []);

  const login = async () => {
    await refreshAuth();
  };
  const logout = async () => {
    await clearStoredAuthToken();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ loading, isAuthenticated, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

