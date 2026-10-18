import {
  Banknote,
  CalendarDays,
  ClipboardList,
  Download,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plus,
  Receipt,
  Sun,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Brand } from "./Brand";
import { Button } from "./Button";
import { PushReminderButton } from "./PushReminderButton";

const navItems = [
  { to: "/profile", label: "Meu perfil", icon: UserRound },
  { to: "/", label: "Painel", mobileLabel: "Calendário", icon: CalendarDays },
  { to: "/shifts", label: "Plantoes", mobileLabel: "Plantões", icon: ClipboardList },
  { to: "/locations", label: "Locais", icon: MapPin },
  { to: "/finance", label: "Financeiro", mobileLabel: "Recebimento", icon: Banknote },
  { to: "/expenses", label: "Despesas", icon: Receipt },
  { to: "/spaces", label: "Espacos", icon: UsersRound },
  { to: "/reports", label: "Relatorios", icon: Download },
];

const mobileNavItems = navItems.filter((item) => item.mobileLabel);

export function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState<boolean>(
    () => localStorage.getItem("financplantoes-theme") === "dark",
  );
  const greeting = useMemo(() => {
    const hour = now.getHours();

    if (hour < 12) {
      return "Bom dia";
    }

    if (hour < 18) {
      return "Boa tarde";
    }

    return "Boa noite";
  }, [now]);
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

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

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
          <PushReminderButton />
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
          <Button
            aria-controls="mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            size="icon"
            variant="secondary"
          >
            <Menu size={20} />
          </Button>
          <div className="topbar-copy">
            <p className="eyebrow">Rotina profissional</p>
            <h1>{greeting}, {firstName}</h1>
            <p className="muted">{user?.email}</p>
          </div>
          <div className="topbar-actions">
            <div className="mobile-reminder-control">
              <PushReminderButton />
            </div>
            <Button className="topbar-new-shift" onClick={() => navigate("/shifts?new=1")} variant="primary">
              <Plus size={18} />
              <span>Novo plantao</span>
            </Button>
          </div>
        </header>
        <Outlet />
      </main>

      <nav aria-label="Navegação inferior" className="mobile-nav">
        {mobileNavItems.map((item) => (
          <Fragment key={item.to}>
            {item.to === "/finance" && (
              <Button
                aria-label="Novo plantão"
                className="mobile-new"
                onClick={() => navigate("/shifts?new=1")}
                size="icon"
                title="Novo plantão"
                variant="primary"
              >
                <Plus aria-hidden="true" size={26} />
              </Button>
            )}
            <NavLink end={item.to === "/"} to={item.to}>
              <span className="mobile-nav-icon"><item.icon aria-hidden="true" size={20} /></span>
              <span className="mobile-nav-label">{item.mobileLabel}</span>
            </NavLink>
          </Fragment>
        ))}
        <Button
          aria-controls="mobile-menu"
          aria-expanded={mobileMenuOpen}
          className="mobile-menu-shortcut"
          onClick={() => setMobileMenuOpen((value) => !value)}
          variant="ghost"
        >
          <span className="mobile-nav-icon"><Menu aria-hidden="true" size={20} /></span>
          <span className="mobile-nav-label">Menu</span>
        </Button>
      </nav>

      {mobileMenuOpen && (
        <>
          <button
            aria-label="Fechar menu"
            className="mobile-menu-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            type="button"
          />
          <aside aria-label="Menu mobile" className="mobile-menu-drawer" id="mobile-menu">
            <div className="mobile-menu-head">
              <Link aria-label="FinancPlantoes" onClick={() => setMobileMenuOpen(false)} to="/">
                <Brand />
              </Link>
              <Button
                aria-label="Fechar menu"
                onClick={() => setMobileMenuOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X size={20} />
              </Button>
            </div>
            <nav className="mobile-menu-nav" aria-label="Navegacao principal mobile">
              {navItems.map((item) => (
                <NavLink
                  end={item.to === "/"}
                  key={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  to={item.to}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mobile-menu-footer">
              <PushReminderButton />
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/shifts?new=1");
                }}
                variant="primary"
              >
                <Plus size={18} />
                <span>Novo plantao</span>
              </Button>
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
        </>
      )}
    </div>
  );
}
