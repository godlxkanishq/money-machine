import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken, getDeviceId } from "./api";
import { type License, type User } from "./data";

type Status = "loading" | "locked" | "active";

interface AuthValue {
  status: Status;
  user: User | null;
  license: License | null;
  deviceId: string;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  activate: (key: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [license, setLicense] = useState<License | null>(null);

  const applySession = useCallback((s: { user?: User | null; license?: License | null }) => {
    setUser(s.user ?? null);
    setLicense(s.license ?? null);
    setStatus("active");
  }, []);

  // Validate any stored session on boot.
  useEffect(() => {
    if (!getToken()) {
      setStatus("locked");
      return;
    }
    api
      .session()
      .then((r) => applySession(r))
      .catch(() => {
        setToken(null);
        setStatus("locked");
      });
  }, [applySession]);

  // Any 401 anywhere re-locks the app.
  useEffect(() => {
    const onUnauth = () => {
      setUser(null);
      setLicense(null);
      setStatus("locked");
    };
    window.addEventListener("mm-unauthorized", onUnauth);
    return () => window.removeEventListener("mm-unauthorized", onUnauth);
  }, []);

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const r = await api.googleLogin(credential);
      setToken(r.token);
      applySession(r);
    },
    [applySession],
  );

  const loginDemo = useCallback(async () => {
    const r = await api.demoLogin();
    setToken(r.token);
    applySession(r);
  }, [applySession]);

  const activate = useCallback(
    async (key: string) => {
      const r = await api.activate(key);
      setToken(r.token);
      const s = await api.session();
      applySession(s);
    },
    [applySession],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setLicense(null);
    setStatus("locked");
  }, []);

  return (
    <Ctx.Provider
      value={{
        status,
        user,
        license,
        deviceId: getDeviceId(),
        loginWithGoogle,
        loginDemo,
        activate,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
