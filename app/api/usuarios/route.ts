export async function POST(request: NextRequest) {
  let authUserId: string | null = null

  try {
    const body = await request.json()
    const { email, senha, nome, telefone, endereco, token } = body

    if (!email || !senha || !nome || !telefone) {
      return NextResponse.json(
        { erro: 'Campos obrigatórios: email, senha, nome, telefone' },
        { status: 400 }
      )
    }

    const telefoneFormatado = formatarTelefone(telefone)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { erro: 'Sessão inválida ou expirada' },
        { status: 401 }
      )
    }

    // ✅ Verifica permissão: master OU supervisor
    const { data: usuarioLogado, error: usuarioError } = await supabaseAdmin
      .from('usuarios')
      .select('is_master, role')
      .eq('id', user.id)
      .single()

    if (usuarioError) {
      console.error('Erro ao verificar permissões:', usuarioError)
      return NextResponse.json(
        { erro: 'Erro ao verificar permissões' },
        { status: 500 }
      )
    }

    const podeCadastrar = usuarioLogado?.is_master || usuarioLogado?.role === 'supervisor'

    if (!podeCadastrar) {
      return NextResponse.json(
        { erro: 'Sem permissão para cadastrar usuários' },
        { status: 403 }
      )
    }

    console.log('📝 Iniciando cadastro:', email)

    // 1. Verifica se email já existe na tabela
    const { data: emailExiste, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      console.error('Erro ao verificar email:', checkError)
      return NextResponse.json(
        { erro: 'Erro ao verificar email' },
        { status: 500 }
      )
    }

    if (emailExiste) {
      console.log('❌ Email já cadastrado:', email)
      return NextResponse.json(
        { erro: 'Este e-mail já está cadastrado' },
        { status: 400 }
      )
    }

    // 2. Gera hash da senha
    const senhaHash = await bcrypt.hash(senha, 10)
    console.log('🔒 Senha hashada gerada')

    // 3. Cria usuário no Auth
    let authData
    try {
      authData = await criarUsuarioViaAPI(
        email,
        senha,
        nome,
        telefoneFormatado,
        endereco,
        senhaHash,
        user.id
      )
    } catch (error: any) {
      console.error('❌ Erro ao criar no Auth:', error)

      if (
        error.message?.toLowerCase().includes('already') ||
        error.message?.toLowerCase().includes('exists')
      ) {
        return NextResponse.json(
          { erro: 'Este e-mail já está cadastrado no sistema de autenticação' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { erro: `Erro ao criar usuário: ${error.message}` },
        { status: 500 }
      )
    }

    if (!authData?.id) {
      return NextResponse.json(
        { erro: 'Falha ao criar usuário no Auth' },
        { status: 500 }
      )
    }

    authUserId = authData.id

    // 4. Aguarda o trigger popular a tabela e verifica
    await new Promise(resolve => setTimeout(resolve, 1500))

    const { data: novoUsuario, error: verificaError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', authUserId)
      .single()

    if (verificaError || !novoUsuario) {
      console.error('❌ Trigger não criou o registro:', verificaError)
      await deletarUsuarioAuth(authUserId)
      return NextResponse.json(
        { erro: 'Erro ao salvar dados do usuário' },
        { status: 500 }
      )
    }

    // 5. ✅ SEMPRE atualiza — supervisor só cria promotor, master escolhe
    const roleFinal = usuarioLogado?.is_master
      ? (body.role || 'promotor')
      : 'promotor'

    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({
        nome: nome,
        telefone: telefoneFormatado,
        endereco: endereco || null,
        senha_hash: senhaHash,
        role: roleFinal,
        is_master: false,
        ativo: true,
        criado_por: user.id
      })
      .eq('id', authUserId)

    if (updateError) {
      console.error('❌ Falha ao atualizar registro:', updateError)
    }

    // 6. Envia email de boas-vindas
    console.log('📧 Enviando email de boas-vindas...')
    try {
      await enviarEmailBoasVindas(email, nome, senha)
      console.log('✅ Email enviado com sucesso')
    } catch (emailError) {
      console.error('⚠️ Falha ao enviar email (usuário criado mesmo assim):', emailError)
    }

    return NextResponse.json({
      sucesso: true,
      usuario: {
        id: authUserId,
        nome,
        email,
        telefone: telefoneFormatado,
        endereco,
        role: roleFinal,
      }
    })

  } catch (error: any) {
    console.error('❌ Erro geral no POST:', error)

    if (authUserId) {
      await deletarUsuarioAuth(authUserId)
    }

    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}