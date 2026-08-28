import type { Space } from "@financplantoes/shared";
import { Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { SpaceForm } from "../components/forms/SpaceForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";

type SpaceModal = { type: "create" } | { type: "edit"; space: Space } | null;

const typeLabels: Record<string, string> = {
  residence: "Residencia",
  clinic: "Clinica",
  trip: "Viagem",
  event: "Evento",
  team: "Equipe",
  project: "Projeto",
  other: "Outro",
};

export function SpacesPage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<SpaceModal>(null);
  const createSpace = useAppMutation(domainApi.createSpace, { onSuccess: () => setModal(null) });
  const updateSpace = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.updateSpace(input.id, input.payload),
    { onSuccess: () => setModal(null) },
  );
  const deleteSpace = useAppMutation((id: string) => domainApi.deleteSpace(id));

  if (bootstrap.isLoading) {
    return <LoadingBlock />;
  }

  if (bootstrap.error || !bootstrap.data) {
    return <ErrorBlock error={bootstrap.error} />;
  }

  return (
    <>
      <section className="page-section">
        <header className="section-head">
          <div>
            <p className="eyebrow">Compartilhado</p>
            <h2>Espacos</h2>
          </div>
          <Button onClick={() => setModal({ type: "create" })} variant="primary">
            <Plus size={18} />
            <span>Novo espaco</span>
          </Button>
        </header>

        {bootstrap.data.spaces.length ? (
          <div className="card-grid">
            {bootstrap.data.spaces.map((space) => (
              <article className="entity-card" key={space.id}>
                <div className="entity-icon">
                  <UsersRound size={20} />
                </div>
                <div>
                  <strong>{space.name}</strong>
                  <span>{typeLabels[space.space_type] ?? space.space_type}</span>
                  {space.description && <small>{space.description}</small>}
                </div>
                <div className="entity-status">{space.role ?? "member"}</div>
                <div className="entity-actions">
                  <Button
                    aria-label="Editar espaco"
                    onClick={() => setModal({ type: "edit", space })}
                    size="icon"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </Button>
                  {space.role === "owner" && (
                    <Button
                      aria-label="Remover espaco"
                      disabled={deleteSpace.isPending}
                      onClick={() => deleteSpace.mutate(space.id)}
                      size="icon"
                      title="Remover"
                      variant="danger"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UsersRound}
            text="Crie um contexto para dividir despesas por clinica, equipe ou evento."
            title="Sem espacos"
          />
        )}
      </section>

      {modal && (
        <Modal
          eyebrow="Espaco"
          onClose={() => setModal(null)}
          title={modal.type === "create" ? "Novo espaco" : "Editar espaco"}
        >
          <SpaceForm
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              if (modal.type === "create") {
                createSpace.mutate(values);
              } else {
                updateSpace.mutate({ id: modal.space.id, payload: values });
              }
            }}
            space={modal.type === "edit" ? modal.space : null}
            submitting={createSpace.isPending || updateSpace.isPending}
          />
        </Modal>
      )}
    </>
  );
}
