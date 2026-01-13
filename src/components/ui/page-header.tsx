import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  helpContent?: React.ReactNode
  onHelpClick?: () => void
  showHelpButton?: boolean
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, icon: Icon, title, description, helpContent, onHelpClick, showHelpButton, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-start justify-between gap-4", className)}
        {...props}
      >
        <div className="flex items-center gap-3 flex-1">
          {Icon && <Icon className="w-6 h-6 md:w-8 md:h-8 text-foreground flex-shrink-0" />}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {showHelpButton && onHelpClick && (
          <button
            onClick={onHelpClick}
            className="p-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            aria-label="Show help"
          >
            {helpContent || (
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
