import { AlertCircle, Loader2 } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function LoadingBlock({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="loading-block">
      <Loader2 className="spin" size={22} />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBlock({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Nao foi possivel carregar os dados.";

  return <EmptyState icon={AlertCircle} text={message} title="Algo saiu do esperado" />;
}
