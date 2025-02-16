import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PubSub } from "graphql-subscriptions";
import User, { IUser } from "../models/user.model";
import authService from "../services/auth.service";

interface AuthPayload {
  token: string;
  user: IUser;
}

interface ContextType {
  pubsub: PubSub;
}

const resolvers = {
  Query: {},

  Mutation: {
    register: async (
      _: any,
      {
        username,
        password,
        email,
      }: { username: string; password: string; email: string },
      { pubsub }: ContextType
    ): Promise<IUser> => {
      try {
        const savedUser = await authService.register({
          name: username,
          password: password,
          email: email,
        });

        pubsub.publish("USER_REGISTERED", { userRegistered: savedUser });

        return savedUser;
      } catch (error) {
        throw new Error("Failed to register user.");
      }
    },

    login: async (
      _: any,
      { email, password }: { email: string; password: string },
      { pubsub }: ContextType
    ): Promise<AuthPayload> => {
      try {
        const savedUser = await authService.login({
          password: password,
          email: email,
        });
        const token = savedUser.access_token;
        const user = savedUser.user;

        pubsub.publish("USER_LOGGED", {
          userLogged: { token, user },
        });
        return { token, user };
      } catch (error) {
        console.log(error);
        throw new Error("Login failed.");
      }
    },
  },

  Subscription: {
    userRegistered: {
      subscribe: (_: any, __: any, { pubsub }: ContextType) => {
        return pubsub.asyncIterableIterator("USER_REGISTERED");
      },
    },
    userLogged: {
      subscribe: (_: any, __: any, { pubsub }: ContextType) => {
        return pubsub.asyncIterableIterator("USER_LOGGED");
      },
    },
  },
};

export default resolvers;
