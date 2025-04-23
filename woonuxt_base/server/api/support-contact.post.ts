import { defineEventHandler, readBody } from 'h3'
import nodemailer from 'nodemailer'

export default defineEventHandler(async (event) => {
  const { email, message } = await readBody(event)
  if (!email || !message) {
    return { success: false, error: 'Email et message requis.' }
  }

  // Configurez le transporteur SMTP Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // à définir dans .env
      pass: process.env.GMAIL_PASS  // à définir dans .env
    }
  })

  try {
    await transporter.sendMail({
      from: email,
      to: 'support@roadclique.fr',
      subject: 'Demande assistance RoadClique',
      text: `Message de: ${email}\n\n${message}`
    })
    return { success: true }
  } catch (error: any) {
    console.error('Erreur envoi mail assistance:', error)
    return { success: false, error: error.message || 'Erreur inconnue' }
  }
})
