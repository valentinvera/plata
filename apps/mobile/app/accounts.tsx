import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  Spinner,
  TextField,
} from "heroui-native"
import { useCallback, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  ACCOUNT_KIND_LABELS,
  ACCOUNT_KINDS,
  type Account,
  type AccountKind,
  validateAccountName,
} from "@/src/features/transactions/accounts"
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/src/features/transactions/hooks"

function KindChips({
  onChange,
  value,
}: {
  onChange: (kind: AccountKind) => void
  value: AccountKind
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
      {ACCOUNT_KINDS.map((kind) => (
        <Chip
          accessibilityRole="radio"
          accessibilityState={{ selected: value === kind }}
          key={kind}
          onPress={() => onChange(kind)}
          variant={value === kind ? "primary" : "soft"}
        >
          <Chip.Label>{ACCOUNT_KIND_LABELS[kind]}</Chip.Label>
        </Chip>
      ))}
    </View>
  )
}

function CreateAccountForm({ accounts }: { accounts: readonly Account[] }) {
  const create = useCreateAccount()
  const [name, setName] = useState("")
  const [kind, setKind] = useState<AccountKind>("cash")
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    const validationError = validateAccountName(name, accounts)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      await create.mutateAsync({ kind, name: name.trim() })
      setName("")
      setKind("cash")
    } catch {
      setError("Could not create the account. Please try again.")
    }
  }, [accounts, create, kind, name])

  return (
    <Card className="mt-4 p-4">
      <Text className="font-semibold text-foreground">New account</Text>
      <TextField className="mt-2" isInvalid={error !== null}>
        <Label>Name</Label>
        <Input
          isInvalid={error !== null}
          onChangeText={setName}
          placeholder="Efectivo"
          value={name}
        />
      </TextField>
      <Text className="mt-3 mb-2 text-muted text-sm">Type</Text>
      <KindChips onChange={setKind} value={kind} />
      {error ? (
        <Text className="mt-2 text-destructive text-sm">{error}</Text>
      ) : null}
      <Button
        className="mt-4"
        isDisabled={create.isPending}
        onPress={handleCreate}
      >
        <Button.Label>Add account</Button.Label>
      </Button>
    </Card>
  )
}

function AccountRow({
  account,
  accounts,
}: {
  account: Account
  accounts: readonly Account[]
}) {
  const update = useUpdateAccount()
  const remove = useDeleteAccount()
  const [name, setName] = useState(account.name)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isBusy = update.isPending || remove.isPending

  const commit = useCallback(async () => {
    const trimmed = name.trim()

    if (trimmed === account.name) {
      return
    }

    const validationError = validateAccountName(trimmed, accounts, account.id)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      await update.mutateAsync({ id: account.id, update: { name: trimmed } })
    } catch {
      setError("Could not rename the account. Please try again.")
      setName(account.name)
    }
  }, [account.id, account.name, accounts, name, update])

  const handleDelete = useCallback(async () => {
    setError(null)
    try {
      await remove.mutateAsync(account.id)
    } catch {
      setError("Could not delete the account. Please try again.")
    }
  }, [account.id, remove])

  return (
    <Card className="mt-3 p-4">
      <TextField isInvalid={error !== null}>
        <Label>Name</Label>
        <Input
          isInvalid={error !== null}
          onChangeText={setName}
          onEndEditing={commit}
          value={name}
        />
      </TextField>
      <Text className="mt-2 text-muted text-xs">
        {ACCOUNT_KIND_LABELS[account.kind]}
      </Text>
      {error ? (
        <Text className="mt-1 text-destructive text-xs">{error}</Text>
      ) : null}
      <View className="mt-3 gap-3">
        {confirmingDelete ? (
          <>
            <Text className="text-destructive text-sm">
              Delete this account? Its transactions will stay without an
              account.
            </Text>
            <Button
              isDisabled={isBusy}
              onPress={handleDelete}
              variant="outline"
            >
              <Button.Label>Yes, delete</Button.Label>
            </Button>
            <Button
              isDisabled={isBusy}
              onPress={() => setConfirmingDelete(false)}
              variant="outline"
            >
              <Button.Label>Cancel</Button.Label>
            </Button>
          </>
        ) : (
          <Button
            isDisabled={isBusy}
            onPress={() => setConfirmingDelete(true)}
            variant="outline"
          >
            <Button.Label>Delete</Button.Label>
          </Button>
        )}
      </View>
    </Card>
  )
}

export default function AccountsScreen() {
  const { data, isError, isLoading, refetch } = useAccounts()
  const accounts = data ?? []

  const handleRetry = useCallback(async () => {
    await refetch()
  }, [refetch])

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">Accounts</Text>
      <Text className="mt-1 text-muted text-sm">
        Manage the accounts you track spending in.
      </Text>

      {isLoading ? (
        <View className="items-center py-8">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not load your accounts
          </Text>
          <Button className="mt-3" onPress={handleRetry} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {isLoading || isError ? null : (
        <>
          <CreateAccountForm accounts={accounts} />
          {accounts.map((account) => (
            <AccountRow
              account={account}
              accounts={accounts}
              key={account.id}
            />
          ))}
        </>
      )}
    </Container>
  )
}
