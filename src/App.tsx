import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import { LoginPage } from "@/components/LoginPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Wallets } from "@/pages/Wallets";
import { Tasks } from "@/pages/Tasks";
import { Rpc } from "@/pages/Rpc";
import { Proxies } from "@/pages/Proxies";
import { Tools } from "@/pages/Tools";
import { Activity } from "@/pages/Activity";
import { Settings } from "@/pages/Settings";
import { NotFound } from "@/pages/NotFound";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function App() {
  const { status } = useAuth();

  if (status === "loading") return <Splash />;
  if (status === "locked") return <LoginPage />;

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="wallets" element={<Wallets />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="rpc" element={<Rpc />} />
          <Route path="proxies" element={<Proxies />} />
          <Route path="tools" element={<Tools />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
