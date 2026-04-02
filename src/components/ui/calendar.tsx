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
        caption_label: "text-sm font-medium text-white",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 border-[#3A3A3C] bg-transparent p-0 text-white hover:bg-[#27292D]"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 border-[#3A3A3C] bg-transparent p-0 text-white hover:bg-[#27292D]"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "mb-1 grid grid-cols-7",
        weekday: "text-center text-xs font-normal text-[#8E8E93]",
        week: "grid grid-cols-7",
        day: "flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-md p-0 font-normal text-white hover:bg-[#27292D] aria-selected:bg-white aria-selected:text-black data-[outside=true]:text-[#666666] data-[outside=true]:opacity-70 data-[outside=true]:aria-selected:bg-[#3A3A3C] data-[outside=true]:aria-selected:text-[#CCCCCC]"
        ),
        today: "border border-[#3A3A3C]",
        outside: "text-[#666666]",
        disabled: "text-[#666666] opacity-50",
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
