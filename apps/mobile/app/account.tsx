import { useQueryClient } from "@tanstack/react-query"
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
import { authClient } from "@/lib/auth-client"
import { clearSyncKey } from "@/src/features/sync/key-store"
import { resetSync } from "@/src/features/sync/sync-client"
import { recoverSyncKey } from "@/src/features/sync/sync-recovery"
import {
  createSyncBackup,
  getSyncSetupState,
} from "@/src/features/sync/sync-setup"
import {
  usePreferences,
  useSetPreferences,
} from "@/src/features/transactions/hooks"
import { resetLocalData } from "@/src/features/transactions/local-reset"
import type { PrivacyMode } from "@/src/features/transactions/preferences"
import { syncApiClient } from "@/utils/trpc"

const PRIVACY_OPTIONS: readonly { label: string; mode: PrivacyMode }[] = [
  { label: "Local only", mode: "local_only" },
  { label: "Sync", mode: "sync" },
]

type SetupStep = "idle" | "recovery" | "reset"

export default function AccountScreen() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <Container className="px-5">
        <View className="items-center py-8">
          <Spinner />
        </View>
      </Container>
    )
  }

  return (
    <Container className="px-5">
      {session ? (
        <SignedIn email={session.user.email} userId={session.user.id} />
      ) : (
        <AuthForm />
      )}
    </Container>
  )
}

function SignedIn({ email, userId }: { email: string; userId: string }) {
  const queryClient = useQueryClient()
  const { data: preferences } = usePreferences()
  const setPreferences = useSetPreferences()
  const privacyMode = preferences?.privacyMode ?? "local_only"

  const [step, setStep] = useState<SetupStep>("idle")
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const handlePrivacy = useCallback(
    async (mode: PrivacyMode) => {
      setError(null)

      if (mode === "local_only") {
        setPreferences.mutate({ privacyMode: "local_only" })
        return
      }

      setBusy(true)
      try {
        const state = await getSyncSetupState(syncApiClient)

        if (state === "ready") {
          await setPreferences.mutateAsync({ privacyMode: "sync" })
        } else if (state === "fresh") {
          setSecret(await createSyncBackup(syncApiClient))
          await setPreferences.mutateAsync({ privacyMode: "sync" })
        } else {
          setStep(state === "needs-recovery" ? "recovery" : "reset")
        }
      } catch {
        setError("Could not set up sync. Check your connection.")
      } finally {
        setBusy(false)
      }
    },
    [setPreferences]
  )

  const handleRestore = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const restored = await recoverSyncKey(code.trim(), syncApiClient)

      if (!restored) {
        setError("That recovery code did not match.")
        return
      }

      setStep("idle")
      setCode("")
      await setPreferences.mutateAsync({ privacyMode: "sync" })
    } catch {
      setError("Could not restore the backup. Check your connection.")
    } finally {
      setBusy(false)
    }
  }, [code, setPreferences])

  const handleReset = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      await resetSync(userId, syncApiClient)
      setSecret(await createSyncBackup(syncApiClient))
      setStep("idle")
      await setPreferences.mutateAsync({ privacyMode: "sync" })
    } catch {
      setError("Could not reset the backup. Check your connection.")
    } finally {
      setBusy(false)
    }
  }, [setPreferences, userId])

  const handleSignOut = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      await authClient.signOut()
      await clearSyncKey()
      await resetLocalData()
      await queryClient.invalidateQueries()
    } catch {
      setError("Could not sign out. Please try again.")
    } finally {
      setBusy(false)
    }
  }, [queryClient])

  return (
    <>
      <Text className="pt-3 font-bold text-2xl text-foreground">Account</Text>

      <Card className="mt-4 p-4">
        <Text className="text-muted text-sm">Signed in as</Text>
        <Text className="mt-1 font-medium text-foreground">{email}</Text>
      </Card>

      <Text className="mt-6 mb-2 text-muted text-sm">Backup & sync</Text>
      <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
        {PRIVACY_OPTIONS.map((option) => (
          <Chip
            accessibilityRole="radio"
            accessibilityState={{ selected: privacyMode === option.mode }}
            disabled={busy}
            key={option.mode}
            onPress={() => handlePrivacy(option.mode)}
            variant={privacyMode === option.mode ? "primary" : "soft"}
          >
            <Chip.Label>{option.label}</Chip.Label>
          </Chip>
        ))}
      </View>
      <Text className="mt-2 text-muted text-xs">
        {privacyMode === "sync"
          ? "Your transactions are encrypted on device and backed up."
          : "Your data stays on this device."}
      </Text>

      {secret ? (
        <Card className="mt-4 p-4">
          <Text className="font-medium text-foreground">
            Save your recovery code
          </Text>
          <Text className="mt-1 text-muted text-xs">
            You will need it to sync another device. Keep it somewhere safe.
          </Text>
          <Text className="mt-2 font-mono text-foreground" selectable>
            {secret}
          </Text>
        </Card>
      ) : null}

      {step === "recovery" ? (
        <View className="mt-4">
          <TextField>
            <Label>Recovery code</Label>
            <Input autoCapitalize="none" onChangeText={setCode} value={code} />
          </TextField>
          <View className="mt-3 gap-2">
            <Button
              isDisabled={busy || code.trim().length === 0}
              onPress={handleRestore}
            >
              <Button.Label>Restore backup</Button.Label>
            </Button>
            <Button
              isDisabled={busy}
              onPress={() => setStep("idle")}
              variant="outline"
            >
              <Button.Label>Cancel</Button.Label>
            </Button>
          </View>
        </View>
      ) : null}

      {step === "reset" ? (
        <Card className="mt-4 p-4">
          <Text className="font-medium text-foreground">
            This account already has a backup
          </Text>
          <Text className="mt-1 text-muted text-xs">
            This device does not have the key for it. Restore it with your
            recovery code, or reset the cloud backup to start fresh (this
            deletes the backed-up data).
          </Text>
          <View className="mt-3 gap-2">
            <Button isDisabled={busy} onPress={handleReset} variant="outline">
              <Button.Label>Reset and start fresh</Button.Label>
            </Button>
            <Button
              isDisabled={busy}
              onPress={() => setStep("recovery")}
              variant="outline"
            >
              <Button.Label>Enter a recovery code</Button.Label>
            </Button>
            <Button
              isDisabled={busy}
              onPress={() => setStep("idle")}
              variant="outline"
            >
              <Button.Label>Cancel</Button.Label>
            </Button>
          </View>
        </Card>
      ) : null}

      {error ? (
        <Text className="mt-3 text-destructive text-sm">{error}</Text>
      ) : null}

      <View className="mt-6 pb-4">
        <Button isDisabled={busy} onPress={handleSignOut} variant="outline">
          <Button.Label>Sign out</Button.Label>
        </Button>
        <Text className="mt-2 text-muted text-xs">
          Signing out removes your data from this device.
        </Text>
      </View>
    </>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({
              email: email.trim(),
              password,
            })
          : await authClient.signUp.email({
              email: email.trim(),
              name: name.trim(),
              password,
            })

      if (result.error) {
        setError(result.error.message ?? "Could not authenticate")
      }
    } catch {
      setError("Could not authenticate. Check your connection.")
    } finally {
      setIsSubmitting(false)
    }
  }, [email, mode, name, password])

  const toggleMode = useCallback(() => {
    setError(null)
    setMode((current) => (current === "signin" ? "signup" : "signin"))
  }, [])

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === "signin" || name.trim().length > 0) &&
    !isSubmitting

  return (
    <>
      <Text className="pt-3 font-bold text-2xl text-foreground">Account</Text>
      <Text className="mt-1 pb-2 text-muted text-sm">
        Sign in to back up and sync your transactions.
      </Text>

      <TextField className="mt-2">
        <Label>Email</Label>
        <Input
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />
      </TextField>

      {mode === "signup" ? (
        <TextField className="mt-4">
          <Label>Name</Label>
          <Input onChangeText={setName} value={name} />
        </TextField>
      ) : null}

      <TextField className="mt-4">
        <Label>Password</Label>
        <Input onChangeText={setPassword} secureTextEntry value={password} />
      </TextField>

      {error ? (
        <Text className="mt-3 text-destructive text-sm">{error}</Text>
      ) : null}

      <View className="mt-6 gap-3 pb-4">
        <Button isDisabled={!canSubmit} onPress={handleSubmit}>
          <Button.Label>
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button.Label>
        </Button>
        <Button
          isDisabled={isSubmitting}
          onPress={toggleMode}
          variant="outline"
        >
          <Button.Label>
            {mode === "signin"
              ? "Create an account"
              : "I already have an account"}
          </Button.Label>
        </Button>
      </View>
    </>
  )
}
