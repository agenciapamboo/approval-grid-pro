import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "glass border-border/50 bg-primary/10 text-primary hover:bg-primary/20",
        success:
          "glass border-green-500/30 bg-green-500/20 text-green-600 dark:text-green-400 shadow-sm",
        warning:
          "glass border-orange-500/30 bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm",
        destructive:
          "glass border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400 shadow-sm",
        pending:
          "glass border-blue-500/30 bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm",
        outline: "glass border-border/50 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
