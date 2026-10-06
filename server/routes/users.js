const express=require('express');
const db=require('../db');
const trustScore=require('../utils/trust');
const {auth}=require('../middleware/auth');
const r=express.Router();
r.get('/:id',auth,async(req,res,next)=>{
  try{
    if(!/^\d+$/.test(req.params.id))return res.status(400).json({error:'Invalid user id'});
    const [[u]]=await db.query('SELECT id,name,department,year,campus_area,created_at FROM users WHERE id=? AND is_active=1',[req.params.id]);
    if(!u)return res.status(404).json({error:'User not found'});
    const [[completed]]=await db.query("SELECT COUNT(*) n FROM borrow_requests r JOIN items i ON i.id=r.item_id WHERE r.status='completed' AND (r.borrower_id=? OR i.owner_id=?)",[u.id,u.id]);
    const [[returns]]=await db.query("SELECT COUNT(*) returned,SUM(DATE(returned_at)<=end_date) ontime FROM borrow_requests WHERE borrower_id=? AND returned_at IS NOT NULL",[u.id]);
    const [[cancels]]=await db.query("SELECT COUNT(*) n FROM borrow_requests WHERE cancelled_by=? AND cancelled_from='accepted'",[u.id]);
    const [[rating]]=await db.query('SELECT COALESCE(AVG(rating),0) avgRating,COUNT(*) reviewCount FROM reviews WHERE reviewee_id=?',[u.id]);
    const [[counts]]=await db.query("SELECT (SELECT COUNT(*) FROM borrow_requests r JOIN items i ON i.id=r.item_id WHERE i.owner_id=? AND r.status='completed') lent,(SELECT COUNT(*) FROM borrow_requests WHERE borrower_id=? AND status='completed') borrowed",[u.id,u.id]);
    const returned=Number(returns.returned)||0;
    const rate=returned?(Number(returns.ontime)||0)/returned:0;
    const metrics={completed:Number(completed.n)||0,onTimeRate:rate,avgRating:Number(rating.avgRating)||0,cancellations:Number(cancels.n)||0,reviewCount:Number(rating.reviewCount)||0};
    const trust=trustScore(metrics);
    const [reviews]=await db.query('SELECT rating,comment,created_at FROM reviews WHERE reviewee_id=? ORDER BY id DESC LIMIT 20',[u.id]);
    const [[a]]=await db.query("SELECT COUNT(*) active FROM items WHERE owner_id=? AND status='active'",[u.id]);
    res.json({...u,trust:{...trust,breakdown:{completed:metrics.completed,onTimeRate:rate,avgRating:metrics.avgRating,cancellations:metrics.cancellations}},rating:{avg:metrics.avgRating,count:metrics.reviewCount},counts:{lent:Number(counts.lent)||0,borrowed:Number(counts.borrowed)||0},on_time_pct:Math.round(rate*100),active_listings:Number(a.active),reviews});
  }catch(e){next(e)}
});
module.exports=r;
