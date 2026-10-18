import { isMatch } from "date-fns";
import { ChevronDown, Clock3, Download, MapPin, Plus, WalletCards } from "lucide-react";
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
import { dateLabel, money, monthTitle } from "../lib/formatters";
import { adjacentMonthRange, monthDateRange, shiftTimeLabel } from "../lib/payment-view";
import { reportPeriodTotals } from "../lib/monthly-finance";
import {
  orderLocationReport,
  reportByLocation,
  summarizeWork,
  type ReportOrder,
} from "../lib/reports";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const shareNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const countLabel = (count: number) => `${count} ${count === 1 ? "plantão" : "plantões"}`;
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isMatch(value, "yyyy-MM-dd");

export function ReportsPage() {
  const bootstrap = useBootstrap();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [from, setFrom] = useState(() => monthDateRange(new Date()).from);
  const [to, setTo] = useState(() => monthDateRange(new Date()).to);
  const [locationId, setLocationId] = useState("");
  const [customPeriod, setCustomPeriod] = useState(false);
  const [order, setOrder] = useState<ReportOrder>("value");
  const [currentMonth] = useState(() => monthDateRange(new Date()).from);
  const validRange = Boolean(validDate(from) && validDate(to) && from <= to);
  const totals = useMemo(
    () => (bootstrap.data ? reportPeriodTotals(bootstrap.data, { from, to }, locationId) : null),
    [bootstrap.data, from, to, locationId],
  );
  const work = useMemo(() => summarizeWork(totals?.shifts ?? []), [totals]);
  const byLocation = useMemo(
    () =>
      orderLocationReport(
        reportByLocation(totals?.shifts ?? [], bootstrap.data?.locations ?? []),
        order,
      ),
    [totals, bootstrap.data?.locations, order],
  );
  const monthOptions = useMemo(() => {
    const anchor = new Date(`${currentMonth}T12:00:00`);
    const offsets = [0, -1, 1, ...Array.from({ length: 10 }, (_, index) => -index - 2)];
    const keys = offsets.map((offset) =>
      monthDateRange(new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1)).from.slice(
        0,
        7,
      ),
    );
    if (!customPeriod && validRange && !keys.includes(from.slice(0, 7)))
      keys.push(from.slice(0, 7));
    return keys.map((key) => ({
      value: key,
      label: `${monthTitle(new Date(`${key}-01T12:00:00`))}${key === currentMonth.slice(0, 7) ? " · mês atual" : ""}`,
    }));
  }, [currentMonth, customPeriod, from, validRange]);

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data || !totals) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  async function exportCsv() {
    if (!validRange) return;
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
      setExportError(
        error instanceof Error ? error.message : "Não foi possível exportar o relatório.",
      );
    } finally {
      setExporting(false);
    }
  }

  function changePeriod(range: { from: string; to: string }) {
    setFrom(range.from);
    setTo(range.to);
    setCustomPeriod(false);
  }

  return (
    <div className="reports-page">
      <header className="reports-page-head">
        <h2>Relatórios</h2>
        <Button disabled={exporting || !validRange} onClick={exportCsv} variant="primary">
          <Download aria-hidden="true" size={17} />
          <span>{exporting ? "Exportando…" : "Exportar CSV"}</span>
        </Button>
        <p>Compare seus plantões, horas e valores por local.</p>
      </header>
      {exportError && (
        <p className="form-message" role="alert">
          {exportError}
        </p>
      )}

      <section aria-label="Filtros dos relatórios" className="reports-filters">
        <Field label="Período dos plantões">
          <select
            value={customPeriod ? "custom" : from.slice(0, 7)}
            onChange={(event) => {
              if (event.target.value === "custom") setCustomPeriod(true);
              else changePeriod(monthDateRange(new Date(`${event.target.value}-01T12:00:00`)));
            }}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <option value="custom">Período personalizado</option>
          </select>
        </Field>
        <Field label="Local">
          <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">Todos os locais</option>
            {bootstrap.data.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
        {customPeriod && (
          <div className="reports-custom-period">
            <DateField
              label="De"
              name="report-filter-from"
              onBlur={() => undefined}
              onChange={(value) => {
                setFrom(value);
                if (validDate(to) && validDate(value) && to < value) setTo(value);
              }}
              value={from}
            />
            <DateField
              label="Até"
              name="report-filter-to"
              onBlur={() => undefined}
              onChange={(value) =>
                setTo(validDate(from) && validDate(value) && value < from ? from : value)
              }
              value={to}
            />
          </div>
        )}
      </section>

      <div className="reports-scope">
        <PeriodNavigation
          from={from}
          to={to}
          label="dos relatórios"
          onCurrentMonth={() => changePeriod(monthDateRange(new Date()))}
          onNavigate={(offset) => changePeriod(adjacentMonthRange(from, to, offset))}
        />
        {validRange && (
          <p>
            {countLabel(work.count)} · {byLocation.length}{" "}
            {byLocation.length === 1 ? "local" : "locais"}
          </p>
        )}
      </div>

      {!validRange ? (
        <p className="form-message" role="alert">
          Informe datas válidas para o início e o fim do período.
        </p>
      ) : (
        <>
          <section aria-label="Resumo dos plantões" className="stat-grid reports-summary">
            <StatCard
              icon={WalletCards}
              label="Valor previsto"
              tone="blue"
              value={money(work.value)}
              detail="Dos plantões selecionados"
            />
            <StatCard
              icon={Clock3}
              label="Horas de plantão"
              value={`${number.format(work.hours)} h`}
              detail="Carga horária cadastrada"
            />
            <StatCard
              icon={WalletCards}
              label="Valor médio por hora"
              value={work.hourly === null ? "—" : money(work.hourly)}
              detail="Antes das despesas"
            />
          </section>
          {work.missingHours > 0 && (
            <p className="form-hint" role="status">
              {countLabel(work.missingHours)} sem duração válida. A média por hora fica indisponível
              até a duração ser informada.
            </p>
          )}

          <section aria-label="Comparativo por local" className="reports-comparison">
            <header className="reports-comparison-head">
              <div>
                <h3>Comparativo por local</h3>
                <p>Valores previstos · não indicam pagamento</p>
              </div>
              <Field label="Ordenar por">
                <select
                  value={order}
                  onChange={(event) => setOrder(event.target.value as ReportOrder)}
                >
                  <option value="value">Valor previsto</option>
                  <option value="hours">Mais horas</option>
                  <option value="hourly">Maior valor/hora</option>
                  <option value="count">Mais plantões</option>
                  <option value="name">Nome do local</option>
                </select>
              </Field>
            </header>
            {byLocation.length ? (
              <>
                <div aria-hidden="true" className="report-columns">
                  <span>Local e participação</span>
                  <span>Plantões · horas</span>
                  <span>Valor previsto</span>
                  <span>Valor / hora</span>
                  <span />
                </div>
                <div className="report-locations">
                  {byLocation.map((row) => {
                    const share =
                      work.value > 0
                        ? Math.max(0, Math.min(100, (row.value / work.value) * 100))
                        : 0;
                    return (
                      <details className="report-location" key={row.key}>
                        <summary className="report-location-summary">
                          <span className="report-place">
                            <strong>{row.name}</strong>
                            <small>{shareNumber.format(share)}% do valor previsto</small>
                            <span aria-hidden="true" className="report-share-track">
                              <span style={{ width: `${share}%` }} />
                            </span>
                          </span>
                          <span className="report-load">
                            <span>{countLabel(row.count)}</span>
                            <small>{number.format(row.hours)} horas</small>
                          </span>
                          <strong className="report-value">
                            <span className="report-mobile-label">Previsto </span>
                            {money(row.value)}
                          </strong>
                          <span className="report-hour">
                            <span className="report-mobile-label">Média/h </span>
                            {row.hourly === null ? "—" : money(row.hourly)}
                          </span>
                          <span aria-hidden="true" className="report-toggle">
                            <Plus size={16} />
                          </span>
                        </summary>
                        <div className="report-shift-details">
                          <p>Plantões pela data de realização</p>
                          <ul aria-label={`Plantões de ${row.name}`}>
                            {row.shifts.map((shift) => (
                              <li key={shift.id}>
                                <span>
                                  <strong className="report-shift-date">
                                    {dateLabel(shift.date)}
                                  </strong>
                                  <small>{shiftTimeLabel(shift)}</small>
                                </span>
                                <span>
                                  {Number(shift.duration) > 0
                                    ? `${number.format(Number(shift.duration))} h`
                                    : "Horas não informadas"}
                                </span>
                                <strong>{money(shift.value ?? shift.value12 ?? 0)}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    );
                  })}
                </div>
                <p className="reports-footnote">
                  Média por hora = valor previsto ÷ horas cadastradas. A comparação considera a data
                  dos plantões, antes das despesas.
                </p>
              </>
            ) : (
              <EmptyState
                icon={MapPin}
                text="Não há plantões neste período ou local. Ajuste os filtros para consultar outros registros."
                title="Sem plantões no período"
              />
            )}
          </section>

          <details className="reports-finance">
            <summary>
              Recebimentos e despesas do período
              <ChevronDown aria-hidden="true" size={17} />
            </summary>
            <div>
              <dl className="reports-cash-totals">
                <div>
                  <dt>Recebido</dt>
                  <dd>{money(totals.received)}</dd>
                </div>
                {totals.expenses !== null && (
                  <div>
                    <dt>Despesas</dt>
                    <dd>{money(totals.expenses)}</dd>
                  </div>
                )}
              </dl>
              <p className="form-hint">
                Recebido considera a data de recebimento registrada. Despesas consideram a data da
                despesa.
              </p>
              {totals.paidWithoutDate > 0 && (
                <p className="form-hint" role="status">
                  Há {totals.paidWithoutDate} pagamento(s) sem data de recebimento. Eles não entram
                  no recebido do período até a data ser informada.
                </p>
              )}
              {locationId && (
                <p className="form-hint">
                  Selecione Todos os locais para consultar despesas do período, que não possuem
                  vínculo com uma unidade.
                </p>
              )}
              <p className="form-hint">
                O CSV inclui os plantões, recebimentos e despesas do período, conforme o filtro de
                local.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
