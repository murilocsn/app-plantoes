export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img alt="" className="brand-logo" height="40" src="/icons/icon-192.png" width="40" />
      {!compact && (
        <div>
          <strong>FinancPlantoes</strong>
          <span>React + API</span>
        </div>
      )}
    </div>
  );
}
