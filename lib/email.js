// lib/email.js — envio de e-mail do Aviari.
//
// Provedores (nesta ordem):
//   1) RESEND_API_KEY  (+ EMAIL_FROM)         → API do Resend (resend.com), simples e com plano grátis
//   2) SMTP_HOST/PORT/USER/PASS (+ EMAIL_FROM) → qualquer SMTP (Locaweb, Gmail com senha de app, Brevo...)
//   3) nenhum → MODO DE TESTE: não envia; guarda o e-mail em "emails_log" e o dono vê no painel.
//
// Nunca derruba quem chamou: se o envio falhar, devolve { ok:false } e registra o erro.
const master = require('../db/masterPool');

const FROM = () => process.env.EMAIL_FROM || 'Aviari <nao-responda@localhost>';
const modoTeste = () => !process.env.RESEND_API_KEY && !process.env.SMTP_HOST;

let transporte = null;
function smtp() {
  if (!transporte) {
    const nodemailer = require('nodemailer');
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transporte;
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Moldura simples e legível em qualquer leitor de e-mail.
function moldura(titulo, paragrafos, botao) {
  const p = paragrafos.map((t) => `<p style="margin:0 0 14px;line-height:1.55;">${esc(t)}</p>`).join('');
  const b = botao ? `<p style="margin:22px 0;"><a href="${esc(botao.url)}" style="background:#c7973f;color:#1a1408;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;display:inline-block;">${esc(botao.texto)}</a></p>
    <p style="font-size:12px;color:#777;margin:0 0 14px;">Se o botão não abrir, copie este endereço no navegador:<br>${esc(botao.url)}</p>` : '';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222;">
    <h2 style="color:#8a6420;margin:0 0 18px;">${esc(titulo)}</h2>${p}${b}
    <hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px;"><p style="font-size:12px;color:#888;margin:0;">Aviari — gestão de criatórios de aves</p></div>`;
}

async function enviarEmail({ para, assunto, texto, html }) {
  let ok = false, erro = null;
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM(), to: [para], subject: assunto, text: texto, html })
      });
      if (!r.ok) throw new Error('Resend respondeu ' + r.status + ' ' + (await r.text()).slice(0, 200));
      ok = true;
    } else if (process.env.SMTP_HOST) {
      await smtp().sendMail({ from: FROM(), to: para, subject: assunto, text: texto, html });
      ok = true;
    }
  } catch (e) { erro = String(e.message || e).slice(0, 480); console.error('Falha ao enviar e-mail:', erro); }

  try {
    await master.query('INSERT INTO emails_log (para, assunto, corpo, enviado, erro) VALUES ($1,$2,$3,$4,$5)',
      [para, assunto, modoTeste() ? texto : null, ok, erro]);
  } catch (e) { /* log é só conveniência */ }
  if (modoTeste()) console.log(`📧 [modo de teste] para ${para}: ${assunto}\n${texto}\n`);
  return { ok, modoTeste: modoTeste(), erro };
}

const base = () => (process.env.APP_URL || '').replace(/\/$/, '');

const modelos = {
  confirmar(nome, token) {
    const url = `${base()}/confirmar.html?token=${token}`;
    return { assunto: 'Confirme o seu e-mail — Aviari',
      texto: `Olá, ${nome}!\n\nConfirme o seu e-mail abrindo este link:\n${url}\n\nSe não foi você, ignore esta mensagem.`,
      html: moldura('Confirme o seu e-mail', [`Olá, ${nome}!`, 'Falta só um passo para confirmar o e-mail da sua conta.'], { texto: 'Confirmar e-mail', url }) };
  },
  redefinir(nome, token) {
    const url = `${base()}/redefinir.html?token=${token}`;
    return { assunto: 'Redefinir a sua senha — Aviari',
      texto: `Olá, ${nome}!\n\nPara criar uma nova senha, abra o link (vale por 1 hora):\n${url}\n\nSe não foi você, ignore esta mensagem — a sua senha continua a mesma.`,
      html: moldura('Redefinir a senha', [`Olá, ${nome}!`, 'Recebemos um pedido para criar uma nova senha. O link vale por 1 hora.', 'Se não foi você, ignore esta mensagem: a sua senha continua a mesma.'], { texto: 'Criar nova senha', url }) };
  },
  aviso(nome, criatorio, linha, planosUrl) {
    return { assunto: `${linha.assunto} — Aviari`,
      texto: `Olá, ${nome}!\n\n${linha.texto}\n\nVer planos: ${planosUrl}`,
      html: moldura(linha.assunto, [`Olá, ${nome}!`, linha.texto], { texto: 'Ver planos', url: planosUrl }) };
  }
};

module.exports = { enviarEmail, modelos, modoTeste, moldura };
