import { Plus, Receipt, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ExpenseForm } from "../components/forms/ExpenseForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { StatCard } from "../components/StatCard";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { dateLabel, money } from "../lib/formatters";

type ExpenseModal = "personal" | "shared" | null;

export function ExpensesPage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<ExpenseModal>(null);
  const [formError, setFormError] = useState("");

  const showError = (error: Error) => setFormError(error.message);
  const onSuccess = () => {
    setModal(null);
    setFormError("");
  };

  const createPersonal = useAppMutation(domainApi.createPersonalExpense, {
    onSuccess,
    onError: showError,
  });
  const createShared = useAppMutation(domainApi.createSharedExpense, {
    onSuccess,
    onError: showError,
  });

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  const { personalExpenses, sharedExpenses, spaces } = bootstrap.data;
  const personalTotal = personalExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const sharedTotal = sharedExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <>
      <section className="stat-grid two">
        <StatCard icon={Receipt} label="Pessoal" tone="coral" value={money(personalTotal)} />
        <StatCard icon={UsersRound} label="Compartilhado" tone="amber" value={money(sharedTotal)} />
      </section>

      {formError && (
        <p className="form-message" role="alert">
          {formError}
        </p>
      )}

      <section className="dashboard-columns two-columns">
        <article className="work-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Individual</p>
              <h2>Despesas pessoais</h2>
            </div>
            <Button onClick={() => setModal("personal")} variant="primary">
              <Plus size={18} />
              <span>Nova</span>
            </Button>
          </header>
          {personalExpenses.length ? (
            <div className="stack">
              {personalExpenses.map((expense) => (
                <div className="row-item" key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>
                      {dateLabel(expense.expense_date)} {expense.category ? `- ${expense.category}` : ""}
                    </small>
                  </span>
                  <b>{money(expense.amount)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Receipt} text="Registre custos fixos, variaveis e extras." title="Sem despesas" />
          )}
        </article>

        <article className="work-panel">
          <header className="section-head">
            <div>
              <p className="eyebrow">Espacos</p>
              <h2>Despesas compartilhadas</h2>
            </div>
            <Button onClick={() => setModal("shared")} variant="primary">
              <Plus size={18} />
              <span>Nova</span>
            </Button>
          </header>
          {sharedExpenses.length ? (
            <div className="stack">
              {sharedExpenses.map((expense) => (
                <div className="row-item" key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>{dateLabel(expense.expense_date)}</small>
                  </span>
                  <b>{money(expense.amount)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={UsersRound}
              text="Custos de clinica, evento ou equipe aparecem aqui."
              title="Sem compartilhadas"
            />
          )}
        </article>
      </section>

      {modal && (
        <Modal
          eyebrow="Despesa"
          onClose={() => setModal(null)}
          title={modal === "personal" ? "Nova despesa pessoal" : "Nova despesa compartilhada"}
        >
          <ExpenseForm
            mode={modal}
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              if (modal === "personal") {
                createPersonal.mutate(values);
              } else {
                createShared.mutate(values);
              }
            }}
            spaces={spaces}
            submitting={createPersonal.isPending || createShared.isPending}
          />
        </Modal>
      )}
    </>
  );
}
