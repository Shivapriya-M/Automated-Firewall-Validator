import Admin from '../models/Admin.js';

// Existing accounts predate the approval workflow and remain approved.
export async function migrateLegacyAccountStatuses() {
  const result = await Admin.updateMany({ status: { $exists: false } }, { $set: { status: 'APPROVED' } });
  return result.modifiedCount;
}
