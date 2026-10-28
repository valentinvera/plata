import { Ionicons } from "@expo/vector-icons"
import { useThemeColor } from "heroui-native"
import type { ComponentProps, ReactNode } from "react"
import { useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { withUniwind } from "uniwind"

import { Money } from "@/components/money"
import { formatAmount } from "@/src/features/transactions/format"
import type { Currency } from "@/src/features/transactions/types"

import { financeLayout, financeTypography } from "./tokens"

export type FinanceIconName = ComponentProps<typeof Ionicons>["name"]
const StyledIonicons = withUniwind(Ionicons)

const styles = StyleSheet.create({
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
  iconButton: {
    width: financeLayout.touchTarget,
    height: financeLayout.touchTarget,
  },
  button: { minHeight: financeLayout.touchTarget },
  quickAction: { minHeight: 88 },
})

export function FinanceIcon({
  name,
  className = "text-foreground",
  size = 22,
}: {
  name: FinanceIconName
  className?: string
  size?: number
}) {
  return (
    <StyledIonicons
      accessible={false}
      aria-hidden
      className={className}
      name={name}
      size={size}
    />
  )
}

export function FinanceIconButton({
  icon,
  label,
  onPress,
  isPressed,
  tone = "surface",
}: {
  icon: FinanceIconName
  label: string
  onPress: () => void
  isPressed?: boolean
  tone?: "surface" | "ghost"
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={
        isPressed === undefined ? undefined : { selected: isPressed }
      }
      aria-pressed={isPressed}
      className={`items-center justify-center rounded-full ${tone === "surface" ? "bg-surface-secondary" : "bg-transparent"}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <FinanceIcon name={icon} />
    </Pressable>
  )
}

export function FinanceQuickAction({
  icon,
  label,
  accessibilityLabel = label,
  onPress,
  variant = "secondary",
}: {
  icon: FinanceIconName
  label: string
  accessibilityLabel?: string
  onPress: () => void
  variant?: "primary" | "secondary"
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="min-w-0 flex-1 items-center justify-center gap-2"
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        pressed ? styles.pressed : undefined,
      ]}
    >
      <View
        className={`h-14 w-14 items-center justify-center rounded-full ${variant === "primary" ? "bg-accent" : "bg-surface-secondary"}`}
      >
        <FinanceIcon
          className={
            variant === "primary" ? "text-accent-foreground" : "text-foreground"
          }
          name={icon}
          size={25}
        />
      </View>
      <Text
        className="text-center text-foreground"
        style={financeTypography.medium}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function FinanceButton({
  label,
  accessibilityLabel = label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  label: string
  accessibilityLabel?: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "soft"
}) {
  const spinnerColor = useThemeColor(
    variant === "primary" ? "accent-foreground" : "foreground"
  )
  const isDisabled = loading || disabled
  return (
    <Pressable
      accessibilityLabel={loading ? "Procesando" : accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      aria-busy={loading}
      className={`items-center justify-center rounded-full px-4 py-2 ${variant === "primary" ? "bg-accent" : "bg-surface-secondary"}`}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isDisabled ? styles.disabled : undefined,
        pressed ? styles.pressed : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text
          className={
            variant === "primary" ? "text-accent-foreground" : "text-foreground"
          }
          style={financeTypography.medium}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

export function FinanceSectionHeading({
  title,
  count,
  size = "section",
  action,
}: {
  title: string
  count?: number
  size?: "section" | "group"
  action?: { icon: FinanceIconName; label: string; onPress: () => void }
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className={size === "section" ? "text-foreground" : "text-muted"}
          style={
            size === "section"
              ? financeTypography.section
              : financeTypography.medium
          }
        >
          {title}
        </Text>
        {count === undefined ? null : (
          <View className="min-w-6 items-center rounded-full bg-surface-secondary px-2 py-0.5">
            <Text className="text-foreground" style={financeTypography.meta}>
              {count}
            </Text>
          </View>
        )}
      </View>
      {action ? (
        <FinanceIconButton
          icon={action.icon}
          label={action.label}
          onPress={action.onPress}
          tone="ghost"
        />
      ) : null}
    </View>
  )
}

export function FinanceListRow({
  title,
  description,
  icon,
  iconSurface = "bg-accent/10",
  value,
  action,
  accessibilityLabel,
  onPress,
}: {
  title: string
  description: string
  icon: FinanceIconName
  iconSurface?: string
  value?: ReactNode
  action?: ReactNode
  accessibilityLabel: string
  onPress: () => void
}) {
  return (
    <View className="min-h-17 flex-row items-center gap-3 border-border border-b py-3">
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        className="min-h-11 min-w-0 flex-1 flex-row items-center gap-3"
        onPress={onPress}
        style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      >
        <View
          className={`h-11 w-11 items-center justify-center rounded-full ${iconSurface}`}
        >
          <FinanceIcon name={icon} />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            className="text-foreground"
            numberOfLines={1}
            style={financeTypography.row}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-muted"
            numberOfLines={2}
            style={financeTypography.meta}
          >
            {description}
          </Text>
        </View>
      </Pressable>
      {value === undefined && action === undefined ? null : (
        <View className="max-w-[42%] items-end gap-2">
          {value}
          {action}
        </View>
      )}
    </View>
  )
}

const AMOUNT_CHARACTER_WIDTH_RATIO = 0.65
const MIN_AMOUNT_FONT_SIZE = 16

export function FinanceAmount({
  cents,
  currency,
}: {
  cents: number
  currency: Currency
}) {
  const { width, fontScale } = useWindowDimensions()
  const [contentWidth, setContentWidth] = useState(0)
  const label = formatAmount(cents, currency)
  const availableWidth =
    contentWidth ||
    Math.min(
      width - financeLayout.spacing.lg * 2,
      financeLayout.contentMaxWidth
    ) -
      financeLayout.spacing.lg * 2
  // Native supports automatic fitting; a conservative budget for Manrope's
  // tabular numerals also prevents React Native Web from hiding centavos.
  const fontSize = Math.min(
    financeTypography.amount.fontSize,
    Math.max(
      MIN_AMOUNT_FONT_SIZE / fontScale,
      Math.floor(
        availableWidth /
          (label.length * AMOUNT_CHARACTER_WIDTH_RATIO * fontScale)
      )
    )
  )
  return (
    <View onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
      <Money
        adjustsFontSizeToFit
        cents={cents}
        currency={currency}
        minimumFontScale={0.4}
        numberOfLines={1}
        selectable
        style={[financeTypography.amount, { fontSize }]}
      />
    </View>
  )
}

export function MaskedAmount({ size = "row" }: { size?: "summary" | "row" }) {
  return (
    <Text
      accessibilityLabel="Importe oculto"
      className="text-foreground"
      style={
        size === "summary" ? financeTypography.amount : financeTypography.row
      }
    >
      ••••
    </Text>
  )
}
