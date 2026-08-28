import type { Location, Shift } from "@financplantoes/shared";
import { AlertTriangle } from "lucide-react";
import { useAppMutation } from "../hooks/useBootstrap";
import { domainApi } from "../lib/domain-api";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { ShiftForm } from "./forms/ShiftForm";
import { Modal } from "./Modal";

export type ShiftModalState =
  | { type: "create"; date?: string }
  | { type: "edit"; shift: Shift }
  | { type: "delete"; shift: Shift }
  | null;

type ShiftCrudModalsProps = {
  locations: Location[];
  modal: ShiftModalState;
  onClose: () => void;
};

export function ShiftCrudModals({ locations, modal, onClose }: ShiftCrudModalsProps) {
  const createShift = useAppMutation(domainApi.createShift, { onSuccess: onClose });
  const updateShift = useAppMutation(
    (input: { id: string; payload: unknown }) => domainApi.updateShift(input.id, input.payload),
    { onSuccess: onClose },
  );
  const deleteShift = useAppMutation(
    (input: { id: string; scope: "only" | "future" | "all" }) =>
      domainApi.deleteShift(input.id, input.scope),
    { onSuccess: onClose },
  );

  if (!modal) {
    return null;
  }

  if (!locations.filter((location) => location.active !== false).length && modal.type !== "delete") {
    return (
      <Modal eyebrow="Plantao" onClose={onClose} title="Cadastre um local">
        <EmptyState
          icon={AlertTriangle}
          text="Um plantao precisa estar ligado a um local ativo."
          title="Nenhum local ativo"
        />
      </Modal>
    );
  }

  if (modal.type === "create") {
    return (
      <Modal eyebrow="Plantao" onClose={onClose} title="Novo plantao">
        <ShiftForm
          initialDate={modal.date}
          locations={locations}
          onCancel={onClose}
          onSubmit={(values) => createShift.mutate(values)}
          submitting={createShift.isPending}
        />
      </Modal>
    );
  }

  if (modal.type === "edit") {
    return (
      <Modal eyebrow="Plantao" onClose={onClose} title="Editar plantao">
        <ShiftForm
          locations={locations}
          onCancel={onClose}
          onSubmit={(values) => updateShift.mutate({ id: modal.shift.id, payload: values.shift })}
          shift={modal.shift}
          submitting={updateShift.isPending}
        />
      </Modal>
    );
  }

  const isRecurring = Boolean(modal.shift.recurring_group_id);

  return (
    <Modal eyebrow="Exclusao" onClose={onClose} title="Excluir plantao">
      <div className="delete-dialog">
        <p>
          {modal.shift.location_name} em {modal.shift.date}
        </p>
        <div className="delete-actions">
          <Button
            disabled={deleteShift.isPending}
            onClick={() => deleteShift.mutate({ id: modal.shift.id, scope: "only" })}
            variant="danger"
          >
            Somente este
          </Button>
          {isRecurring && (
            <>
              <Button
                disabled={deleteShift.isPending}
                onClick={() => deleteShift.mutate({ id: modal.shift.id, scope: "future" })}
              >
                Este e proximos
              </Button>
              <Button
                disabled={deleteShift.isPending}
                onClick={() => deleteShift.mutate({ id: modal.shift.id, scope: "all" })}
              >
                Toda repeticao
              </Button>
            </>
          )}
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  );
}
