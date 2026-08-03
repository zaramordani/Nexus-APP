import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/api";
import { configurePurchases } from "@/lib/purchases";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => setUser(r.data))
      .catch(() => setUser(false))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (user && user.id) configurePurchases(user.id).catch(() => {});
  }, [user]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data);
    return data;
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(false);
  };
  const deleteAccount = async () => {
    await api.delete("/auth/me");
    setUser(false);
  };
  const refreshUser = async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, ready, login, register, logout, deleteAccount, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
