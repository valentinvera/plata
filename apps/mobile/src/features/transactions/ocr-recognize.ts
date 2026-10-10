import TextRecognition from "@react-native-ml-kit/text-recognition"

import { selectTransactionText } from "./ocr"

export async function recognizeTransactionText(
  imageUri: string
): Promise<string | null> {
  const result = await TextRecognition.recognize(imageUri)
  return selectTransactionText(result.text)
}
