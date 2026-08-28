import type { Receivable } from "@financplantoes/shared";
import { Banknote, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { MarkPaidForm } from "../components/forms/MarkPaidForm";
import { ReceivableForm } from "../components/forms/ReceivableForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { dateLabel, money } from "../lib/formatters";

type ReceivableModal =
  | { type: "create" }
  | { type: "edit"; receivable: Receivable }
  | { type: "paid"; receivable: Receivable }
  | null;

export function FinancePage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<ReceivableModal>(null);
  const createReceivable = useAppMutation(domainApi.createReceivable, { onSuccess: () => setModal(null) });
  const updateReceivable = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.updateReceivable(input.id, input.payload),
    { onSuccess: () => setModal(null) },
  );
  const markPaid = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.markReceivablePaid(input.id, input.payload),
    { onSuccess: () => setModal(null) },
  );
  const deleteReceivable = useAppMutation((id: string) => domainApi.deleteReceivable(id));

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  const receivables = bootstrap.data.receivables;
  const received = receivables
    .filter((item) => item.status === "received")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const pending = receivables
    .filter((item) => item.status === "pending" || item.status === "overdue")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <>
      <section className="stat-grid two">
        <StatCard icon={Check} label="Recebido" tone="green" value={money(received)} />
        <StatCard icon={Banknote} label="Pendente" tone="amber" value={money(pending)} />
      </section>

      <section className="page-section">
        <header className="section-head">
          <div>
            <p className="eyebrow">Recebimentos</p>
            <h2>Recebiveis</h2>
          </div>
          <Button onClick={() => setModal({ type: "create" })} variant="primary">
            <Plus size={18} />
            <span>Novo recebivel</span>
          </Button>
        </header>

        {receivables.length ? (
          <div className="table-list">
            {receivables.map((item) => (
              <article className="table-row" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <span>{dateLabel(item.expected_date)} - {item.status}</span>
                </div>
                <b>{money(item.amount)}</b>
                <div className="row-actions">
                  {item.status !== "received" && (
                    <Button
                      aria-label="Marcar recebido"
                      onClick={() => setModal({ type: "paid", receivable: item })}
                      size="icon"
                      title="Marcar recebido"
                      variant="primary"
                    >
                      <Check size={16} />
                    </Button>
                  )}
                  <Button
                    aria-label="Editar recebivel"
                    onClick={() => setModal({ type: "edit", receivable: item })}
                    size="icon"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    aria-label="Excluir recebivel"
                    disabled={deleteReceivable.isPending}
                    onClick={() => deleteReceivable.mutate(item.id)}
                    size="icon"
                    title="Excluir"
                    variant="danger"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={Banknote} text="Recebiveis de plantoes e avulsos aparecem aqui." title="Sem recebiveis" />
        )}
      </section>

      {modal?.type === "create" || modal?.type === "edit" ? (
        <Modal
          eyebrow="Recebivel"
          onClose={() => setModal(null)}
          title={modal.type === "create" ? "Novo recebivel" : "Editar recebivel"}
        >
          <ReceivableForm
            locations={bootstrap.data.locations}
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              if (modal.type === "create") {
                createReceivable.mutate(values);
              } else {
                updateReceivable.mutate({ id: modal.receivable.id, payload: values });
              }
            }}
            receivable={modal.type === "edit" ? modal.receivable : null}
            submitting={createReceivable.isPending || updateReceivable.isPending}
          />
        </Modal>
      ) : null}

      {modal?.type === "paid" && (
        <Modal eyebrow="Pagamento" onClose={() => setModal(null)} title="Confirmar recebimento">
          <MarkPaidForm
            onCancel={() => setModal(null)}
            onSubmit={(values) => markPaid.mutate({ id: modal.receivable.id, payload: values })}
            submitting={markPaid.isPending}
          />
        </Modal>
      )}
    </>
  );
}
