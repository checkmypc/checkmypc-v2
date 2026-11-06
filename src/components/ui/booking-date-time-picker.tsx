import * as Popover from "@radix-ui/react-popover";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type PickerKind = "date" | "time";

type BookingDateTimePickerProps = {
  id: string;
  name: string;
  kind: PickerKind;
  value: string;
  onValueChange: (value: string) => void;
};

const LOCALES = {
  en: "en-US",
  fr: "fr-FR",
  ar: "ar-MA",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function moveMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function DatePicker({
  id,
  name,
  value,
  onValueChange,
}: Omit<BookingDateTimePickerProps, "kind">) {
  const { lang, t } = useI18n();
  const locale = LOCALES[lang];
  const rtl = lang === "ar";
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  }, []);
  const selectedDate = parseIsoDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(selectedDate ?? today));
  const [focusedDate, setFocusedDate] = useState(() => dateToIso(selectedDate ?? today));
  const dayButtons = useRef(new Map<string, HTMLButtonElement>());

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const focusDate = parseIsoDate(value) ?? today;
      setVisibleMonth(monthStart(focusDate));
      setFocusedDate(dateToIso(focusDate));
    }
    setOpen(nextOpen);
  }

  useEffect(() => {
    if (!open) return;
    dayButtons.current.get(focusedDate)?.focus({ preventScroll: true });
  }, [open, focusedDate]);

  const firstDay = monthStart(visibleMonth);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      index - mondayOffset + 1,
      12,
    );
    return { date, iso: dateToIso(date), inMonth: date.getMonth() === visibleMonth.getMonth() };
  });
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 0, 5 + index, 12);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  });
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    calendar: "gregory",
  }).format(visibleMonth);
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long", calendar: "gregory" }).format(
        selectedDate,
      )
    : t("book.datePlaceholder");

  function changeMonth(amount: number) {
    const nextMonth = moveMonth(visibleMonth, amount);
    const nextFocused = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth(),
      Math.min(parseIsoDate(focusedDate)?.getDate() ?? 1, daysInMonth(nextMonth)),
      12,
    );
    setVisibleMonth(nextMonth);
    setFocusedDate(dateToIso(nextFocused));
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, iso: string) {
    const current = parseIsoDate(iso);
    if (!current) return;
    let offset: number | null = null;
    if (event.key === "ArrowLeft") offset = rtl ? 1 : -1;
    if (event.key === "ArrowRight") offset = rtl ? -1 : 1;
    if (event.key === "ArrowUp") offset = -7;
    if (event.key === "ArrowDown") offset = 7;
    if (event.key === "Home") offset = -((current.getDay() + 6) % 7);
    if (event.key === "End") offset = 6 - ((current.getDay() + 6) % 7);
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      changeMonth(event.key === "PageUp" ? -1 : 1);
      return;
    }
    if (offset === null) return;
    event.preventDefault();
    const nextDate = new Date(current.getTime() + offset * DAY_MS);
    const nextMonth = monthStart(nextDate);
    if (nextMonth.getTime() !== monthStart(visibleMonth).getTime()) {
      setVisibleMonth(nextMonth);
    }
    setFocusedDate(dateToIso(nextDate));
  }

  function selectDate(date: Date) {
    onValueChange(dateToIso(date));
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          className="booking-picker-trigger"
          aria-label={`${t("book.preferredDate")}: ${selectedLabel}`}
        >
          <span className={cn("booking-picker-value", !selectedDate && "is-placeholder")}>
            {selectedLabel}
          </span>
          <CalendarDays className="booking-picker-icon" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={rtl ? "rtl" : "ltr"}
          side="bottom"
          sideOffset={8}
          align="start"
          collisionPadding={12}
          className="booking-picker-content booking-calendar"
          aria-label={t("book.datePickerTitle")}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            window.requestAnimationFrame(() => {
              dayButtons.current.get(focusedDate)?.focus();
            });
          }}
        >
          <div className="booking-calendar-heading">
            <div className="booking-calendar-month" aria-live="polite">
              {monthLabel}
            </div>
            <div className="booking-calendar-navigation">
              <button
                type="button"
                className="booking-calendar-nav"
                aria-label={t("book.previousMonth")}
                onClick={() => changeMonth(-1)}
              >
                {rtl ? <ChevronRight /> : <ChevronLeft />}
              </button>
              <button
                type="button"
                className="booking-calendar-nav"
                aria-label={t("book.nextMonth")}
                onClick={() => changeMonth(1)}
              >
                {rtl ? <ChevronLeft /> : <ChevronRight />}
              </button>
            </div>
          </div>
          <div className="booking-calendar-grid" role="grid" aria-label={monthLabel}>
            <div className="booking-calendar-weekdays" role="row">
              {weekdays.map((weekday, index) => (
                <span
                  key={`${weekday}-${index}`}
                  className="booking-calendar-weekday"
                  role="columnheader"
                >
                  {weekday}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} className="booking-calendar-row" role="row">
                {calendarDays.slice(week * 7, week * 7 + 7).map(({ date, iso, inMonth }) => {
                  const isSelected = iso === value;
                  const isToday = iso === dateToIso(today);
                  return (
                    <div key={iso} role="gridcell" aria-selected={isSelected || undefined}>
                      <button
                        ref={(node) => {
                          if (node) dayButtons.current.set(iso, node);
                          else dayButtons.current.delete(iso);
                        }}
                        type="button"
                        tabIndex={iso === focusedDate ? 0 : -1}
                        aria-label={new Intl.DateTimeFormat(locale, {
                          dateStyle: "full",
                          calendar: "gregory",
                        }).format(date)}
                        aria-pressed={isSelected}
                        aria-current={isToday ? "date" : undefined}
                        className={cn(
                          "booking-calendar-day",
                          !inMonth && "is-outside",
                          isToday && "is-today",
                          isSelected && "is-selected",
                        )}
                        onFocus={() => setFocusedDate(iso)}
                        onKeyDown={(event) => handleDayKeyDown(event, iso)}
                        onClick={() => selectDate(date)}
                      >
                        {new Intl.NumberFormat(locale, { useGrouping: false }).format(date.getDate())}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="booking-calendar-footer">
            <button type="button" className="booking-picker-text-button" onClick={() => selectDate(today)}>
              {t("book.today")}
            </button>
            {value && (
              <button
                type="button"
                className="booking-picker-text-button is-muted"
                onClick={() => {
                  onValueChange("");
                  setOpen(false);
                }}
              >
                {t("book.clearDate")}
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const TIME_SLOTS = Array.from({ length: 18 }, (_, index) => {
  const minutesAfterOpening = index * 30;
  const hours = 10 + Math.floor(minutesAfterOpening / 60);
  const minutes = minutesAfterOpening % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function TimePicker({
  id,
  name,
  value,
  onValueChange,
}: Omit<BookingDateTimePickerProps, "kind">) {
  const { lang, t } = useI18n();
  const rtl = lang === "ar";
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          className="booking-picker-trigger"
          aria-label={`${t("book.preferredTime")}: ${value || t("book.timePlaceholder")}`}
        >
          <span className={cn("booking-picker-value", !value && "is-placeholder")}>
            {value || t("book.timePlaceholder")}
          </span>
          <Clock3 className="booking-picker-icon" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          dir={rtl ? "rtl" : "ltr"}
          side="bottom"
          sideOffset={8}
          align="start"
          collisionPadding={12}
          className="booking-picker-content booking-time-picker"
          aria-label={t("book.timePickerTitle")}
        >
          <div className="booking-time-heading">
            <div className="booking-calendar-month">{t("book.timePickerTitle")}</div>
            <p>{t("book.timePickerHint")}</p>
          </div>
          <div className="booking-time-grid" role="group" aria-label={t("book.timePickerTitle")}>
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                className={cn("booking-time-slot", value === slot && "is-selected")}
                aria-pressed={value === slot}
                onClick={() => {
                  onValueChange(slot);
                  setOpen(false);
                }}
              >
                {slot}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function BookingDateTimePicker(props: BookingDateTimePickerProps) {
  return props.kind === "date" ? <DatePicker {...props} /> : <TimePicker {...props} />;
}
