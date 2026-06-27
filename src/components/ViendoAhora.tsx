'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ViendoAhora() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const channel = supabase.channel('presencia-publica', {
      config: { presence: { key: crypto.randomUUID() } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setCount(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ t: Date.now() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (count === null || count < 2) return null

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>{count} viendo</span>
    </div>
  )
}
