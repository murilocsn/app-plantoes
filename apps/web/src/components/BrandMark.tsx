// Monograma "FP" — novo logo FinancPlantões.
// SVG vetorial: nítido em qualquer tamanho, sem requisição de rede.
export function BrandMark({ className = "brand-logo" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      role="img"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient gradientUnits="userSpaceOnUse" id="fpBlueDark" x1="6" x2="36" y1="6" y2="58">
          <stop stopColor="#1D4FA8" />
          <stop offset="1" stopColor="#2E6FD0" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="fpBlueLight" x1="36" x2="63" y1="8" y2="58">
          <stop stopColor="#2E7BE6" />
          <stop offset="1" stopColor="#58A6F8" />
        </linearGradient>
        <linearGradient gradientUnits="userSpaceOnUse" id="fpLeaf" x1="26" x2="45" y1="26" y2="44">
          <stop stopColor="#3EA377" />
          <stop offset="1" stopColor="#8FE2B0" />
        </linearGradient>
      </defs>

      {/* F */}
      <g fill="url(#fpBlueDark)">
        <rect height="52" rx="6" width="12" x="6" y="6" />
        <rect height="12" rx="6" width="30" x="6" y="6" />
        <rect height="12" rx="6" width="22" x="6" y="28" />
      </g>

      {/* P */}
      <g fill="url(#fpBlueLight)">
        <rect height="38" rx="6" width="12" x="36" y="20" />
        <path d="M42 8h8a13 13 0 0 1 0 26h-8z" />
      </g>

      {/* Folha */}
      <path
        d="M26 44c-1-10 5-18 19-18 0 12-7 19-19 18Z"
        fill="url(#fpLeaf)"
      />
    </svg>
  );
}