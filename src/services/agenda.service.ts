import Agenda, { Job } from "agenda";
import logger from "../logger/logger";
import {
  getTenantConnection,
  tenantConnectionMap,
} from "../connections/mongodb.connection";
import { config } from "../config/dotenv.config";

const { DB_HOST, DB_PORT, DB_NAME } = config;

// Define a map to store Agenda instances for each tenant
const agendaInstances: Map<string, Agenda> = new Map();

// Define Agenda job for tenants
const defineAgendaJobs = (agenda: Agenda, tenantId: string) => {
  agenda.define("send daily email", async (job: Job) => {
    logger.info(`📧 Sending Daily Email for Tenant: ${tenantId}`);
  });
};

// Initialize Agenda instance for a specific tenant
const initTenantAgenda = async (tenantId: string): Promise<Agenda> => {
  if (agendaInstances.has(tenantId)) {
    return agendaInstances.get(tenantId) as Agenda;
  }

  const tenantDb = await getTenantConnection(tenantId);
  const agenda = new Agenda({
    db: {
      address: `mongodb://${DB_HOST}:${DB_PORT}/${tenantId}`,
      collection: "agendaJobs",
    },
  });

  defineAgendaJobs(agenda, tenantId);
  await agenda.start();
  await agenda.every("1 day", "send daily email"); // Run daily

  agendaInstances.set(tenantId, agenda);
  logger.info(`🚀 Agenda initialized for tenant: ${tenantId}`);

  return agenda;
};

// Initialize Agenda instances for all tenants
const initAllTenantAgendas = async (): Promise<void> => {
  for (const tenantId of tenantConnectionMap.keys()) {
    await initTenantAgenda(tenantId);
  }
  logger.info("✅ All tenant agenda instances initialized!");
};

// Main Agenda instance for the server
const agenda = new Agenda({
  db: {
    address: `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`,
    collection: "agendaJobs",
  },
});

// Define task for the main server
agenda.define("send daily email", async (job: Job) => {
  logger.info("Agenda Start...");
});

// Initialize Agenda for the main server and tenants
const initAgenda = async (): Promise<void> => {
  await agenda.start();

  // Uncomment if you want to run the job every minute
  // await agenda.every("1 minute", "send daily email", {
  //   test: "1",
  //   isfalse: false,
  // });

  logger.info("🚀 Agenda jobs scheduled!");

  await initAllTenantAgendas();
};

export default initAgenda;

//  await agenda.now("send daily email");

// Run the job every 5 minutes
// await agenda.every("5 minutes", "send daily email");

// Schedule a job to run once in 10 minutes
// await agenda.schedule("in 10 minutes", "send daily email");

// Run every hour
// await agenda.repeatEvery("1 hour", "send daily email");

// Run every day at 8 AM using a cron expression
// await agenda.every("0 8 * * *", "send daily email");
