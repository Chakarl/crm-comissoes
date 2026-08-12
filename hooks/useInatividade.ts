'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const TEMPO_INATIVIDADE = 30 * 60 * 1000 // 30 minutos em ms

const EVENTOS_ATIVIDADE: (keyof WindowEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

export function useInatividade() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // mesmo se falhar, redireciona
    }
    router.replace('/login')
  }, [router])

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, TEMPO_INATIVIDADE)
  }, [logout])

  useEffect(() => {
    // Inicia o timer ao montar
    resetTimer()

    // Cada interação do usuário reinicia a contagem
    EVENTOS_ATIVIDADE.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    )

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTOS_ATIVIDADE.forEach((evt) =>
        window.removeEventListener(evt, resetTimer)
      )
    }
  }, [resetTimer])
}