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
import {
  usePreferences,
  useSetPreferences,
} from "@/src/features/transactions/hooks"
import type { PrivacyMode } from "@/src/features/transactions/preferences"

const PRIVACY_OPTIONS: readonly {
  label: string
  mode: PrivacyMode
}[] = [
  { label: "Local only", mode: "local_only" },
  { label: "Sync", mode: "sync" },
]

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
      {session ? <SignedIn email={session.user.email} /> : <AuthForm />}
    </Container>
  )
}

function SignedIn({ email }: { email: string }) {
  const { data: preferences } = usePreferences()
  const setPreferences = useSetPreferences()
  const privacyMode = preferences?.privacyMode ?? "local_only"

  const handleSignOut = useCallback(() => {
    authClient.signOut().catch(() => undefined)
  }, [])

  const handlePrivacy = useCallback(
    (mode: PrivacyMode) => setPreferences.mutate({ privacyMode: mode }),
    [setPreferences]
  )

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

      <View className="mt-6 pb-4">
        <Button onPress={handleSignOut} variant="outline">
          <Button.Label>Sign out</Button.Label>
        </Button>
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
