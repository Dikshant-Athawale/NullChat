import cron from 'node-cron';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';

export function startCleanupService(): void {
  // Run every 5 minutes — belt-and-suspenders with MongoDB TTL index
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Find expired users
      const expiredUsers = await User.find({ expiresAt: { $lt: now } }, { uuid: 1 });
      const expiredUuids = expiredUsers.map((u) => u.uuid);

      if (expiredUuids.length === 0) return;

      console.log(`🧹 Cleaning up ${expiredUuids.length} expired account(s)...`);

      // Delete messages from expired users
      await Message.deleteMany({ senderId: { $in: expiredUuids } });

      // Remove expired users from conversations
      await Conversation.updateMany(
        { participants: { $in: expiredUuids } },
        { $pullAll: { participants: expiredUuids } }
      );

      // Delete empty conversations
      await Conversation.deleteMany({ participants: { $size: 0 } });

      // Delete expired users (may already be gone via TTL index)
      await User.deleteMany({ uuid: { $in: expiredUuids } });

      console.log(`✅ Cleanup complete for ${expiredUuids.length} account(s)`);
    } catch (error: any) {
      console.error('Cleanup service error:', error.message);
    }
  });

  console.log('🧹 Cleanup service started (runs every 5 minutes)');
}
