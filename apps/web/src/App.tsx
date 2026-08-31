import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Brand } from "./components/Brand";
import { useAuth } from "./contexts/AuthContext";

// ============================================================
// ⚡ Code splitting: cada página vira um chunk separado e só é
// baixada quando o usuário acessa a rota correspondente.
// Isso reduz o tamanho do bundle inicial e acelera o carregamento.
// ============================================================
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage").then((m) => ({ default: m.ExpensesPage })));
const FinancePage = lazy(() => import("./pages/FinancePage").then((m) => ({ default: m.FinancePage })));
const LocationsPage = lazy(() => import("./pages/LocationsPage").then((m) => ({ default: m.LocationsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ShiftsPage = lazy(() => import("./pages/ShiftsPage").then((m) => ({ default: m.ShiftsPage })));
const SpacesPage = lazy(() => import("./pages/SpacesPage").then((m) => ({ default: m.SpacesPage })));

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
    // Suspense mostra a tela de carregamento enquanto o chunk da página é baixado
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}
