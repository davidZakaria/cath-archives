// Script to create or update admin account
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// Try to load dotenv if available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not available, use environment variables directly
}

// Admin Schema (simplified for script)
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lastLogin: { type: Date },
  lockUntil: { type: Date },
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function createAdmin() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arabic-archives';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123';

    // Check if admin already exists
    let admin = await Admin.findOne({ username: username.toLowerCase() });

    if (admin) {
      // Update existing admin password
      console.log('Admin account already exists. Updating password...');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      
      admin.passwordHash = passwordHash;
      admin.email = email.toLowerCase();
      admin.loginAttempts = 0;
      admin.lockUntil = undefined;
      await admin.save();
      
      console.log('✅ Admin account updated successfully!');
      console.log(`   Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      // Create new admin
      console.log('Creating new admin account...');
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);
      
      admin = await Admin.create({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        twoFactorEnabled: false,
      });
      
      console.log('✅ Admin account created successfully!');
      console.log(`   Username: ${username}`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();

