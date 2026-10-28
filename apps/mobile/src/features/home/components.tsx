import { Ionicons } from "@expo/vector-icons"
import type { ComponentProps } from "react"
import { useState } from "react"
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { withUniwind } from "uniwind"

import {
  FinanceAmount,
  FinanceButton,
  FinanceIconButton,
  FinanceListRow,
  FinanceQuickAction,
  FinanceSectionHeading,
  MaskedAmount,
} from "@/components/finance/primitives"
import {
  financeFonts,
  financeLayout,
  financeTypography,
} from "@/components/finance/tokens"
import { Money } from "@/components/money"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  type Account,
  ALL_ACCOUNTS,
  NO_ACCOUNT,
} from "@/src/features/transactions/accounts"
import {
  formatAmount,
  formatDay,
  formatMonth,
} from "@/src/features/transactions/format"
import type { HomeHighlights } from "@/src/features/transactions/highlights"
import type { Transaction } from "@/src/features/transactions/types"
import type { TransactionSection } from "./sections"

const StyledIonicons = withUniwind(Ionicons)
type IoniconName = ComponentProps<typeof Ionicons>["name"]
export const homeFonts = financeFonts

export const homeStyles = StyleSheet.create({
  ...financeTypography,
  pressed: { opacity: 0.65 },
  content: {
    width: "100%",
    maxWidth: financeLayout.contentMaxWidth,
    alignSelf: "center",
  },
  emptyIllustration: { width: 80, height: 108 },
})

export interface HomeActions {
  account: () => void
  accounts: () => void
  add: () => void
  budgets: () => void
  catchUp: () => void
  categories: () => void
  duplicates: () => void
  exportData: () => void
  insights: () => void
  notifications: () => void
  preferences: () => void
  recurring: () => void
  search: () => void
  week: () => void
}

// Spending more is information, not an error. Only a decrease gets an accent.
function changeLabel(ratio: number | null): string {
  if (ratio === null) {
    return "Sin datos del mes pasado"
  }
  const percent = Math.round(ratio * 100)
  if (percent === 0) {
    return "Igual que el mes pasado"
  }
  return percent > 0
    ? `${percent}% más que el mes pasado`
    : `${Math.abs(percent)}% menos que el mes pasado`
}

interface LinkItem {
  label: string
  onPress: () => void
}

function MoreGroup({
  items,
  title,
}: {
  items: readonly LinkItem[]
  title: string
}) {
  return (
    <View className="mt-5">
      <Text className="mb-1 text-muted text-xs" style={homeStyles.medium}>
        {title}
      </Text>
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center justify-between gap-3 border-border border-b py-3"
          key={item.label}
          onPress={item.onPress}
          style={({ pressed }) => (pressed ? homeStyles.pressed : undefined)}
        >
          <Text
            className="flex-1 text-foreground text-sm"
            style={homeStyles.medium}
          >
            {item.label}
          </Text>
          <StyledIonicons
            accessible={false}
            aria-hidden
            className="text-muted"
            name="chevron-forward"
            size={16}
          />
        </Pressable>
      ))}
    </View>
  )
}

export function MoreSection({
  actions,
  highlights,
}: {
  actions: HomeActions
  highlights: HomeHighlights
}) {
  const [expanded, setExpanded] = useState(false)
  const dataItems: LinkItem[] = [
    { label: "Medios de pago", onPress: actions.accounts },
    { label: "Mi cuenta", onPress: actions.account },
    ...(Platform.OS === "web"
      ? []
      : [{ label: "Exportar", onPress: actions.exportData }]),
    ...(Platform.OS === "android"
      ? [{ label: "Importación automática", onPress: actions.notifications }]
      : []),
  ]

  return (
    <View className="mt-6 mb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-surface-secondary px-4 py-4"
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => (pressed ? homeStyles.pressed : undefined)}
      >
        <StyledIonicons
          accessible={false}
          aria-hidden
          className="text-foreground"
          name="options-outline"
          size={23}
        />
        <Text
          className="flex-1 text-base text-foreground"
          style={homeStyles.medium}
        >
          Más herramientas
        </Text>
        <StyledIonicons
          accessible={false}
          aria-hidden
          className="text-foreground"
          name={expanded ? "chevron-up" : "chevron-forward"}
          size={18}
        />
      </Pressable>
      {expanded ? (
        <View className="px-2">
          <MoreGroup
            items={[
              { label: "Buscar movimientos", onPress: actions.search },
              { label: "Análisis", onPress: actions.insights },
              {
                label: `Recurrentes · ${highlights.recurring}`,
                onPress: actions.recurring,
              },
              {
                label: `Duplicados · ${highlights.duplicates}`,
                onPress: actions.duplicates,
              },
            ]}
            title="Tu actividad"
          />
          <MoreGroup
            items={[
              { label: "Presupuestos", onPress: actions.budgets },
              { label: "Categorías", onPress: actions.categories },
              { label: "Preferencias", onPress: actions.preferences },
            ]}
            title="Tu organización"
          />
          <MoreGroup items={dataItems} title="Tus datos" />
        </View>
      ) : null}
    </View>
  )
}

function MonthlySummary({
  highlights,
  month,
  amountsHidden,
  onToggleAmounts,
  changeTone,
}: {
  highlights: HomeHighlights
  month: number
  amountsHidden: boolean
  onToggleAmounts: () => void
  changeTone: string
}) {
  const decreased =
    highlights.monthExpenseChangeRatio !== null &&
    highlights.monthExpenseChangeRatio < 0
  return (
    <View className="mt-4 rounded-2xl bg-surface px-4 pt-3 pb-4">
      <View className="flex-row items-center gap-2">
        <Text
          className="min-w-0 flex-1 text-foreground"
          style={financeTypography.medium}
        >
          Gastos de {formatMonth(month).toLocaleLowerCase("es-AR")}
        </Text>
        <View className="rounded-full bg-surface-secondary px-2 py-1">
          <Text className="text-muted" style={financeTypography.meta}>
            ARS
          </Text>
        </View>
        <FinanceIconButton
          icon={amountsHidden ? "eye-off-outline" : "eye-outline"}
          isPressed={amountsHidden}
          label={amountsHidden ? "Mostrar importes" : "Ocultar importes"}
          onPress={onToggleAmounts}
          tone="ghost"
        />
      </View>
      {amountsHidden ? (
        <MaskedAmount size="summary" />
      ) : (
        <FinanceAmount cents={highlights.monthExpense} currency="ARS" />
      )}
      <View className="mt-2 min-h-6 flex-row items-center gap-1.5">
        {!amountsHidden && decreased ? (
          <StyledIonicons
            accessible={false}
            aria-hidden
            className="text-accent"
            name="arrow-down"
            size={16}
          />
        ) : null}
        <Text
          className={amountsHidden ? "text-muted" : changeTone}
          style={financeTypography.meta}
        >
          {amountsHidden
            ? "Importes ocultos"
            : changeLabel(highlights.monthExpenseChangeRatio)}
        </Text>
      </View>
    </View>
  )
}

function AccountFilter({
  accounts,
  onSelect,
  selected,
}: {
  accounts: readonly Account[]
  onSelect: (id: string) => void
  selected: string
}) {
  const options = [
    { id: ALL_ACCOUNTS, name: "Todos" },
    ...accounts,
    { id: NO_ACCOUNT, name: "Sin medio" },
  ]
  return (
    <ScrollView
      accessibilityLabel="Filtrar movimientos por medio de pago"
      className="mt-2"
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {options.map((account) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === account.id }}
          aria-pressed={selected === account.id}
          className={`min-h-11 items-center justify-center rounded-full px-4 py-2 ${selected === account.id ? "bg-accent" : "bg-surface-secondary"}`}
          key={account.id}
          onPress={() => onSelect(account.id)}
          style={({ pressed }) => (pressed ? homeStyles.pressed : undefined)}
        >
          <Text
            className={
              selected === account.id ? "text-accent-foreground" : "text-muted"
            }
            style={financeTypography.medium}
          >
            {account.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

export function HomeHeader({
  accountFilter,
  accounts,
  actions,
  changeTone,
  highlights,
  month,
  onSelectAccount,
  amountsHidden,
  onToggleAmounts,
}: {
  accountFilter: string
  accounts: readonly Account[]
  actions: HomeActions
  changeTone: string
  highlights: HomeHighlights
  month: number
  onSelectAccount: (id: string) => void
  amountsHidden: boolean
  onToggleAmounts: () => void
}) {
  return (
    <View className="pt-4">
      <View className="flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="flex-1 text-foreground tracking-tight"
          style={financeTypography.screen}
        >
          Plata
        </Text>
        <FinanceIconButton
          icon="person-outline"
          label="Mi cuenta"
          onPress={actions.account}
        />
        <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-secondary">
          <ThemeToggle />
        </View>
      </View>
      <MonthlySummary
        amountsHidden={amountsHidden}
        changeTone={changeTone}
        highlights={highlights}
        month={month}
        onToggleAmounts={onToggleAmounts}
      />
      <View className="mt-4 flex-row gap-3">
        <FinanceQuickAction
          accessibilityLabel="Ponerme al día"
          icon="checkmark-done-outline"
          label="Al día"
          onPress={actions.catchUp}
          variant="primary"
        />
        <FinanceQuickAction
          accessibilityLabel="Agregar movimiento"
          icon="add-outline"
          label="Agregar"
          onPress={actions.add}
        />
        <FinanceQuickAction
          accessibilityLabel="Ver mi semana"
          icon="calendar-outline"
          label="Mi semana"
          onPress={actions.week}
        />
      </View>
      <View className="mt-5">
        <FinanceSectionHeading
          action={{
            icon: "search-outline",
            label: "Buscar movimientos",
            onPress: actions.search,
          }}
          title="Movimientos"
        />
      </View>
      <AccountFilter
        accounts={accounts}
        onSelect={onSelectAccount}
        selected={accountFilter}
      />
    </View>
  )
}

export function HomeSectionHeader({
  section,
}: {
  section: TransactionSection
}) {
  return (
    <View className="mt-5 mb-2">
      <FinanceSectionHeading
        count={section.type === "suggested" ? section.data.length : undefined}
        size="group"
        title={section.title}
      />
    </View>
  )
}

export function EmptyState({
  filtered,
  onAction,
}: {
  filtered: boolean
  onAction: () => void
}) {
  return (
    <View className="items-center px-3 py-8">
      {filtered ? null : (
        <Image
          accessible={false}
          aria-hidden
          resizeMode="contain"
          source={require("../../../assets/images/catch-up-slips.png")}
          style={homeStyles.emptyIllustration}
        />
      )}
      <Text
        className="mt-2 text-center text-foreground"
        style={financeTypography.row}
      >
        {filtered
          ? "No hay movimientos con este filtro"
          : "Tu primer movimiento empieza acá"}
      </Text>
      <Text
        className="mt-2 text-center text-muted"
        style={financeTypography.body}
      >
        {filtered
          ? "Probá con otro medio de pago."
          : "Subí una captura o agregá un movimiento y listo."}
      </Text>
      <View className="mt-4">
        <FinanceButton
          label={filtered ? "Ver todos" : "Agregar movimiento"}
          onPress={onAction}
          variant="soft"
        />
      </View>
    </View>
  )
}

const categoryIcons: Record<string, IoniconName> = {
  groceries: "cart-outline",
  food: "restaurant-outline",
  transport: "bus-outline",
  services: "flash-outline",
  health: "medkit-outline",
  shopping: "shirt-outline",
  entertainment: "ticket-outline",
  education: "book-outline",
  home: "home-outline",
  transfers: "swap-horizontal-outline",
  fees: "document-text-outline",
  income: "arrow-down-outline",
}

const categoryTints: Record<string, string> = {
  transport: "bg-[#e2eef8] dark:bg-[#183448]",
  food: "bg-[#faedd4] dark:bg-[#3b3220]",
  shopping: "bg-[#fbe2df] dark:bg-[#432d2c]",
  home: "bg-[#eee4f7] dark:bg-[#342b44]",
}

export function TransactionRow({
  accountName,
  categoryName,
  item,
  onConfirm,
  onOpen,
  suggested,
  confirming,
  confirmationPending,
  amountsHidden,
}: {
  accountName: string | null
  categoryName: string
  item: Transaction
  onConfirm: (id: string) => void
  onOpen: (id: string) => void
  suggested: boolean
  confirming: boolean
  confirmationPending: boolean
  amountsHidden: boolean
}) {
  const merchant = item.merchant?.trim() || "Sin comercio"
  const meta = accountName ? `${categoryName} · ${accountName}` : categoryName
  const kindLabel = item.kind === "income" ? "Ingreso" : "Gasto"
  const amountLabel = amountsHidden
    ? "importe oculto"
    : formatAmount(item.amount, item.currency)
  return (
    <FinanceListRow
      accessibilityLabel={`${kindLabel}: ${merchant}, ${meta}, ${formatDay(item.occurredAt)}, ${amountLabel}`}
      action={
        suggested ? (
          <FinanceButton
            accessibilityLabel={`Confirmar ${merchant}`}
            disabled={confirmationPending}
            label="Confirmar"
            loading={confirming}
            onPress={() => onConfirm(item.id)}
            variant="soft"
          />
        ) : undefined
      }
      description={meta}
      icon={categoryIcons[item.categoryId] ?? "receipt-outline"}
      iconSurface={categoryTints[item.categoryId] ?? "bg-accent/10"}
      onPress={() => onOpen(item.id)}
      title={merchant}
      value={
        amountsHidden ? (
          <MaskedAmount />
        ) : (
          <Text
            className={
              item.kind === "income" ? "text-accent" : "text-foreground"
            }
            style={financeTypography.medium}
          >
            {item.kind === "income" ? "+" : ""}
            <Money
              cents={item.amount}
              className={
                item.kind === "income" ? "text-accent" : "text-foreground"
              }
              currency={item.currency}
              style={financeTypography.medium}
            />
          </Text>
        )
      }
    />
  )
}
