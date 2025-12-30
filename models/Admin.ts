// Mongoose model for Admin users with 2FA support
import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  
  // 2FA
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  
  // Session management
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminMethods {
  comparePassword(password: string): Promise<boolean>;
  isLocked(): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
}

type AdminModel = Model<IAdmin, object, IAdminMethods>;

const AdminSchema = new Schema<IAdmin, AdminModel, IAdminMethods>(
  {
    username: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { 
      type: String, 
      required: true,
    },
    
    // 2FA
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    
    // Session management
    lastLogin: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Constants for account locking
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// Methods
AdminSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

AdminSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

AdminSchema.methods.incrementLoginAttempts = async function(): Promise<void> {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < new Date()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
    return;
  }
  
  const updates: Record<string, unknown> = { $inc: { loginAttempts: 1 } };
  
  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
  }
  
  await this.updateOne(updates);
};

AdminSchema.methods.resetLoginAttempts = async function(): Promise<void> {
  await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

// Static method to hash password
AdminSchema.statics.hashPassword = async function(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Indexes
AdminSchema.index({ username: 1 });
AdminSchema.index({ email: 1 });

const Admin: Model<IAdmin, object, IAdminMethods> =
  mongoose.models.Admin || mongoose.model<IAdmin, AdminModel>('Admin', AdminSchema);

export default Admin;

