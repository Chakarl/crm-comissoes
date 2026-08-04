// hooks/useBuscaClienteCPF.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface ClienteEncontrado {
  id: string
  nome: string
  cpf: string
  telefone?: string
  email?: string
  data_nascimento?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
}

export function useBuscaClienteCPF(cpf: string) {
  const [cliente, setCliente] = useState<ClienteEncontrado | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [jaExiste, setJaExiste] = useState(false)
  const supabase = createClient()

  // Limpa tudo que não é número
  const cpfLimpo = cpf.replace(/\D/g, '')

  useEffect(() => {
    // Só busca quando CPF tiver 11 dígitos
    if (cpfLimpo.length !== 11) {
      setCliente(null)
      setJaExiste(false)
      return
    }

    const timeout = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .eq('cpf', cpfLimpo)
          .maybeSingle()

        if (data && !error) {
          setCliente(data as ClienteEncontrado)
          setJaExiste(true)
        } else {
          setCliente(null)
          setJaExiste(false)
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err)
        setCliente(null)
        setJaExiste(false)
      } finally {
        setBuscando(false)
      }
    }, 400) // debounce de 400ms

    return () => clearTimeout(timeout)
  }, [cpfLimpo])

  return { cliente, buscando, jaExiste }
}