import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: string; // user UUID
  ciphertext: string; // encrypted message content — server NEVER sees plaintext
  ratchetHeader?: {
    publicKey: string;
    chainIndex: number;
    previousChainLength: number;
  };
  iv?: string; // initialization vector for decryption
  status: 'sent' | 'delivered' | 'read';
  selfDestructTimer?: number; // seconds until self-destruct, null = no self-destruct
  burnAfterReading: boolean;
  expiresAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    // CIPHERTEXT — opaque to server, never decrypted server-side
    ciphertext: {
      type: String,
      required: true,
    },
    // Ratchet header — public info needed for recipient to decrypt
    ratchetHeader: {
      publicKey: String,
      chainIndex: Number,
      previousChainLength: Number,
    },
    iv: {
      type: String,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    selfDestructTimer: {
      type: Number,
      default: null,
    },
    burnAfterReading: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for self-destructing messages
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fetching messages in a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
