import { Download, FileSpreadsheet, MapPin, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { money } from "../lib/formatters";

export function ReportsPage() {
  const bootstrap = useBootstrap();
  const [exporting, setExporting] = useState(false);
  const byLocation = useMemo(() => {
    const rows = (bootstrap.data?.shifts ?? []).reduce<Record<string, number>>((acc, shift) => {
      const name = shift.location_name || "Local";
      acc[name] = (acc[name] ?? 0) + Number(shift.value ?? shift.value12 ?? 0);
      return acc;
    }, {});

    return Object.entries(rows)
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
  }, [bootstrap.data?.shifts]);

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  async function exportCsv() {
    setExporting(true);

    try {
      const blob = await domainApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `financplantoes-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const max = Math.max(...byLocation.map((row) => row.total), 1);
  const totalExpenses =
    bootstrap.data.personalExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) +
    bootstrap.data.sharedExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <>
      <section className="stat-grid">
        <StatCard
          icon={WalletCards}
          label="Receita projetada"
          tone="blue"
          value={money(bootstrap.data.shifts.reduce((sum, shift) => sum + Number(shift.value ?? shift.value12 ?? 0), 0))}
        />
        <StatCard icon={Download} label="Recebido" tone="green" value={money(bootstrap.data.summary.received)} />
        <StatCard icon={FileSpreadsheet} label="Despesas" tone="coral" value={money(totalExpenses)} />
      </section>

      <section className="page-section">
        <header className="section-head">
          <div>
            <p className="eyebrow">Relatorios</p>
            <h2>Resumo por local</h2>
          </div>
          <Button disabled={exporting} onClick={exportCsv} variant="primary">
            <Download size={18} />
            <span>Exportar CSV</span>
          </Button>
        </header>

        {byLocation.length ? (
          <div className="bar-list">
            {byLocation.map((row) => (
              <div className="bar-row" key={row.name}>
                <span>{row.name}</span>
                <div>
                  <i style={{ width: `${Math.max(8, (row.total / max) * 100)}%` }} />
                </div>
                <b>{money(row.total)}</b>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={MapPin} text="Os totais aparecem depois dos primeiros plantoes." title="Sem dados" />
        )}
      </section>
    </>
  );
}
