import { Schema, model, Document, type ObjectId } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string; // hashed
  role: 'customer' | 'staff' | 'manager' | 'admin';
  restaurant?: Schema.Types.ObjectId;
  isActive: boolean; 
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: ObjectId;
}

const UserSchema = new Schema<IUserDocument>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, trim: true, index: true, },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'staff', 'manager', 'admin'], default: 'customer', required: true, index: true },
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  isActive: { type: Boolean, default: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

export const User = model<IUserDocument>('User', UserSchema);