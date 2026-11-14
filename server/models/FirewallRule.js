import mongoose from 'mongoose';

// Values are stored as strings on purpose: invalid rules (bad IP, port 70000, protocol "HTTP"...)
// must be storable so they can be flagged INVALID instead of being silently rejected.
const str = { type: String, default: '', trim: true };

const ruleSchema = new mongoose.Schema(
  {
    ruleId: { type: String, unique: true, index: true },
    ruleName: { ...str, maxlength: 120 },
    sourceIP: str,
    destinationIP: str,
    sourcePort: str,
    destinationPort: str,
    protocol: str,
    action: str,
    priority: { type: Number, default: 100, min: 1, max: 1000 },
    description: { ...str, maxlength: 500 },
    validationStatus: { type: String, enum: ['VALID', 'INVALID'], default: 'INVALID' },
    validationErrors: [{ _id: false, field: String, message: String }],
    enabled: { type: Boolean, default: true },
    duplicateOf: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

export default mongoose.model('FirewallRule', ruleSchema);
