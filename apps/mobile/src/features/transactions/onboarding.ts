export const ONBOARDING_COMPLETED_KEY = "onboarding_completed"

export interface OnboardingBenefit {
  description: string
  title: string
}

export const ONBOARDING_BENEFITS: readonly OnboardingBenefit[] = [
  {
    description:
      "Las notificaciones del banco y las capturas se vuelven transacciones solas.",
    title: "Sin cargar todo a mano",
  },
  {
    description: "Confirmá lo que quedó pendiente en un tap, sin culpa.",
    title: "Volvés al día en segundos",
  },
  {
    description: "Local-first: tus datos no salen de tu teléfono.",
    title: "Tu plata, privada",
  },
]

export function shouldShowOnboarding(value: string | null): boolean {
  return value !== "1"
}
