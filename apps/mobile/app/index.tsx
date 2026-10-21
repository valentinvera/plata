import { Ionicons } from "@expo/vector-icons"
import { Redirect, router, useFocusEffect } from "expo-router"
import { Button, Card, Chip, Spinner } from "heroui-native"
import type { ComponentProps } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { withUniwind } from "uniwind"

import { Container } from "@/components/container"
import { Money } from "@/components/money"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  type Account,
  ALL_ACCOUNTS,
  getAccountName,
  NO_ACCOUNT,
} from "@/src/features/transactions/accounts"
import {
  DEFAULT_CATEGORIES,
  getCategoryById,
} from "@/src/features/transactions/categories"
import { formatAmount, formatMonth } from "@/src/features/transactions/format"
import {
  computeHighlights,
  type HomeHighlights,
} from "@/src/features/transactions/highlights"
import {
  useAccounts,
  useAllTransactions,
  useAppMeta,
  useCategories,
  useConfirmedTransactions,
  useSuggestedTransactions,
  useTransactionsInRange,
  useUpdateTransactionState,
} from "@/src/features/transactions/hooks"
import {
  ONBOARDING_COMPLETED_KEY,
  shouldShowOnboarding,
} from "@/src/features/transactions/onboarding"
import { monthRange } from "@/src/features/transactions/periods"
import type { Category, Transaction } from "@/src/features/transactions/types"

const DEFAULT_CURRENCY = "ARS"

const StyledIonicons = withUniwind(Ionicons)

type IoniconName = ComponentProps<typeof Ionicons>["name"]

const styles = StyleSheet.create({
  heroAmount: { fontSize: 34, lineHeight: 40 },
  pressed: { opacity: 0.6 },
  tabular: { fontVariant: ["tabular-nums"] },
})

interface HomeActions {
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

// "Sin culpa": spending more is not an error, so only a decrease is celebrated.
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

interface Shortcut extends LinkItem {
  icon: IoniconName
}

function ShortcutTile({ icon, label, onPress }: Shortcut) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="flex-1 flex-row items-center gap-2 rounded-xl bg-surface px-3 py-3"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <StyledIonicons className="text-accent" name={icon} size={18} />
      <Text
        className="flex-1 font-medium text-foreground text-sm"
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function StatPill({
  label,
  onPress,
  value,
}: {
  label: string
  onPress: () => void
  value: number
}) {
  return (
    <Pressable
      accessibilityLabel={`${value} ${label.toLowerCase()}`}
      accessibilityRole="button"
      className="flex-1 rounded-lg bg-surface-secondary px-3 py-2"
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <Text
        className="font-semibold text-foreground text-lg leading-none"
        style={styles.tabular}
      >
        {value}
      </Text>
      <Text className="mt-0.5 text-muted text-xs">{label}</Text>
    </Pressable>
  )
}

function MoreGroup({
  items,
  title,
}: {
  items: readonly LinkItem[]
  title: string
}) {
  return (
    <View className="mt-3">
      <Text className="font-medium text-muted text-xs uppercase tracking-wide">
        {title}
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {items.map((item) => (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="button"
            className="rounded-full bg-surface px-3 py-1.5"
            hitSlop={8}
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => (pressed ? styles.pressed : undefined)}
          >
            <Text className="font-medium text-foreground text-sm">
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function SummaryCard({
  allCategories,
  changeTone,
  highlights,
  onDuplicates,
  onRecurring,
}: {
  allCategories: readonly Category[]
  changeTone: string
  highlights: HomeHighlights
  onDuplicates: () => void
  onRecurring: () => void
}) {
  const { topCategory } = highlights

  return (
    <Card className="mt-5 p-5">
      <Text className="font-medium text-muted text-xs uppercase tracking-wide">
        Gastos del mes
      </Text>
      <Money
        cents={highlights.monthExpense}
        className="mt-1 font-bold"
        currency={DEFAULT_CURRENCY}
        style={styles.heroAmount}
      />
      <Text className={`mt-1 text-sm ${changeTone}`}>
        {changeLabel(highlights.monthExpenseChangeRatio)}
      </Text>

      {topCategory ? (
        <Text className="mt-3 text-muted text-xs">
          Donde más gastaste:{" "}
          <Text className="font-medium text-foreground">
            {getCategoryById(topCategory.categoryId, allCategories).name}
          </Text>
          {" · "}
          {formatAmount(topCategory.amount, DEFAULT_CURRENCY)}
        </Text>
      ) : null}

      <View className="mt-4 flex-row gap-2 border-border border-t pt-4">
        <StatPill
          label="Recurrentes"
          onPress={onRecurring}
          value={highlights.recurring}
        />
        <StatPill
          label="Duplicados"
          onPress={onDuplicates}
          value={highlights.duplicates}
        />
      </View>
    </Card>
  )
}

function ShortcutGrid({ actions }: { actions: HomeActions }) {
  return (
    <View className="mt-4 gap-2">
      <View className="flex-row gap-2">
        <ShortcutTile
          icon="sparkles-outline"
          label="Ponerme al día"
          onPress={actions.catchUp}
        />
        <ShortcutTile
          icon="calendar-outline"
          label="Esta semana"
          onPress={actions.week}
        />
      </View>
      <View className="flex-row gap-2">
        <ShortcutTile
          icon="pie-chart-outline"
          label="Análisis"
          onPress={actions.insights}
        />
        <ShortcutTile
          icon="search-outline"
          label="Buscar"
          onPress={actions.search}
        />
      </View>
    </View>
  )
}

function MoreSection({ actions }: { actions: HomeActions }) {
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
    <View className="mt-6">
      <Text className="font-semibold text-foreground">Más</Text>
      <MoreGroup
        items={[
          { label: "Presupuestos", onPress: actions.budgets },
          { label: "Categorías", onPress: actions.categories },
          { label: "Preferencias", onPress: actions.preferences },
        ]}
        title="Plan"
      />
      <MoreGroup
        items={[
          { label: "Recurrentes", onPress: actions.recurring },
          { label: "Duplicados", onPress: actions.duplicates },
        ]}
        title="Actividad"
      />
      <MoreGroup items={dataItems} title="Datos" />
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
  return (
    <>
      <Text className="mt-6 mb-2 font-medium text-muted text-xs uppercase tracking-wide">
        Filtrar por medio de pago
      </Text>
      <ScrollView
        accessibilityRole="radiogroup"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <Chip
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === ALL_ACCOUNTS }}
          onPress={() => onSelect(ALL_ACCOUNTS)}
          variant={selected === ALL_ACCOUNTS ? "primary" : "soft"}
        >
          <Chip.Label>Todos</Chip.Label>
        </Chip>
        <Chip
          accessibilityRole="radio"
          accessibilityState={{ selected: selected === NO_ACCOUNT }}
          onPress={() => onSelect(NO_ACCOUNT)}
          variant={selected === NO_ACCOUNT ? "primary" : "soft"}
        >
          <Chip.Label>Sin medio</Chip.Label>
        </Chip>
        {accounts.map((account) => (
          <Chip
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === account.id }}
            key={account.id}
            onPress={() => onSelect(account.id)}
            variant={selected === account.id ? "primary" : "soft"}
          >
            <Chip.Label>{account.name}</Chip.Label>
          </Chip>
        ))}
      </ScrollView>
    </>
  )
}

function HomeHeader({
  accountFilter,
  accounts,
  actions,
  allCategories,
  changeTone,
  highlights,
  month,
  onSelectAccount,
}: {
  accountFilter: string
  accounts: readonly Account[]
  actions: HomeActions
  allCategories: readonly Category[]
  changeTone: string
  highlights: HomeHighlights
  month: number
  onSelectAccount: (id: string) => void
}) {
  return (
    <View className="pt-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-2xl text-foreground tracking-tight">
          Plata
        </Text>
        <ThemeToggle />
      </View>
      <Text className="mt-0.5 text-muted text-sm">{formatMonth(month)}</Text>

      <SummaryCard
        allCategories={allCategories}
        changeTone={changeTone}
        highlights={highlights}
        onDuplicates={actions.duplicates}
        onRecurring={actions.recurring}
      />

      <Button className="mt-4" onPress={actions.add} size="lg">
        <Button.Label>Agregar movimiento</Button.Label>
      </Button>

      <ShortcutGrid actions={actions} />
      <MoreSection actions={actions} />

      <AccountFilter
        accounts={accounts}
        onSelect={onSelectAccount}
        selected={accountFilter}
      />
    </View>
  )
}

function EmptyState({
  filtered,
  onAction,
}: {
  filtered: boolean
  onAction: () => void
}) {
  return (
    <Card className="mt-4 items-center p-6">
      <Text className="text-center font-semibold text-foreground">
        {filtered
          ? "No hay movimientos con este filtro"
          : "Todavía no cargaste nada"}
      </Text>
      <Text className="mt-1 text-center text-muted text-sm">
        {filtered
          ? "Probá con otro medio de pago."
          : "Subí una captura o agregá un movimiento y listo."}
      </Text>
      <Button className="mt-4" onPress={onAction} size="sm">
        <Button.Label>
          {filtered ? "Ver todos" : "Agregar movimiento"}
        </Button.Label>
      </Button>
    </Card>
  )
}

interface TransactionSection {
  data: Transaction[]
  title: string
  type: "suggested" | "confirmed"
}

function TransactionCard({
  accountName,
  categoryName,
  item,
  onConfirm,
  onOpen,
  suggested,
}: {
  accountName: string | null
  categoryName: string
  item: Transaction
  onConfirm: (id: string) => void
  onOpen: (id: string) => void
  suggested: boolean
}) {
  const merchant = item.merchant ?? "Sin comercio"
  const meta = accountName ? `${accountName} · ${categoryName}` : categoryName

  return (
    <Card className="mt-2 p-4">
      <View className="flex-row items-start gap-3">
        <Pressable
          accessibilityLabel={`${merchant}, ${categoryName}, ${formatAmount(item.amount, item.currency)}`}
          accessibilityRole="button"
          className="flex-1"
          onPress={() => onOpen(item.id)}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <Text className="font-medium text-foreground" numberOfLines={1}>
            {merchant}
          </Text>
          <Text className="mt-1 text-muted text-xs">{meta}</Text>
        </Pressable>
        <Money
          cents={item.amount}
          className={
            item.kind === "income"
              ? "font-semibold text-accent"
              : "font-semibold text-foreground"
          }
          currency={item.currency}
        />
      </View>
      {suggested ? (
        <Button className="mt-3" onPress={() => onConfirm(item.id)} size="sm">
          <Button.Label>Confirmar</Button.Label>
        </Button>
      ) : null}
    </Card>
  )
}

function TransactionSectionHeader({
  section,
}: {
  section: TransactionSection
}) {
  return (
    <View className="mt-6 flex-row items-baseline justify-between">
      <Text className="font-semibold text-foreground">
        {section.title} · {section.data.length}
      </Text>
      {section.type === "suggested" ? (
        <Text className="text-muted text-xs">Confirmá en un toque</Text>
      ) : null}
    </View>
  )
}

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets()
  const [accountFilter, setAccountFilter] = useState(ALL_ACCOUNTS)

  const {
    data: suggestedData,
    isError: suggestedError,
    isLoading: suggestedLoading,
    refetch: refetchSuggested,
  } = useSuggestedTransactions(accountFilter)
  const {
    data: confirmedData,
    isError: confirmedError,
    isLoading: confirmedLoading,
    refetch: refetchConfirmed,
  } = useConfirmedTransactions(accountFilter)
  const updateState = useUpdateTransactionState()
  const { data: accountsData } = useAccounts()
  const { data: categoriesData } = useCategories()
  const [now, setNow] = useState(Date.now)

  // Refresh the range when the screen regains focus so a month boundary is not missed.
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now())
    }, [])
  )

  // ...and when the app is resumed without a navigation change.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        setNow(Date.now())
      }
    })

    return () => subscription.remove()
  }, [])

  const currentMonth = useMemo(() => monthRange(now), [now])
  const previousMonth = useMemo(
    () => monthRange(currentMonth.start - 1),
    [currentMonth.start]
  )
  const { data: allData } = useAllTransactions()
  const { data: monthData } = useTransactionsInRange(currentMonth)
  const { data: previousData } = useTransactionsInRange(previousMonth)

  const allCategories = useMemo(
    () => categoriesData ?? DEFAULT_CATEGORIES,
    [categoriesData]
  )
  const highlights = useMemo(() => {
    const confirmed = (items: Transaction[]) =>
      items.filter((item) => item.state === "confirmed")

    return computeHighlights({
      currency: DEFAULT_CURRENCY,
      current: confirmed(monthData ?? []),
      previous: confirmed(previousData ?? []),
      recent: confirmed(allData ?? []),
    })
  }, [allData, monthData, previousData])

  const accounts = useMemo(() => accountsData ?? [], [accountsData])
  const { data: onboardingValue, isLoading: onboardingLoading } = useAppMeta(
    ONBOARDING_COMPLETED_KEY
  )

  // If the filtered account is deleted elsewhere, fall back to showing everything.
  useEffect(() => {
    if (!accountsData) {
      return
    }
    if (accountFilter === ALL_ACCOUNTS || accountFilter === NO_ACCOUNT) {
      return
    }
    if (!accountsData.some((account) => account.id === accountFilter)) {
      setAccountFilter(ALL_ACCOUNTS)
    }
  }, [accountFilter, accountsData])

  const actions = useMemo<HomeActions>(
    () => ({
      account: () => router.push("/account"),
      accounts: () => router.push("/accounts"),
      add: () => router.push("/add-transaction"),
      budgets: () => router.push("/budgets"),
      categories: () => router.push("/categories"),
      catchUp: () => router.push("/catch-up"),
      duplicates: () => router.push("/duplicates"),
      exportData: () => router.push("/export"),
      insights: () => router.push("/insights"),
      notifications: () => router.push("/notifications"),
      preferences: () => router.push("/preferences"),
      recurring: () => router.push("/recurring"),
      search: () => router.push("/search"),
      week: () => router.push("/week"),
    }),
    []
  )

  const isLoading = suggestedLoading || confirmedLoading
  const isError = suggestedError || confirmedError

  const allSections: TransactionSection[] = [
    { data: suggestedData ?? [], title: "Para confirmar", type: "suggested" },
    { data: confirmedData ?? [], title: "Confirmados", type: "confirmed" },
  ]
  const sections = allSections.filter((section) => section.data.length > 0)

  const changeTone =
    highlights.monthExpenseChangeRatio !== null &&
    highlights.monthExpenseChangeRatio < 0
      ? "text-accent"
      : "text-muted"

  const handleRetry = useCallback(async () => {
    await Promise.all([refetchSuggested(), refetchConfirmed()])
  }, [refetchConfirmed, refetchSuggested])

  const handleConfirm = useCallback(
    (id: string) => {
      updateState.mutate({ id, state: "confirmed" })
    },
    [updateState]
  )

  const handleOpen = useCallback((id: string) => {
    router.push({ pathname: "/transaction/[id]", params: { id } })
  }, [])

  const renderItem = useCallback(
    ({ item, section }: { item: Transaction; section: TransactionSection }) => (
      <TransactionCard
        accountName={getAccountName(accounts, item.accountId)}
        categoryName={getCategoryById(item.categoryId, allCategories).name}
        item={item}
        onConfirm={handleConfirm}
        onOpen={handleOpen}
        suggested={section.type === "suggested"}
      />
    ),
    [accounts, allCategories, handleConfirm, handleOpen]
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: TransactionSection }) => (
      <TransactionSectionHeader section={section} />
    ),
    []
  )

  const keyExtractor = useCallback((item: Transaction) => item.id, [])

  if (onboardingLoading) {
    return (
      <Container className="px-5">
        <View className="items-center py-8">
          <Spinner />
        </View>
      </Container>
    )
  }

  if (shouldShowOnboarding(onboardingValue ?? null)) {
    return <Redirect href="/onboarding" />
  }

  return (
    <Container
      className="px-5"
      isScrollable={false}
      style={{ paddingTop: insets.top }}
    >
      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            No pudimos cargar tus movimientos
          </Text>
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Reintentar</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError ? null : (
        <SectionList
          contentContainerClassName="pb-8"
          keyExtractor={keyExtractor}
          ListEmptyComponent={
            <EmptyState
              filtered={accountFilter !== ALL_ACCOUNTS}
              onAction={
                accountFilter === ALL_ACCOUNTS
                  ? actions.add
                  : () => setAccountFilter(ALL_ACCOUNTS)
              }
            />
          }
          ListHeaderComponent={
            <HomeHeader
              accountFilter={accountFilter}
              accounts={accounts}
              actions={actions}
              allCategories={allCategories}
              changeTone={changeTone}
              highlights={highlights}
              month={now}
              onSelectAccount={setAccountFilter}
            />
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          sections={sections}
        />
      )}
    </Container>
  )
}
