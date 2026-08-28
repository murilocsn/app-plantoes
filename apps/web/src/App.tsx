import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Brand } from "./components/Brand";
import { useAuth } from "./contexts/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { FinancePage } from "./pages/FinancePage";
import { LocationsPage } from "./pages/LocationsPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ShiftsPage } from "./pages/ShiftsPage";
import { SpacesPage } from "./pages/SpacesPage";

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <Brand />
      <span>Carregando...</span>
    </main>
  );
}

function ProtectedShell() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <AppLayout />;
}

function PublicRoute() {
  const { loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate replace to="/" />;
  }

  return <LoginPage />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />} path="/login" />
      <Route element={<ProtectedShell />}>
        <Route element={<DashboardPage />} index />
        <Route element={<ShiftsPage />} path="shifts" />
        <Route element={<LocationsPage />} path="locations" />
        <Route element={<FinancePage />} path="finance" />
        <Route element={<ExpensesPage />} path="expenses" />
        <Route element={<SpacesPage />} path="spaces" />
        <Route element={<ReportsPage />} path="reports" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
