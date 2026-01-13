import * as React from "react"
import { HelpCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface HelpTooltipProps {
  content: React.ReactNode
  variant?: "tooltip" | "modal"
  icon?: "help" | "info"
  className?: string
  tooltipPosition?: "top" | "bottom" | "left" | "right"
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  variant = "tooltip",
  icon = "help",
  className,
  tooltipPosition = "bottom",
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen && variant === "tooltip") {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, variant])

  const IconComponent = icon === "help" ? HelpCircle : Info

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  if (variant === "modal") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "p-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground",
            className
          )}
          aria-label="Show help"
        >
          <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        {isOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="bg-card p-6 max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-border shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Help</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close help"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-sm text-foreground">{content}</div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="relative inline-block" ref={tooltipRef}>
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground",
          className
        )}
        aria-label="Show help"
      >
        <IconComponent className="w-5 h-5 text-muted-foreground" />
      </button>
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-80 bg-popover text-popover-foreground text-xs p-3 rounded-lg shadow-xl border border-border",
            positionClasses[tooltipPosition]
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
