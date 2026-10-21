import { cn } from "heroui-native"
import { Text, type TextProps } from "react-native"

import { formatAmount } from "@/src/features/transactions/format"
import type { Currency } from "@/src/features/transactions/types"

type Props = Omit<TextProps, "children"> & {
  cents: number
  className?: string
  currency: Currency
}

// Amounts are the protagonist, so they always use tabular figures: columns and
// changing values stay aligned, and the brand's es-AR currency format.
export function Money({ cents, className, currency, style, ...props }: Props) {
  return (
    <Text
      className={cn("text-foreground", className)}
      style={[{ fontVariant: ["tabular-nums"] }, style]}
      {...props}
    >
      {formatAmount(cents, currency)}
    </Text>
  )
}
