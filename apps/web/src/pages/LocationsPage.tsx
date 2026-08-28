import type { Location } from "@financplantoes/shared";
import { Building2, Pencil, Plus, Power } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { LocationForm } from "../components/forms/LocationForm";
import { Modal } from "../components/Modal";
import { ErrorBlock, LoadingBlock } from "../components/PageFeedback";
import { useAppMutation, useBootstrap } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { money } from "../lib/formatters";

type LocationModal = { type: "create" } | { type: "edit"; location: Location } | null;

export function LocationsPage() {
  const bootstrap = useBootstrap();
  const [modal, setModal] = useState<LocationModal>(null);
  const createLocation = useAppMutation(domainApi.createLocation, { onSuccess: () => setModal(null) });
  const updateLocation = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.updateLocation(input.id, input.payload),
    { onSuccess: () => setModal(null) },
  );
  const deleteLocation = useAppMutation((id: string) => domainApi.deleteLocation(id));

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
            <p className="eyebrow">Cadastros</p>
            <h2>Locais de trabalho</h2>
          </div>
          <Button onClick={() => setModal({ type: "create" })} variant="primary">
            <Plus size={18} />
            <span>Novo local</span>
          </Button>
        </header>

        {bootstrap.data.locations.length ? (
          <div className="card-grid">
            {bootstrap.data.locations.map((location) => (
              <article className="entity-card" key={location.id}>
                <div className="entity-icon">
                  <Building2 size={20} />
                </div>
                <div>
                  <strong>{location.name}</strong>
                  <span>{money(location.value12)} por 12h</span>
                  {location.doc && <small>{location.doc}</small>}
                </div>
                <div className="entity-status">{location.active === false ? "Inativo" : "Ativo"}</div>
                <div className="entity-actions">
                  <Button
                    aria-label="Editar local"
                    onClick={() => setModal({ type: "edit", location })}
                    size="icon"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </Button>
                  {location.active !== false && (
                    <Button
                      aria-label="Inativar local"
                      disabled={deleteLocation.isPending}
                      onClick={() => deleteLocation.mutate(location.id)}
                      size="icon"
                      title="Inativar"
                      variant="danger"
                    >
                      <Power size={16} />
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            text="Cadastre hospitais, clinicas ou outros locais de trabalho."
            title="Nenhum local"
          />
        )}
      </section>

      {modal && (
        <Modal
          eyebrow="Local"
          onClose={() => setModal(null)}
          title={modal.type === "create" ? "Novo local" : "Editar local"}
        >
          <LocationForm
            location={modal.type === "edit" ? modal.location : null}
            onCancel={() => setModal(null)}
            onSubmit={(values) => {
              if (modal.type === "create") {
                createLocation.mutate(values);
              } else {
                updateLocation.mutate({ id: modal.location.id, payload: values });
              }
            }}
            submitting={createLocation.isPending || updateLocation.isPending}
          />
        </Modal>
      )}
    </>
  );
}
