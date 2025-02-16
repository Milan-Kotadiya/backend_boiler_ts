import mongoose, { Schema, Document, Model } from "mongoose";
import { getTenantConnection } from "../../connections/mongodb.connection";

/**
 * Interface representing a User document in MongoDB.
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  authMethod: string;
  authId: string | null;
  name: string;
  email: string;
  password: string;
  isOnline: boolean;
  lastSeen: Date;
  socketId: string | null;
  profilePicture: string | null;
  profilePictureLink: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Schema
 */
const userSchema = new Schema(
  {
    authMethod: {
      type: String,
      default: "custom",
    },
    authId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    password: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    socketId: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    profilePictureLink: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // ✅ Automatically manages `createdAt` and `updatedAt`
  }
);

/**
 * Function to get the User model for a specific tenant.
 * @param organizationId - Tenant ID for multi-tenancy.
 * @returns A Mongoose model for the User schema.
 */
export const getUsersModel = async (
  organizationId: string
): Promise<Model<IUser>> => {
  const database = await getTenantConnection(organizationId);
  return database.model<IUser>("User", userSchema);
};
