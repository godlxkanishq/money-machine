# Money Machine

A premium, Apple/Linear/Vercel-inspired web dashboard for an EVM mint & trade automation
workspace — wallets, mint tasks, RPC endpoints, proxies, tools, and activity.

> UI demo with realistic mock data. No real keys, transactions, or network calls.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS** — design tokens for light/dark, single muted-indigo accent (`#5E6AD2`)
- **Framer Motion** — subtle fades, slides, layout transitions
- **lucide-react** — icons
- **cmdk** — ⌘K command palette

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Design system

- Spacious layouts, thin 1px borders, soft shadows, 12–20px radii
- One accent color used sparingly (active nav, primary actions, focus rings, charts)
- Status colors (success/warning/danger) reserved for small badges and dots only
- Dark mode by default; toggle in the top bar, sidebar, or ⌘K

## Features

- Collapsible sidebar + global ⌘K command palette + global search
- Data tables with sorting, search, multi-select bulk actions, and right-click context menus
- Dashboard with KPIs and minimal charts
- Create dialogs (wallets, tasks, RPC, proxies), toasts, and an interactive gas calculator
- Fully responsive, light/dark themed

## Structure

```
src/
  components/
    layout/      Sidebar, Topbar, CommandPalette, AppLayout, PageHeader
    ui/          Button, Card, Badge, Input, Select, Switch, Dialog, Menu,
                 DataTable, Chart, Kbd, toast
  lib/           data (mock), nav, theme, utils
  pages/         Dashboard, Wallets, Tasks, Rpc, Proxies, Tools, Activity, Settings
```
