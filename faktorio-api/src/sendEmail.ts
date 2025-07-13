export async function sendEmail(
  emailData: {
    to: { email: string; name: string }
    subject: string
    html: string
  },
  env: { MAILJET_API_KEY: string; MAILJET_API_SECRET: string }
): Promise<void> {
  const auth = btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_API_SECRET}`)

  const response = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Messages: [
        {
          From: {
            Email: 'no-reply@faktorio.cz',
            Name: 'Faktorio'
          },
          To: [
            {
              Email: emailData.to.email,
              Name: emailData.to.name
            }
          ],
          Subject: emailData.subject,
          HTMLPart: emailData.html
        }
      ]
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to send email:', response.status, errorText)
    console.error('env', env)
    throw new Error(`Failed to send email: ${response.status}`)
  }

  console.log(
    `Email "${emailData.subject}" sent successfully to: ${emailData.to.email}`
  )
}
