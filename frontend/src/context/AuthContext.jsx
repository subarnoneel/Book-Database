import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still checking, null = logged out, object = logged in
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    api.setUnauthorizedHandler(() => setUser(null));
    api
      .fetchCurrentUser()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
    return () => api.setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.login({ username, password });
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading: user === undefined, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
