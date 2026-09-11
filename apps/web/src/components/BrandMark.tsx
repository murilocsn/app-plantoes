const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;

export function BrandMark({ className = "brand-logo" }: { className?: string }) {
  return <img alt="" aria-hidden="true" className={className} height={44} src={logoSrc} width={44} />;
}
