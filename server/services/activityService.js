import Activity from '../models/Activity.js';

export async function logActivity(type, message, admin, createdAt) {
  return Activity.create({
    type, message,
    adminId: admin?._id,
    adminName: admin?.username || 'system',
    ...(createdAt ? { createdAt } : {}),
  });
}
