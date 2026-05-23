// store/authStore.ts
'use client'
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import { createClient } from '@/utils/supabase/client'

interface AuthState {
  user:    User | null
  profile: Profile | null
  loading: boolean
  setUser:    (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (v: boolean) => void
  fetchProfile: () => Promise<void>
  signIn:  (email: string, password: string) => Promise<void>
  signUp:  (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  setUser:    (user)    => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  async fetchProfile() {
    const supabase = createClient()
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    set({ profile: data })
  },

  async signIn(email, password) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  async signUp(email, password, fullName) {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    if (error) throw error
  },

  async signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  async updateProfile(updates) {
    const supabase = createClient()
    const { user } = get()
    if (!user) return
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (error) throw error
    set(state => ({ profile: { ...state.profile!, ...updates } }))
  },

  async updatePassword(password) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }
}))