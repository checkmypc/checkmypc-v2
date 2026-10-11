import { CircleHelp, CircleX, PackageCheck, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { productAvailability } from "@/lib/availability";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function ProductAvailability({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const { t } = useI18n();
  const availability = productAvailability(product);
  const config = {
    in_stock: { label: "ui.availability.in", Icon: PackageCheck, tone: "ok" as const },
    low_stock: { label: "ui.availability.low", Icon: PackageSearch, tone: "warn" as const },
    out_of_stock: { label: "ui.availability.out", Icon: CircleX, tone: "danger" as const },
    unknown: { label: "ui.availability.unknown", Icon: CircleHelp, tone: "neutral" as const },
  }[availability];
  const Icon = config.Icon;

  return (
    <Badge
      tone={config.tone}
      className={`gap-1.5 whitespace-nowrap ${className ?? ""}`}
      data-availability={availability}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {t(config.label)}
    </Badge>
  );
}
