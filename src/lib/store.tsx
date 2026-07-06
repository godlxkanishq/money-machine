import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type {
  Wallet,
  Task,
  RpcEndpoint,
  ProxyGroup,
  Activity,
  Stats,
  License,
  Network,
} from "./data";

const emptyStats: Stats = {
  totalWallets: 0, totalEth: 0, successfulMints: 0, failedMints: 0, successRate: 0, activeTasks: 0,
};

interface ExportedKey {
  address: string;
  privateKey: string;
  mnemonic: string | null;
}
interface SendResult {
  hash: string;
  explorer: string;
}

interface DataValue {
  loading: boolean;
  wallets: Wallet[];
  tasks: Task[];
  rpcEndpoints: RpcEndpoint[];
  proxyGroups: ProxyGroup[];
  activity: Activity[];
  stats: Stats;
  license: License | null;
  network: Network | null;
  refresh: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  addWallets: (count: number, group: string) => Promise<void>;
  importWallets: (secrets: string, group: string) => Promise<{ created: unknown[]; failed: number }>;
  removeWallet: (id: string) => Promise<void>;
  sendEth: (id: string, to: string, amountEth: string) => Promise<SendResult>;
  exportWallet: (id: string) => Promise<ExportedKey>;
  setNetwork: (key: string) => Promise<void>;
  addTask: (t: Record<string, unknown>) => Promise<void>;
  runTask: (id: string) => Promise<any>;
  removeTask: (id: string) => Promise<void>;
  addRpc: (r: Record<string, unknown>) => Promise<void>;
  addProxy: (p: Record<string, unknown>) => Promise<void>;
}

const Ctx = createContext<DataValue | null>(null);

const hydrateWallet = (w: any): Wallet => ({ ...w, lastUsed: new Date(w.lastUsed) });
const hydrateTask = (t: any): Task => ({ ...t, createdAt: new Date(t.createdAt) });
const hydrateActivity = (a: any): Activity => ({ ...a, time: new Date(a.time) });

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rpcEndpoints, setRpc] = useState<RpcEndpoint[]>([]);
  const [proxyGroups, setProxies] = useState<ProxyGroup[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [license, setLicense] = useState<License | null>(null);
  const [network, setNet] = useState<Network | null>(null);

  const refresh = useCallback(async () => {
    const d = await api.bootstrap();
    setWallets((d.wallets || []).map(hydrateWallet));
    setTasks((d.tasks || []).map(hydrateTask));
    setRpc(d.rpcEndpoints || []);
    setProxies(d.proxyGroups || []);
    setActivity((d.activity || []).map(hydrateActivity));
    setStats(d.stats || emptyStats);
    setLicense(d.license || null);
    setNet(d.network || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const refreshBalances = useCallback(async () => {
    const d = await api.refreshWallets();
    setWallets((d.wallets || []).map(hydrateWallet));
    if (d.stats) setStats(d.stats);
    if (d.network) setNet(d.network);
  }, []);

  const addWallets = useCallback(async (count: number, group: string) => {
    await api.createWallets(count, group);
    await refresh();
  }, [refresh]);

  const importWallets = useCallback(async (secrets: string, group: string) => {
    const r = await api.importWallets(secrets, group);
    await refresh();
    return { created: r.created || [], failed: r.failed || 0 };
  }, [refresh]);

  const removeWallet = useCallback(async (id: string) => {
    await api.deleteWallet(id);
    await refresh();
  }, [refresh]);

  const sendEth = useCallback(async (id: string, to: string, amountEth: string) => {
    const r = await api.sendEth(id, to, amountEth);
    await refresh();
    return { hash: r.hash, explorer: r.explorer } as SendResult;
  }, [refresh]);

  const exportWallet = useCallback(async (id: string) => {
    return (await api.exportWallet(id)) as ExportedKey;
  }, []);

  const setNetwork = useCallback(async (key: string) => {
    const r = await api.setNetwork(key);
    setNet(r.network);
    await refreshBalances().catch(() => {});
  }, [refreshBalances]);

  const addTask = useCallback(async (t: Record<string, unknown>) => {
    await api.createTask(t); await refresh();
  }, [refresh]);
  const runTask = useCallback(async (id: string) => {
    const r = await api.runTask(id); await refresh(); return r;
  }, [refresh]);
  const removeTask = useCallback(async (id: string) => {
    await api.deleteTask(id); await refresh();
  }, [refresh]);
  const addRpc = useCallback(async (r: Record<string, unknown>) => {
    await api.createRpc(r); await refresh();
  }, [refresh]);
  const addProxy = useCallback(async (p: Record<string, unknown>) => {
    await api.createProxy(p); await refresh();
  }, [refresh]);

  return (
    <Ctx.Provider
      value={{
        loading, wallets, tasks, rpcEndpoints, proxyGroups, activity, stats, license, network,
        refresh, refreshBalances, addWallets, importWallets, removeWallet, sendEth, exportWallet,
        setNetwork, addTask, runTask, removeTask, addRpc, addProxy,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
