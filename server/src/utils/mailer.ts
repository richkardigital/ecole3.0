import nodemailer from 'nodemailer';

// You can configure this with your real SMTP settings in the future.
// For now, it will print to the console if no SMTP_HOST is provided.
export const sendEmail = async (to: string, subject: string, html: string) => {
  const host = process.env.SMTP_HOST;
  
  if (!host) {
    console.log("================ MOCK EMAIL SENDING ================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: \n${html}`);
    console.log("====================================================");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Ecole Connectée" <${process.env.SMTP_USER || 'noreply@ecole-connecte.com'}>`,
      to,
      subject,
      html,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
