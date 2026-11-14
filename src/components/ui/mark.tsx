import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Mark({ className, ...props }: ComponentPropsWithoutRef<"mark">) {
  return (
    <mark
      className={cn(
        "rounded-sm bg-yellow-200 px-1 py-0.5 text-inherit dark:bg-yellow-300/30",
        className,
      )}
      {...props}
    />
  );
}
