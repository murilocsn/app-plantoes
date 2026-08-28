export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <img
        alt=""
        className="brand-logo"
        height="40"
        src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
        width="40"
      />
      {!compact && (
        <div>
          <strong>FinancPlantoes</strong>
          <span>React + API</span>
        </div>
      )}
    </div>
  );
}
