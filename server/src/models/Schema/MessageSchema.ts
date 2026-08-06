import { Schema, model, Document, Types } from 'mongoose';
const ObjectId = Schema.Types.ObjectId;

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  text: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = model<IMessage>('Message', MessageSchema);