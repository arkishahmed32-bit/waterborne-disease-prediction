// Notification service for sending emails and SMS
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

export const sendEmailNotification = async (email, subject, message) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: message,
    })
    return { success: true }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: error.message }
  }
}

// SMS notification using Twilio would be added here
export const sendSMSNotification = async (phoneNumber, message) => {
  // Twilio integration
  console.log(`SMS to ${phoneNumber}: ${message}`)
  return { success: true }
}
