import type { Category } from "./types"

export const UNCATEGORIZED_ID = "uncategorized"

export const UNCATEGORIZED_CATEGORY: Category = {
  id: UNCATEGORIZED_ID,
  keywords: [],
  name: "Sin categoría",
}

export const DEFAULT_CATEGORIES: readonly Category[] = [
  {
    id: "groceries",
    keywords: [
      "almacen",
      "carrefour",
      "coto",
      "dia",
      "disco",
      "jumbo",
      "supermercado",
      "vea",
      "changomas",
    ],
    name: "Supermercado",
  },
  {
    id: "food",
    keywords: [
      "bar",
      "burger",
      "cafe",
      "delivery",
      "mcdonald",
      "mostaza",
      "pedidosya",
      "pizza",
      "rappi",
      "restaurant",
      "sushi",
    ],
    name: "Comida",
  },
  {
    id: "transport",
    keywords: [
      "cabify",
      "colectivo",
      "didi",
      "estacionamiento",
      "nafta",
      "peaje",
      "shell",
      "sube",
      "taxi",
      "uber",
      "ypf",
    ],
    name: "Transporte",
  },
  {
    id: "services",
    keywords: [
      "aysa",
      "claro",
      "edenor",
      "edesur",
      "internet",
      "metrogas",
      "movistar",
      "netflix",
      "personal",
      "telecom",
    ],
    name: "Servicios",
  },
  {
    id: "health",
    keywords: [
      "clinica",
      "farmacia",
      "farmacity",
      "hospital",
      "medico",
      "obra social",
      "osde",
      "swiss medical",
    ],
    name: "Salud",
  },
  {
    id: "shopping",
    keywords: ["adidas", "falabella", "mercadolibre", "nike", "tienda", "zara"],
    name: "Compras",
  },
  {
    id: "entertainment",
    keywords: ["cine", "cinemark", "juego", "playstation", "steam", "teatro"],
    name: "Entretenimiento",
  },
  {
    id: "education",
    keywords: ["colegio", "curso", "libro", "platzi", "udemy", "universidad"],
    name: "Educación",
  },
  {
    id: "home",
    keywords: ["easy", "ferreteria", "mueble", "pintureria", "sodimac"],
    name: "Hogar",
  },
  {
    id: "transfers",
    keywords: ["enviaste", "transferencia", "transferiste"],
    name: "Transferencias",
  },
  {
    id: "fees",
    keywords: ["afip", "comision", "iibb", "impuesto", "iva", "mantenimiento"],
    name: "Impuestos y comisiones",
  },
  {
    id: "income",
    keywords: [
      "acreditaron",
      "cobraste",
      "freelance",
      "haberes",
      "honorarios",
      "sueldo",
    ],
    name: "Ingresos",
  },
]

export function getCategoryById(
  id: string,
  categories: readonly Category[] = DEFAULT_CATEGORIES
): Category {
  return (
    categories.find((category) => category.id === id) ?? UNCATEGORIZED_CATEGORY
  )
}
