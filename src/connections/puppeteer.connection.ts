import puppeteer, { Browser } from "puppeteer";
import logger from "../logger/logger";

// ✅ Function to Initialize Puppeteer
export async function getPuppeteer(): Promise<Browser | null> {
  try {
    const puppeteerBrowser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      timeout: 600000,
    });

    return puppeteerBrowser;
  } catch (error) {
    logger.error(
      `❌ Puppeteer browser cannot be launched: ${(error as Error).message}`
    );
    return null; // ✅ Ensuring function returns `null` in case of failure
  }
}
