import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uuid: string;
  tempUsername: string;
  passwordHash: string;
  publicKey: string;
  refreshToken?: string;
  createdAt: Date;
  expiresAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uuid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tempUsername: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    publicKey: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// TTL index: MongoDB automatically deletes documents when expiresAt passes
UserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model<IUser>('User', UserSchema);
