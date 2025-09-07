import cron from 'node-cron';
import Transaction from '../models/transaction.js';
import { autoCancel } from '../utils/autoRefunded.js';


// รัน cron ทุก 5 นาที
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();

    const expiredTransactions = await Transaction.find({
      endTime: { $lt: now },
      status: 'paid'
    }).limit(50);

    if (expiredTransactions.length === 0) {
      console.log(`[Cron] No expired transactions at ${now.toISOString()}`);
      return;
    }

    console.log(`[Cron] Found ${expiredTransactions.length} expired transactions at ${now.toISOString()}`);

    for (const tx of expiredTransactions) {
      await autoCancel(tx._id);
    }

    console.log(`[Cron] Finished processing expired transactions at ${now.toISOString()}`);
  } catch (error) {
    console.error('[Cron] Error running transaction cron job:', error);
  }
});
