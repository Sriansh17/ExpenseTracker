const s=require('../services/recurrenceService'); module.exports=async()=>{await s.processScheduledTransactions();await s.processMissedOccurrences()};
