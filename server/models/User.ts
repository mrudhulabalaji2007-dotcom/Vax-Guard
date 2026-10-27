import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'warehouse_manager' | 'logistics_manager' | 'hospital_receiver';
  department: string;
  phone: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'warehouse_manager', 'logistics_manager', 'hospital_receiver'],
      default: 'admin',
      required: true,
    },
    department: { type: String, default: 'Vaccine Cold-Chain Operations' },
    phone: { type: String, default: '+91 98765 43210' },
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
