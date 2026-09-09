import { BrandMark } from "./BrandMark";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <BrandMark />
      {!compact && (
        <div>
          <strong>
            Financ<span className="brand-accent">Plantões</span>
          </strong>
          <span>Plantões em ordem, seu futuro em equilíbrio</span>
        </div>
      )}
    </div>
  );
}
