// store/expensesStore.ts
'use client'
import { create } from 'zustand'
import type { Expense, Category, ExpenseForm, CategoryForm } from '@/types'
import { createClient } from '@/utils/supabase/client'

interface ExpensesState {
  expenses:   Expense[]
  categories: Category[]
  loading:    boolean
  fetchExpenses:   (opts?: { month?: number; year?: number; categoryId?: string }) => Promise<void>
  fetchCategories: () => Promise<void>
  addExpense:    (payload: ExpenseForm) => Promise<Expense>
  updateExpense: (id: string, payload: Partial<ExpenseForm>) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  addCategory:    (payload: CategoryForm) => Promise<Category>
  updateCategory: (id: string, payload: Partial<CategoryForm>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  expenses:   [],
  categories: [],
  loading:    false,

  async fetchCategories() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (error) throw error
    set({ categories: data ?? [] })
  },

  async fetchExpenses({ month, year, categoryId } = {}) {
    set({ loading: true })
    const supabase = createClient()
    let query = supabase
      .from('expenses')
      .select('*, categories(id, name, color, icon)')
      .order('date', { ascending: false })

    if (month !== undefined && year !== undefined) {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10)
      query = query.gte('date', from).lte('date', to)
    }
    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query
    set({ loading: false })
    if (error) throw error
    set({ expenses: data ?? [] })
  },

  async addExpense(payload) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select('*, categories(id, name, color, icon)')
      .single()
    if (error) throw error
    set(state => ({ expenses: [data, ...state.expenses] }))
    return data
  },

  async updateExpense(id, payload) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .update(payload)
      .eq('id', id)
      .select('*, categories(id, name, color, icon)')
      .single()
    if (error) throw error
    set(state => ({
      expenses: state.expenses.map(e => e.id === id ? data : e)
    }))
    return data
  },

  async deleteExpense(id) {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }))
  },

  async addCategory(payload) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    set(state => ({ categories: [...state.categories, data] }))
    return data
  },

  async updateCategory(id, payload) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set(state => ({
      categories: state.categories.map(c => c.id === id ? data : c)
    }))
    return data
  },

  async deleteCategory(id) {
    const supabase = createClient()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    set(state => ({ categories: state.categories.filter(c => c.id !== id) }))
  }
}))