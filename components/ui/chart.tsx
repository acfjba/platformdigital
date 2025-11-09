"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// #region Chart Types
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}
// #endregion

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve]:stroke-primary [&_.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke]!]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-radial-bar-background-sector]:stroke-border",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.HTMLAttributes<HTMLDivElement> & {
      indicator?: "dot" | "line" | "dashed"
      hideLabel?: boolean
      hideIndicator?: boolean
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload || payload.length === 0) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || ""}`
      const itemConfig = config[key]
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(label, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [
      label,
      payload,
      hideLabel,
      labelFormatter,
      labelClassName,
      labelKey,
      config,
    ])

    if (!active || !payload || payload.length === 0) {
      return null
    }

    const nestLabel = payload.length > 1

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        {!hideLabel && tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || ""}`
            const itemConfig = config[key]
            const indicatorColor = color || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  nestLabel ? "items-start" : "items-center"
                )}
              >
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0",
                      indicator === "dot" && "h-2.5 w-2.5 rounded-[2px]",
                      indicator === "line" && "h-full w-0.5",
                      indicator === "dashed" && "my-0.5 h-full w-0.5 border-l border-dashed"
                    )}
                    style={{
                      background: indicatorColor,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "flex flex-1 justify-between leading-none",
                    nestLabel ? "flex-col gap-1.5" : ""
                  )}
                >
                  <div className="grid flex-1 gap-1.5">
                    {itemConfig?.label || item.name}
                    {item.value && (
                        <span className="font-mono font-bold text-foreground">
                        {formatter
                            ? formatter(item.value, item.name ?? '', item, index, payload)
                            : item.value.toString()}
                        </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"


export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartContext, useChart };
