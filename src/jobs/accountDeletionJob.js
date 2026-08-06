const db=require('../config/db'); module.exports=async()=>{const result=await db.query('DELETE FROM users WHERE deletion_scheduled_at <= NOW() RETURNING id');return{deleted:result.rowCount}};
