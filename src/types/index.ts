export type Category = {
  id: string
  name: string
  color?: string
}

export type Expense = {
  id: string
  title: string
  amount: number
  category_id: string
  created_at: string
}

// FORM TYPES (for modal only)
export type ExpenseForm = {
  title: string
  amount: number
  category_id: string
}

export type CategoryForm = {
  name: string
  color?: string
}

// Optional user type
export type User = {
  id: string
  email: string
} | null