import { DATA_GENERATED } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

export function DataBanner() {
  const { t } = useI18n();
  return (
    <div className="border-b border-border/70 bg-surface-2/80 px-4 py-2 text-center text-xs text-muted backdrop-blur-md">
      <span className="font-medium text-fg">{t("ui.demo")}</span>
      {" · "}
      {t("data.banner")} {t("data.last")} {DATA_GENERATED}.
    </div>
  );
}
