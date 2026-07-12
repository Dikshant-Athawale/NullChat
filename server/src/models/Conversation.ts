import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: string[]; // array of user UUIDs
  type: 'direct' | 'group';
  groupName?: string;
  groupIcon?: string;
  createdBy: string;
  lastMessage?: {
    senderId: string;
    ciphertext: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [String],
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    groupName: {
      type: String,
      default: null,
    },
    groupIcon: {
      type: String,
      default: null,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastMessage: {
      senderId: String,
      ciphertext: String,
      timestamp: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding direct conversations between two users
ConversationSchema.index({ participants: 1, type: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
