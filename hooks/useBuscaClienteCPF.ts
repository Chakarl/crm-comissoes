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

export function useBuscaClienteCPF(cpfDigitado: string) {
  const [cliente, setCliente] = useState<ClienteEncontrado | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [jaExiste, setJaExiste] = useState(false)
  const supabase = createClient()

  // Extrai só números
  const nums = cpfDigitado.replace(/\D/g, '')

  // Monta com máscara no formato do banco: 123.456.789-00
  const cpfMascara =
    nums.length === 11
      ? `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`
      : ''

  useEffect(() => {
    if (nums.length !== 11) {
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
          .eq('cpf', cpfMascara)
          .limit(1)
          .maybeSingle()

        console.log('Buscando CPF:', cpfMascara, '→', data, error)

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
    }, 400)

    return () => clearTimeout(timeout)
  }, [cpfMascara])

  return { cliente, buscando, jaExiste }
}