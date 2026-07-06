import {
  LayoutGrid,
  Wallet,
  Crosshair,
  Server,
  Globe,
  Wrench,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}
export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV: NavSection[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutGrid },
      { label: "Wallets", to: "/wallets", icon: Wallet },
      { label: "Mint Tasks", to: "/tasks", icon: Crosshair },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "RPC Endpoints", to: "/rpc", icon: Server },
      { label: "Proxies", to: "/proxies", icon: Globe },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Tools", to: "/tools", icon: Wrench },
      { label: "Activity", to: "/activity", icon: ScrollText },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV.flatMap((s) => s.items);
