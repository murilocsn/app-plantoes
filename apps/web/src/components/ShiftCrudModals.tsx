import type { Location, Shift } from "@financplantoes/shared";
import { AlertTriangle } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAppMutation } from "../hooks/useBootstrap";
import { ApiError } from "../lib/api";
import { domainApi } from "../lib/domain-api";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Modal } from "./Modal";
import { LoadingBlock } from "./PageFeedback";
import { showToast } from "./ToastHost";

const ShiftForm = lazy(() =>
  import("./forms/ShiftForm").then((module) => ({ default: module.ShiftForm })),
);

function LoadingForm() {
  return (
    <div role="status">
      <LoadingBlock label="Carregando formulário..." />
    </div>
  );
}

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
  const [errorMessage, setErrorMessage] = useState("");
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

  const showError = (error: Error) => {
    setErrorMessage(error.message);
    if (error instanceof ApiError && (error.status === 409 || error.code === "SHIFT_TIME_CONFLICT")) {
      showToast(error.message);
    }
  };

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
        <Suspense fallback={<LoadingForm />}>
          <ShiftForm
            initialDate={modal.date}
            locations={locations}
            onCancel={onClose}
            onSubmit={(values) => {
              setErrorMessage("");
              createShift.mutate(values, { onError: showError });
            }}
            submitting={createShift.isPending}
          />
        </Suspense>
        {errorMessage && (
          <p className="form-message" role="alert">
            {errorMessage}
          </p>
        )}
      </Modal>
    );
  }

  if (modal.type === "edit") {
    return (
      <Modal eyebrow="Plantao" onClose={onClose} title="Editar plantao">
        <Suspense fallback={<LoadingForm />}>
          <ShiftForm
            locations={locations}
            onCancel={onClose}
            onSubmit={(values) => {
              setErrorMessage("");
              updateShift.mutate({ id: modal.shift.id, payload: values.shift }, { onError: showError });
            }}
            shift={modal.shift}
            submitting={updateShift.isPending}
          />
        </Suspense>
        {errorMessage && (
          <p className="form-message" role="alert">
            {errorMessage}
          </p>
        )}
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
