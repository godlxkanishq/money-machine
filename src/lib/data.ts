// Types and static constants only. All runtime data now comes from the
// server (see lib/api.ts + lib/store.tsx) — the client owns nothing.
export type Chain =
  | "Ethereum"
  | "Base"
  | "Arbitrum"
  | "Optimism"
  | "Blast"
  | "Zora";

export const CHAINS: Chain[] = [
  "Ethereum",
  "Base",
  "Arbitrum",
  "Optimism",
  "Blast",
  "Zora",
];

export const WALLET_GROUPS = [
  "Main",
  "Snipers",
  "Warm-up",
  "Cold storage",
  "Flippers",
] as const;

export const MAX_WALLETS = 100;
export const ethPrice = 3420;

export type WalletStatus = "active" | "idle" | "low";
export interface Wallet {
  id: string;
  address: string;
  alias: string;
  group: string;
  balanceEth: number;
  status: WalletStatus;
  txCount: number;
  lastUsed: Date;
  hasKey?: boolean;
  imported?: boolean;
}

export interface Network {
  key: string;
  name: string;
  chainId: number;
  explorer: string;
  currency: string;
  testnet: boolean;
}

export const NETWORK_OPTIONS: { key: string; label: string }[] = [
  { key: "sepolia", label: "Sepolia (testnet)" },
  { key: "base-sepolia", label: "Base Sepolia (testnet)" },
  { key: "mainnet", label: "Ethereum" },
  { key: "base", label: "Base" },
  { key: "arbitrum", label: "Arbitrum" },
  { key: "optimism", label: "Optimism" },
];

export type Module = "OpenSea" | "Manual" | "Merkle" | "Generic" | "GenesisPad";
export type Strategy = "Direct" | "Spam" | "Private (MEV)" | "Trigger";
export type TaskStatus = "running" | "queued" | "success" | "failed" | "paused";

export interface MintResult {
  walletId: string;
  address: string;
  hash: string | null;
  status: string;
  blockNumber?: number | null;
  gasUsed?: string | null;
  explorer?: string;
  error?: string;
}
export interface MintRun {
  network: string;
  total: number;
  success: number;
  failed: number;
  results: MintResult[];
}

export interface Task {
  id: string;
  name: string;
  contract: string;
  chain: Chain;
  module: Module;
  strategy: Strategy;
  status: TaskStatus;
  walletCount: number;
  priceEth: number;
  gasGwei: number;
  progress: number;
  createdAt: Date;
  functionSig?: string;
  argsJson?: string;
  valueEth?: number;
  group?: string;
  lastRun?: MintRun | null;
  executedAt?: string;
  error?: string;
}

export type RpcStatus = "active" | "degraded" | "down";
export interface RpcEndpoint {
  id: string;
  name: string;
  url: string;
  chain: Chain;
  latencyMs: number;
  priority: number;
  rps: number;
  status: RpcStatus;
}

export interface ProxyGroup {
  id: string;
  name: string;
  count: number;
  active: number;
  status: RpcStatus;
}

export type LogLevel = "info" | "success" | "warn" | "error";
export interface Activity {
  id: string;
  time: Date;
  level: LogLevel;
  source: string;
  message: string;
}

export interface Stats {
  totalWallets: number;
  totalEth: number;
  successfulMints: number;
  failedMints: number;
  successRate: number;
  activeTasks: number;
}

export interface License {
  tier: string;
  maxWallets: number;
  maxDevices?: number;
  expiresAt?: number | null;
  devices?: number | null;
  walletsUsed?: number;
}

export interface User {
  email: string;
  name: string;
  picture: string | null;
  tier: string;
}
