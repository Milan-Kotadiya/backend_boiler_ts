import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import logger from "../logger/logger";
import { config } from "../config/dotenv.config";

const {
  MAILER_HOST,
  MAILER_PORT,
  MAILER_SECURE,
  MAILER_USERNAME,
  MAILER_PASSWORD,
  MAILER_FROM,
} = config;

// ✅ Define Transporter with Proper Type
const transporter: Transporter = nodemailer.createTransport({
  host: MAILER_HOST,
  port: Number(MAILER_PORT),
  secure: MAILER_SECURE,
  auth: {
    user: MAILER_USERNAME,
    pass: MAILER_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// ✅ Function to verify Mail Server Connection
export const connectMailServer = async (): Promise<void> => {
  try {
    await transporter.verify();
    logger.info("✅ Connected to Mail Server");
  } catch (error) {
    logger.warn(
      "⚠️ Unable to connect to email server. Check MAILER configuration in .env"
    );
  }
};

// ✅ Function to Send Mail with Proper Types
export const sendMail = async (
  to: string | string[], // Can accept single email or an array of emails
  subject: string,
  htmlToSend: string,
  cc?: string | string[],
  bcc?: string | string[],
  attachments?: SendMailOptions["attachments"]
): Promise<void> => {
  try {
    const mailOptions: SendMailOptions = {
      from: MAILER_FROM,
      to,
      subject,
      html: htmlToSend,
      attachments,
      cc,
      bcc,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`📩 Mail Sent! To: ${to} | Subject: ${subject}`);
  } catch (error) {
    logger.error(`❌ Failed to Send Mail. Error: ${(error as Error).message}`);
  }
};
