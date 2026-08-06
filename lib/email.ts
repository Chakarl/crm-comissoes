import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function enviarEmailBoasVindas(
  email: string,
  nome: string,
  senha: string
) {
  const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .content { background: white; padding: 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
        .credentials { background: #f8fafc; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 24px 0; }
        .credential-item { margin: 12px 0; }
        .label { font-weight: 600; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; }
        .password { font-family: 'Courier New', monospace; background: #fef3c7; padding: 8px 12px; border-radius: 6px; display: inline-block; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">🎉 Bem-vindo(a)!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Sua conta foi criada com sucesso</p>
        </div>
        
        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Olá <strong>${nome}</strong>,</p>
          
          <p>Sua conta no <strong>Sistema de Gerenciamento</strong> foi criada. Use os dados abaixo para fazer login:</p>
          
          <div class="credentials">
            <div class="credential-item">
              <div class="label">📧 Email de Acesso</div>
              <div class="value">${email}</div>
            </div>
            
            <div class="credential-item">
              <div class="label">🔑 Senha Temporária</div>
              <div class="value"><span class="password">${senha}</span></div>
            </div>
          </div>
          
          <div class="alert">
            <strong>⚠️ Importante:</strong> Guarde essa senha em local seguro. Você pode alterá-la após o primeiro acesso nas configurações da conta.
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" class="button">
            Acessar o Sistema
          </a>
          
          <div class="footer">
            <p>Se você não solicitou essa conta, ignore este email.</p>
            <p style="margin-top: 16px;">&copy; ${new Date().getFullYear()} Sistema de Gerenciamento</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: `"Sistema de Gerenciamento" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '🎉 Bem-vindo! Seus dados de acesso',
    html: htmlEmail,
  })
}