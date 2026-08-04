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

  const cpfLimpo = cpf.replace(/\D/g, '')

  // Monta as duas versões para garantir que encontra
  const cpfComMascara = cpfLimpo.length === 11
    ? cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : ''

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
        // Busca com máscara OU sem máscara (cobre os dois cenários)
        const { data, error } = await supabase
          .from('clientes')
          .select('*')
          .or(`cpf.eq.${cpfLimpo},cpf.eq.${cpfComMascara}`)
          .limit(1)
          .maybeSingle()

        if (data && !error) {
          setCliente(data as ClienteEncontrado)
          setJaExiste(true)
        } else {
          setCliente(null)
          setJaExiste(false)
        }
      } catch (err) {
        console.error('Erro ao buscar cliente por CPF:', err)
        setCliente(null)
        setJaExiste(false)
      } finally {
        setBuscando(false)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [cpfLimpo])

  return { cliente, buscando, jaExiste }
}