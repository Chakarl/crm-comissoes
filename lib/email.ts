import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

interface EmailBoasVindas {
  email: string
  nome: string
  senha: string
  telefone: string
}

export async function enviarEmailBoasVindas({ email, nome, senha, telefone }: EmailBoasVindas) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crm-comissoes-nine.vercel.app'
  const linkPlataforma = `${appUrl}/login`

  await transporter.sendMail({
    from: `"Potencial" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🎉 Bem-vindo ao Sistema!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                
                <!-- Header com gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                      🎉 Bem-vindo ao Sistema!
                    </h1>
                    <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">
                      Seus dados de acesso foram criados
                    </p>
                  </td>
                </tr>

                <!-- Conteúdo -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                      Olá <strong>${nome}</strong>,
                    </p>
                    
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                      Sua conta foi criada com sucesso! Use as credenciais abaixo para acessar a plataforma:
                    </p>

                    <!-- Box de Credenciais -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                      <tr>
                        <td>
                          <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
                            📧 Email de acesso
                          </p>
                          <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 20px 0; word-break: break-all;">
                            ${email}
                          </p>

                          <p style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
                            🔑 Senha temporária
                          </p>
                          <p style="color: #1e293b; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; background-color: #ffffff; padding: 12px 16px; border-radius: 8px; border: 2px dashed #cbd5e1; margin: 0;">
                            ${senha}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Botão de Acesso -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td align="center">
                          <a href="${linkPlataforma}" 
                             style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                            🚀 Acessar Plataforma
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link alternativo -->
                    <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0 0 32px 0; text-align: center;">
                      Ou copie e cole este link no navegador:<br>
                      <a href="${linkPlataforma}" style="color: #2563eb; text-decoration: none; word-break: break-all;">
                        ${linkPlataforma}
                      </a>
                    </p>

                    <!-- Avisos de segurança -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td>
                          <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
                            <strong>⚠️ Importante:</strong><br>
                            • Recomendamos alterar sua senha no primeiro acesso<br>
                            • Não compartilhe suas credenciais com terceiros<br>
                            • Guarde esta senha em local seguro
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                      Se tiver dúvidas ou precisar de ajuda, entre em contato com o administrador do sistema.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                      © ${new Date().getFullYear()} Sistema de Comissões | Todos os direitos reservados
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  })
}