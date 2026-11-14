import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    inputRule: { type: String, default: '' },
    validationStatus: { type: String, enum: ['VALID', 'INVALID'], required: true },
    errors: [{ _id: false, field: String, message: String }],
    dfaTransitions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    dfaAccepted: { type: Boolean, default: false },
    dfaFinalState: { type: String, default: 'q0' },
    source: { type: String, enum: ['VALIDATOR', 'SIMULATOR', 'RULE_SAVE'], default: 'VALIDATOR' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminName: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, suppressReservedKeysWarning: true }
);

export default mongoose.model('ValidationHistory', historySchema);
