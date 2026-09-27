import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { Profile } from './types'

interface ProfileState {
  profile: Profile | null
  update: (patch: Partial<Omit<Profile, 'id'>>) => Promise<string | null>
}

const DEFAULTS: Omit<Profile, 'id'> = { display_name: null, water_goal: 8, sleep_goal: 8, weight_unit: 'kg' }

const ProfileContext = createContext<ProfileState>({ profile: null, update: async () => null })

export function ProfileProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, water_goal, sleep_goal, weight_unit')
      .maybeSingle()
      .then(({ data }) => setProfile(data ? { ...data, sleep_goal: Number(data.sleep_goal) } : { id: userId, ...DEFAULTS }))
  }, [userId])

  const update = useCallback(
    async (patch: Partial<Omit<Profile, 'id'>>) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
      if (!error) setProfile((p) => (p ? { ...p, ...patch } : p))
      return error?.message ?? null
    },
    [userId],
  )

  return <ProfileContext.Provider value={{ profile, update }}>{children}</ProfileContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useProfile = () => useContext(ProfileContext)
