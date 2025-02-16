import express, { Request, Response } from "express";
import ejs from "ejs";
import path from "path";
import { config } from "../config/dotenv.config";
import { paths } from "../config/paths.config";
import { createSubscriptionPlan } from "../services/razorpay.service";
import { sendMail } from "../connections/mail.server";
import { getPuppeteer } from "../connections/puppeteer.connection";
import { saveFile } from "../utils/file_system.utils";

const { NODE_ENV } = config;
const { PUBLIC_PATH, PROJECT_ROOT_PATH } = paths;

const router = express.Router();

router.get("/test", (req: Request, res: Response) => {
  res.send("Hello, World!");
});

router.get("/set_cookie", async (req: Request, res: Response) => {
  console.log(req.cookies);

  res.send("Done!");
});

router.get("/test_razorpay", async (req: Request, res: Response) => {
  const data = req.body;

  const planObj = {
    period: data?.period,
    interval: data?.interval,
    item: {
      name: data?.name,
      amount: data?.amount * 100,
      currency: data?.currency,
      description: data?.description,
    },
    notes: {
      notes_key_1: data?.notes,
    },
  };

  const PlanDetail = await createSubscriptionPlan(planObj);
  res.send({ data: PlanDetail });
});

router.get("/test_mail", async (req: Request, res: Response) => {
  const emailTemplatePath = path.join(
    PROJECT_ROOT_PATH,
    `/src/mails/auth/verification_code.html`
  );

  const emailTemplate = await ejs.renderFile(emailTemplatePath, {
    email: "milan.kotadiya@nexuslinkservices.in",
    otp: "123456",
  });

  await sendMail(
    "milan.kotadiya@nexuslinkservices.in",
    "Verify Email",
    emailTemplate
  );

  res.send({ status: "ok" });
});

router.get("/test_puppeteer_check", async (req: Request, res: Response) => {
  const emailTemplatePath = path.join(
    PROJECT_ROOT_PATH,
    `/src/mails/auth/verification_code.html`
  );

  const renderedHtml = await ejs.renderFile(emailTemplatePath, {
    email: "milan.kotadiya@nexuslinkservices.in",
    otp: "123456",
  });

  const browser = await getPuppeteer();
  if (!browser) {
    throw new Error("Bowser Not Found");
  }
  const page = await browser.newPage();
  await page.setContent(renderedHtml, { waitUntil: "load" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      left: "10px",
      right: "10px",
      top: "10px",
      bottom: "10px",
    },
  });

  const data = await saveFile("invoice", {
    originalname: "test",
    size: 10,
    buffer: pdfBuffer as Buffer,
  });

  await browser.close();

  res.status(200).send(data);
});

const testRoutes = router;

export default testRoutes;
