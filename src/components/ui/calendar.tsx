import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ru } from "react-day-picker/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ru}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "w-full",
        caption: "mb-3 flex items-center justify-between",
        caption_label: "text-sm font-medium text-foreground",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 p-0"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 p-0"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "mb-1 grid grid-cols-7",
        weekday: "text-center text-xs font-normal text-muted-foreground",
        week: "grid grid-cols-7",
        day: "flex items-center justify-center p-0",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 font-normal text-foreground hover:bg-muted",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:font-semibold",
        today: "[&>button]:border [&>button]:border-border",
        outside: "[&>button]:text-muted-foreground [&>button]:opacity-70",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", className)} {...chevronProps} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", className)} {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
