import { ChildProcess } from "child_process";

type EmailData = {
  to: string;
  subject: string;
  body: string;
};

type ProcessMessage = (emailData: EmailData) => void;

type ProcessResponse = {
  success: boolean;
  message: string;
  info?: any;
  error?: string;
};

process.on("message", async (emailData: EmailData) => {
  try {
    console.log(emailData, "emailData");

    // Simulate email sending (replace with actual implementation)
    const info = { messageId: "12345" }; // Example response

    // Send success response to parent
    process.send?.({
      success: true,
      message: "Email sent successfully!",
      info,
    } as ProcessResponse);
  } catch (error) {
    // Send failure response to parent
    process.send?.({
      success: false,
      message: "Failed to send email",
      error: (error as Error).message,
    } as ProcessResponse);
  }

  process.exit();
});
