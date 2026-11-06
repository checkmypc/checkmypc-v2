import { LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { SelectInput } from "@/components/ui/select-input";

function isLanguage(value: string): value is Lang {
  return LANGS.some((language) => language.id === value);
}

export function LanguageSelect({
  value,
  onChange,
  className,
}: {
  value: Lang;
  onChange: (value: Lang) => void;
  className?: string;
}) {
  return (
    <SelectInput
      aria-label="Language"
      className={`h-11 min-w-28 rounded-full px-3.5 text-sm font-medium ${className ?? ""}`}
      value={value}
      onChange={(event) => {
        if (isLanguage(event.target.value)) onChange(event.target.value);
      }}
    >
      {LANGS.map((language) => (
        <option key={language.id} value={language.id}>
          {language.label}
        </option>
      ))}
    </SelectInput>
  );
}
