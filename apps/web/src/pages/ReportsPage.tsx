import { Download, FileSpreadsheet, MapPin, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../components/Button";
import { DateField } from "../components/DateField";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { PeriodNavigation } from "../components/PeriodNavigation";
import { useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { money } from "../lib/formatters";
import { adjacentMonthRange, monthDateRange } from "../lib/payment-view";
import { reportPeriodTotals } from "../lib/monthly-finance";

export function ReportsPage() {
  const bootstrap = useBootstrap();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [from, setFrom] = useState(() => monthDateRange(new Date()).from);
  const [to, setTo] = useState(() => monthDateRange(new Date()).to);
  const [locationId, setLocationId] = useState("");
  const filteredShifts = useMemo(
    () => (bootstrap.data?.shifts ?? []).filter((shift) => {
      return (!from || shift.date >= from) && (!to || shift.date <= to) && (!locationId || shift.location_id === locationId);
    }),
    [bootstrap.data?.shifts, from, locationId, to],
  );
  const byLocation = useMemo(() => {
    const rows = filteredShifts.reduce<Record<string, number>>((acc, shift) => {
      const name = shift.location_name || "Local";
      acc[name] = (acc[name] ?? 0) + Number(shift.value ?? shift.value12 ?? 0);
      return acc;
    }, {});

    return Object.entries(rows)
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 8);
  }, [filteredShifts]);

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  async function exportCsv() {
    setExporting(true);
    setExportError("");

    try {
      const blob = await domainApi.exportCsv({ from, to, location_id: locationId });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `financplantoes-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Não foi possível exportar o relatório.");
    } finally {
      setExporting(false);
    }
  }

  const max = Math.max(...byLocation.map((row) => row.total), 1);
  const totals = reportPeriodTotals(bootstrap.data, { from, to }, locationId);
  function changePeriod(range: { from: string; to: string }) { setFrom(range.from); setTo(range.to); }

  return (
    <>
      <PeriodNavigation from={from} to={to} label="dos relatórios" onCurrentMonth={() => changePeriod(monthDateRange(new Date()))} onNavigate={(offset) => changePeriod(adjacentMonthRange(from, to, offset))} />
      <section className="stat-grid">
        <StatCard
          icon={WalletCards}
          label="Receita projetada"
          tone="blue"
          value={money(totals.projected)}
          detail="Pela data de realização dos plantões"
        />
        <StatCard icon={Download} label="Recebido" tone="green" value={money(totals.received)} detail="Pela data de recebimento registrada" />
        {totals.expenses !== null && <StatCard icon={FileSpreadsheet} label="Despesas" tone="coral" value={money(totals.expenses)} detail="Pela data da despesa, em todos os locais" />}
      </section>
      {totals.paidWithoutDate > 0 && <p className="form-hint" role="status">Há {totals.paidWithoutDate} pagamento(s) sem data de recebimento. Eles não entram no recebido do mês até a data ser informada.</p>}
      {locationId && <p className="form-hint">Selecione Todos os locais para consultar despesas do período, que não possuem vínculo com uma unidade.</p>}

      <section className="page-section">
        {exportError && <p className="form-message" role="alert">{exportError}</p>}
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

        <div className="report-filters">
          <DateField
            label="Período de"
            name="report-filter-from"
            onBlur={() => undefined}
            onChange={(value) => {
              setFrom(value);
              if (to && value && to < value) {
                setTo(value);
              }
            }}
            value={from}
          />
          <DateField
            label="Até"
            name="report-filter-to"
            onBlur={() => undefined}
            onChange={(value) => setTo(from && value && value < from ? from : value)}
            value={to}
          />
          <Field label="Local">
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Todos os locais</option>
              {bootstrap.data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </Field>
        </div>

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
