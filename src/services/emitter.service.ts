import { fork } from "child_process";
import path from "path";
import Emitter from "../connections/event-emitter.connection";
import { EventCases } from "../constants/event.handler";
import { paths } from "../config/paths.config";

// Define the structure of email data
interface EmailData {
  to: string;
  subject: string;
  text: string;
}

// Define the event data structure
interface EventData {
  userId: string;
  email: string;
  name: string;
}

const { PROJECT_ROOT_PATH } = paths;

const EmitterListener = () => {
  Emitter.on(EventCases.SEND_WELCOME_MAIL, async (data: EventData) => {
    // Define child process path
    const childProcessPath = path.join(
      PROJECT_ROOT_PATH,
      "dist/child_process/send_mail.js"
    );
    const child = fork(childProcessPath);

    // Create email payload
    const emailData: EmailData = {
      to: "receiver@example.com",
      subject: "Test Email from Child Process",
      text: "Hello! This is a test email sent using a child process.",
    };

    // Send data to child process
    child.send(emailData);

    // Handle messages from the child process
    child.on("message", (message: unknown) => {
      console.log("Received from child:", message);
    });

    // Handle child process exit event
    child.on("exit", (code: number | null) => {
      console.log(`Child process exited with code ${code}`);
    });

    // Handle errors
    child.on("error", (err: Error) => {
      console.error("Child process error:", err);
    });

    // Handle process close event
    child.on("close", (code: number | null) => {
      console.log(`Child process closed with code ${code}`);
    });
  });
};

export default EmitterListener;
