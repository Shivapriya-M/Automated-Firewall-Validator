import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    message: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminName: { type: String, default: 'system' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Activity', activitySchema);
