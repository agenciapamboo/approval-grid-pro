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
          "glass border-primary/30 bg-gradient-to-r from-primary/20 to-primary-glow/20 text-primary shadow-sm",
        warning:
          "glass border-warning/30 bg-gradient-to-r from-warning/20 to-warning/10 text-warning shadow-sm",
        destructive:
          "glass border-destructive/30 bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive shadow-sm",
        pending:
          "glass border-accent/30 bg-gradient-to-r from-accent/20 to-accent/10 text-accent shadow-sm",
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
