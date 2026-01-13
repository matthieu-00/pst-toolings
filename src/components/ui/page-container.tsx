import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const pageContainerVariants = cva(
  "mx-auto",
  {
    variants: {
      variant: {
        default: "min-h-screen bg-background p-4 md:p-6",
        full: "h-screen bg-background",
        minimal: "min-h-screen bg-background",
        muted: "min-h-screen bg-muted p-4",
      },
      maxWidth: {
        none: "",
        sm: "max-w-4xl",
        md: "max-w-5xl",
        lg: "max-w-6xl",
        xl: "max-w-7xl",
        "95vw": "max-w-[95vw]",
      },
    },
    defaultVariants: {
      variant: "default",
      maxWidth: "xl",
    },
  }
)

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof pageContainerVariants> {}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, variant, maxWidth, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(pageContainerVariants({ variant, maxWidth }), className)}
        {...props}
      />
    )
  }
)
PageContainer.displayName = "PageContainer"

export { PageContainer, pageContainerVariants }
