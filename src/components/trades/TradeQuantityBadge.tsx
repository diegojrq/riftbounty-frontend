import { getDisplayDomainIcons, getNoDomainIcon } from "@/lib/trade-offer-grouping";

/**
 * Destaque visual para quantidade na troca / basket (×N).
 */
export function TradeQuantityBadge({
  quantity,
  size = "md",
  className = "",
}: {
  quantity: number;
  /** `sm` para linhas secundárias (ex.: “Minhas ×N”) */
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "min-h-[1.125rem] px-1 py-px text-[9px]"
      : "min-h-[1.25rem] px-1.5 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-amber-400/55 bg-amber-500/20 font-extrabold leading-none tabular-nums tracking-tight text-amber-100 shadow-[0_0_12px_-4px_rgba(251,191,36,0.45)] ${sizeClass} ${className}`}
    >
      ×{quantity}
    </span>
  );
}

type FallbackCard = { type?: string | null; record_type?: string | null } | undefined;

/**
 * Ordem fixa em toda troca/basket: badge ×N → ícones de domínio (ou fallback de tipo).
 * Use como filhos diretos de um `flex` com `gap-1` (ou `gap-1.5`).
 */
export function TradeOfferDomainIconsAndQty({
  domains,
  quantity,
  fallbackCard,
  iconClassName = "h-4 w-4 shrink-0 object-contain",
  badgeSize = "md",
}: {
  domains: string[];
  quantity: number;
  fallbackCard?: FallbackCard;
  /** Ex.: lista compacta na troca aberta no perfil — `h-3.5 w-3.5 shrink-0 object-contain` */
  iconClassName?: string;
  badgeSize?: "sm" | "md";
}) {
  const display = getDisplayDomainIcons(domains);
  return (
    <>
      <TradeQuantityBadge quantity={quantity} size={badgeSize} />
      {display.length > 0 ? (
        display.map((d) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={d} src={`/images/domains/${d}.webp`} alt={d} className={iconClassName} />
        ))
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={getNoDomainIcon(fallbackCard)} alt="" className={`${iconClassName} opacity-80`} />
      )}
    </>
  );
}
