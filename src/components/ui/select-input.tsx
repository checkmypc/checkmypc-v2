import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Children,
  Fragment,
  isValidElement,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode };
type SelectOption = { value: string; label: ReactNode; disabled: boolean; key: string };
type ChangeEvent = { target: { value: string } };

type SelectInputProps = Omit<HTMLAttributes<HTMLButtonElement>, "onChange" | "children"> & {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent) => void;
};

function textContent(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<OptionProps>(child)) return textContent(child.props.children);
      return "";
    })
    .join("");
}

function collectOptions(children: ReactNode, path = "option"): SelectOption[] {
  return Children.toArray(children).flatMap((child, index) => {
    if (!isValidElement<OptionProps>(child)) return [];
    if (child.type === Fragment) return collectOptions(child.props.children, `${path}-${index}`);
    if (child.type !== "option") return [];
    const value = String(child.props.value ?? textContent(child.props.children));
    return [
      {
        value,
        label: child.props.children,
        disabled: Boolean(child.props.disabled),
        key: `${path}-${index}-${value}`,
      },
    ];
  });
}

function internalValue(value: string, emptyValue: string) {
  return value === "" ? emptyValue : value;
}

export function SelectInput({
  id,
  className,
  children,
  value,
  defaultValue,
  name,
  required,
  disabled,
  onChange,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...triggerProps
}: SelectInputProps) {
  const { lang } = useI18n();
  const options = collectOptions(children);
  let emptyValue = "__cmp_select_empty__";
  while (options.some((option) => option.value === emptyValue)) emptyValue += "_";

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const selectedInternalValue = selectedOption
    ? internalValue(selectedOption.value, emptyValue)
    : undefined;

  return (
    <>
      {name && <input type="hidden" name={name} value={selectedValue} disabled={disabled} />}
      <SelectPrimitive.Root
        value={selectedInternalValue}
        dir={lang === "ar" ? "rtl" : "ltr"}
        disabled={disabled}
        onValueChange={(next) => {
          const nextValue = next === emptyValue ? "" : next;
          if (!isControlled) setUncontrolledValue(nextValue);
          onChange?.({ target: { value: nextValue } });
        }}
      >
        <SelectPrimitive.Trigger
          {...triggerProps}
          id={id}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-required={required || undefined}
          className={cn(
            "inline-flex h-11 min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <SelectPrimitive.Value placeholder="Choose an option" />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            align="start"
            className="z-[70] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface p-1.5 text-fg shadow-[var(--shadow-border-hover)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <SelectPrimitive.Viewport className="max-h-72 overflow-y-auto">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.key}
                  value={internalValue(option.value, emptyValue)}
                  disabled={option.disabled}
                  className="relative flex min-h-10 cursor-pointer select-none items-center rounded-lg py-2 pe-9 ps-3 text-sm outline-none transition-colors data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[state=checked]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute end-3 inline-flex items-center text-primary">
                    <Check className="size-4" aria-hidden="true" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </>
  );
}
