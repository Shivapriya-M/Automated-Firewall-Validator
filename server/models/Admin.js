import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30, match: /^[a-zA-Z0-9_]+$/ },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    // Legacy accounts stay usable; public registrations explicitly start as PENDING.
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED', index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});
adminSchema.methods.comparePassword = function (plain) { return bcrypt.compare(plain, this.password); };
adminSchema.methods.toSafeJSON = function () {
  return {
    id: String(this._id), username: this.username, email: this.email, role: this.role,
    status: this.status, createdAt: this.createdAt, approvedAt: this.approvedAt,
  };
};

export default mongoose.model('Admin', adminSchema);
