import { PubSub } from "graphql-subscriptions";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws"; // ✅ Corrected import
import type { Express, RequestHandler } from "express";
import type { Server } from "http";
import logger from "../logger/logger";
import typeDefs from "../graphql/typeDefs";
import resolvers from "../graphql/resolvers";

const pubsub = new PubSub(); // ✅ Ensure PubSub instance

export async function createGraphQlServer(httpServer: Server, app: Express) {
  const schema = makeExecutableSchema({
    typeDefs: typeDefs,
    resolvers: resolvers,
  });

  // ✅ WebSocket Server for Subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // ✅ Use graphql-ws for subscriptions
  useServer(
    {
      schema,
      context: async () => ({ pubsub }), // ✅ Ensure pubsub is in WebSocket context
    },
    wsServer
  );

  // ✅ Apollo Server
  const apolloServer = new ApolloServer({
    schema,
  });

  await apolloServer.start();

  app.use(
    "/graphql",
    expressMiddleware(apolloServer, {
      context: async () => ({ pubsub }), // ✅ Ensures HTTP requests get pubsub
    }) as unknown as RequestHandler
  );

  logger.info(`🚀 GraphQL Server ready at path /graphql`);
}
