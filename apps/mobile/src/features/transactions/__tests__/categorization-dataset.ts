export interface CategorizationExample {
  categoryId: string
  text: string
}

export const CATEGORIZATION_DATASET: readonly CategorizationExample[] = [
  {
    categoryId: "groceries",
    text: "Compraste $12.345,67 en CARREFOUR el 05/09",
  },
  { categoryId: "groceries", text: "Pagaste $8.900 en COTO" },
  { categoryId: "groceries", text: "Compraste $3.200 en CHANGOMAS" },
  { categoryId: "food", text: "Pagaste $4.500 en PEDIDOSYA" },
  { categoryId: "food", text: "Compraste $2.800 en MCDONALD'S" },
  { categoryId: "food", text: "Pagaste $1.900 en un CAFE" },
  { categoryId: "transport", text: "Compraste $2.000 en UBER" },
  { categoryId: "transport", text: "Carga SUBE $1.500" },
  { categoryId: "transport", text: "Compraste $9.000 en YPF" },
  { categoryId: "services", text: "Debito automatico EDENOR $8.900" },
  { categoryId: "services", text: "Suscripcion NETFLIX $6.500" },
  { categoryId: "health", text: "Compraste $3.200 en FARMACITY" },
  { categoryId: "health", text: "Turno medico OSDE $12.000" },
  { categoryId: "shopping", text: "Compraste $25.000 en MERCADOLIBRE" },
  { categoryId: "shopping", text: "Compraste $18.000 en ZARA" },
  { categoryId: "entertainment", text: "Compraste $6.000 en CINEMARK" },
  { categoryId: "entertainment", text: "Compra STEAM $9.000" },
  { categoryId: "education", text: "Pagaste $9.900 en UDEMY" },
  { categoryId: "education", text: "Compra LIBRO $5.000" },
  { categoryId: "home", text: "Compraste $15.000 en SODIMAC" },
  { categoryId: "home", text: "Compraste $4.000 en FERRETERIA" },
  { categoryId: "transfers", text: "Transferiste $10.000 a Juan" },
  { categoryId: "fees", text: "Comision mantenimiento $1.500" },
  { categoryId: "fees", text: "Pago IMPUESTO IIBB $7.000" },
  { categoryId: "income", text: "Cobraste $50.000 de sueldo" },
  { categoryId: "income", text: "Acreditaron HABERES $120.000" },
  { categoryId: "income", text: "Cobraste honorarios $30.000" },
]
