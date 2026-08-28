import {
  Banknote,
  Building2,
  CalendarDays,
  ClipboardList,
  Download,
  LogOut,
  MapPin,
  Moon,
  Plus,
  Receipt,
  Sun,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { download } from "../lib/api";
import { Brand } from "./Brand";
import { Button } from "./Button";

const navItems = [
  { to: "/", label: "Painel", icon: CalendarDays },
  { to: "/shifts", label: "Plantoes", icon: ClipboardList },
  { to: "/locations", label: "Locais", icon: MapPin },
  { to: "/finance", label: "Financeiro", icon: Banknote },
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/spaces", label: "Espacos", icon: UsersRound },
  { to: "/reports", label: "Relatorios", icon: Download },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState<boolean>(
    () => localStorage.getItem("financplantoes-theme") === "dark",
  );
  const firstName = useMemo(() => {
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Usuario";
    return String(name).split(/\s+/)[0];
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("financplantoes-theme", dark ? "dark" : "light");
  }, [dark]);

  async function handleExport() {
    const blob = await download("/reports/export.csv");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `financplantoes-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link aria-label="FinancPlantoes" to="/">
          <Brand />
        </Link>
        <nav className="side-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink end={item.to === "/"} key={item.to} to={item.to}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Button
            aria-label={dark ? "Tema claro" : "Tema escuro"}
            onClick={() => setDark((value) => !value)}
            title={dark ? "Tema claro" : "Tema escuro"}
            variant="ghost"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{dark ? "Claro" : "Escuro"}</span>
          </Button>
          <Button onClick={() => void signOut()} variant="ghost">
            <LogOut size={18} />
            <span>Sair</span>
          </Button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Rotina profissional</p>
            <h1>Boa noite, {firstName}</h1>
            <p className="muted">{user?.email}</p>
          </div>
          <div className="topbar-actions">
            <Button onClick={handleExport} title="Exportar CSV" variant="secondary">
              <Download size={18} />
              <span>CSV</span>
            </Button>
            <Button onClick={() => navigate("/shifts?new=1")} variant="primary">
              <Plus size={18} />
              <span>Novo plantao</span>
            </Button>
          </div>
        </header>
        <Outlet />
      </main>

      <nav className="mobile-nav" aria-label="Navegacao mobile">
        {navItems.slice(0, 2).map((item) => (
          <NavLink end={item.to === "/"} key={item.to} to={item.to}>
            <item.icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <Button
          aria-label="Novo plantao"
          className="mobile-new"
          onClick={() => navigate("/shifts?new=1")}
          size="icon"
          variant="primary"
        >
          <Plus size={24} />
        </Button>
        {navItems.slice(3, 5).map((item) => (
          <NavLink
            className={({ isActive }) =>
              isActive || location.pathname === item.to ? "active" : undefined
            }
            key={item.to}
            to={item.to}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
