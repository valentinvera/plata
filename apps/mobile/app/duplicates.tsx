import { Button, Card, Spinner } from "heroui-native"
import { useCallback, useMemo, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import { findDuplicateGroups } from "@/src/features/transactions/duplicates"
import { formatAmount, formatDay } from "@/src/features/transactions/format"
import {
  useAllTransactions,
  useDeleteTransaction,
} from "@/src/features/transactions/hooks"

export default function DuplicatesScreen() {
  const { data, isError, isLoading, refetch } = useAllTransactions()
  const removeTransaction = useDeleteTransaction()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo(() => findDuplicateGroups(data ?? []), [data])

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmingId(null)
      setError(null)

      try {
        await removeTransaction.mutateAsync(id)
      } catch {
        setError("Could not remove the transaction. Please try again.")
      }
    },
    [removeTransaction]
  )

  const isBusy = removeTransaction.isPending

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">
        Duplicates
      </Text>
      <Text className="mt-1 text-muted text-sm">
        Transactions that look like the same event. Keep one and remove the
        rest.
      </Text>

      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not load your transactions
          </Text>
          <Button className="mt-3" onPress={() => refetch()} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {error ? (
        <Text className="mt-3 text-destructive text-sm">{error}</Text>
      ) : null}

      {!(isLoading || isError) && groups.length === 0 ? (
        <Text className="mt-4 text-muted text-sm">No possible duplicates.</Text>
      ) : null}

      {groups.map((group) => (
        <Card className="mt-3 p-4" key={group.transactions[0]?.id ?? group.key}>
          {group.transactions.map((transaction) => (
            <View className="mt-2" key={transaction.id}>
              <View className="flex-row items-center justify-between">
                <Text
                  className="flex-1 font-medium text-foreground"
                  numberOfLines={1}
                >
                  {transaction.merchant ?? "No merchant"}
                </Text>
                <Text className="ml-3 text-foreground">
                  {formatAmount(transaction.amount, transaction.currency)}
                </Text>
              </View>
              <Text className="mt-1 text-muted text-xs">
                {formatDay(transaction.occurredAt)} ·{" "}
                {transaction.state === "suggested" ? "To confirm" : "Confirmed"}
              </Text>

              {confirmingId === transaction.id ? (
                <View className="mt-2 gap-2">
                  <Text className="text-destructive text-xs">
                    Remove this transaction?
                  </Text>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => handleDelete(transaction.id)}
                    size="sm"
                    variant="outline"
                  >
                    <Button.Label>Yes, remove</Button.Label>
                  </Button>
                  <Button
                    isDisabled={isBusy}
                    onPress={() => setConfirmingId(null)}
                    size="sm"
                    variant="outline"
                  >
                    <Button.Label>Cancel</Button.Label>
                  </Button>
                </View>
              ) : (
                <Button
                  className="mt-2"
                  isDisabled={isBusy}
                  onPress={() => setConfirmingId(transaction.id)}
                  size="sm"
                  variant="outline"
                >
                  <Button.Label>Remove</Button.Label>
                </Button>
              )}
            </View>
          ))}
        </Card>
      ))}
    </Container>
  )
}
