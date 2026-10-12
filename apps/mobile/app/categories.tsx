import { Button, Card, Input, Label, Spinner, TextField } from "heroui-native"
import { useCallback, useState } from "react"
import { Text, View } from "react-native"

import { Container } from "@/components/container"
import {
  parseCategoryKeywords,
  validateCategoryName,
} from "@/src/features/transactions/categories"
import {
  useCategories,
  useCreateCategory,
  useCustomCategories,
  useDeleteCategory,
  useUpdateCategory,
} from "@/src/features/transactions/hooks"
import type { Category } from "@/src/features/transactions/types"

export default function CategoriesScreen() {
  const {
    data: customData,
    isError,
    isLoading,
    refetch,
  } = useCustomCategories()
  const { data: allData } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const custom = customData ?? []
  const all = allData ?? []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [keywords, setKeywords] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  )

  const resetForm = useCallback(() => {
    setEditingId(null)
    setName("")
    setKeywords("")
    setError(null)
  }, [])

  const startEdit = useCallback((category: Category) => {
    setEditingId(category.id)
    setName(category.name)
    setKeywords(category.keywords.join(", "))
    setError(null)
  }, [])

  const handleSave = useCallback(async () => {
    const validationError = validateCategoryName(
      name,
      all,
      editingId ?? undefined
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const input = {
      keywords: parseCategoryKeywords(keywords),
      name: name.trim(),
    }

    try {
      if (editingId) {
        await updateCategory.mutateAsync({ id: editingId, update: input })
      } else {
        await createCategory.mutateAsync(input)
      }
      resetForm()
    } catch {
      setError("Could not save the category. Please try again.")
    }
  }, [
    all,
    createCategory,
    editingId,
    keywords,
    name,
    resetForm,
    updateCategory,
  ])

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmingDeleteId(null)
      try {
        await deleteCategory.mutateAsync(id)
      } catch {
        setError("Could not delete the category. Please try again.")
      }
    },
    [deleteCategory]
  )

  const isBusy =
    createCategory.isPending ||
    updateCategory.isPending ||
    deleteCategory.isPending
  const canSave = name.trim().length > 0 && !isBusy

  return (
    <Container className="px-5">
      <Text className="pt-3 font-bold text-2xl text-foreground">
        Categories
      </Text>
      <Text className="mt-1 text-muted text-sm">
        Add your own categories and keywords. They are matched when importing
        transactions.
      </Text>

      <Card className="mt-4 p-4">
        <Text className="font-semibold text-foreground">
          {editingId ? "Edit category" : "New category"}
        </Text>
        <TextField className="mt-2">
          <Label>Name</Label>
          <Input onChangeText={setName} placeholder="Pets" value={name} />
        </TextField>
        <TextField className="mt-3">
          <Label>Keywords</Label>
          <Input
            autoCapitalize="none"
            onChangeText={setKeywords}
            placeholder="veterinaria, pet shop"
            value={keywords}
          />
        </TextField>
        <Text className="mt-1 text-muted text-xs">
          Separate keywords with commas. They are normalized (lowercase, no
          accents).
        </Text>

        {error ? (
          <Text className="mt-2 text-destructive text-sm">{error}</Text>
        ) : null}

        <View className="mt-3 flex-row gap-3">
          <Button isDisabled={!canSave} onPress={handleSave}>
            <Button.Label>
              {editingId ? "Save changes" : "Add category"}
            </Button.Label>
          </Button>
          {editingId ? (
            <Button isDisabled={isBusy} onPress={resetForm} variant="outline">
              <Button.Label>Cancel</Button.Label>
            </Button>
          ) : null}
        </View>
      </Card>

      {isLoading ? (
        <View className="items-center py-6">
          <Spinner />
        </View>
      ) : null}

      {isError ? (
        <Card className="mt-4 items-center p-6">
          <Text className="text-center font-medium text-foreground">
            Could not load your categories
          </Text>
          <Button className="mt-3" onPress={() => refetch()} size="sm">
            <Button.Label>Retry</Button.Label>
          </Button>
        </Card>
      ) : null}

      {!(isLoading || isError) && custom.length === 0 ? (
        <Text className="mt-4 text-muted text-sm">
          You have no custom categories yet.
        </Text>
      ) : null}

      {custom.map((category) => (
        <Card className="mt-3 p-4" key={category.id}>
          <Text className="font-medium text-foreground">{category.name}</Text>
          <Text className="mt-1 text-muted text-xs">
            {category.keywords.length > 0
              ? category.keywords.join(", ")
              : "No keywords"}
          </Text>

          {confirmingDeleteId === category.id ? (
            <View className="mt-3 gap-2">
              <Text className="text-destructive text-sm">
                Delete this category? Transactions keep their category label.
              </Text>
              <Button
                isDisabled={isBusy}
                onPress={() => handleDelete(category.id)}
                variant="outline"
              >
                <Button.Label>Yes, delete</Button.Label>
              </Button>
              <Button
                isDisabled={isBusy}
                onPress={() => setConfirmingDeleteId(null)}
                variant="outline"
              >
                <Button.Label>Cancel</Button.Label>
              </Button>
            </View>
          ) : (
            <View className="mt-3 flex-row gap-3">
              <Button
                isDisabled={isBusy}
                onPress={() => startEdit(category)}
                size="sm"
                variant="outline"
              >
                <Button.Label>Edit</Button.Label>
              </Button>
              <Button
                isDisabled={isBusy}
                onPress={() => setConfirmingDeleteId(category.id)}
                size="sm"
                variant="outline"
              >
                <Button.Label>Delete</Button.Label>
              </Button>
            </View>
          )}
        </Card>
      ))}
    </Container>
  )
}
