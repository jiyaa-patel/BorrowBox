const express=require('express');
const db=require('../db');
const {auth}=require('../middleware/auth');
const notify=require('../utils/notify');
const r=express.Router();
r.use(auth);
r.post('/',async(req,res,next)=>{
  try{
    const id=Number(req.body.request_id),rating=Number(req.body.rating),comment=String(req.body.comment||'').trim();
    if(!Number.isInteger(id)||rating<1||rating>5||comment.length>300)return res.status(400).json({error:'Invalid review'});
    const [[x]]=await db.query('SELECT r.*,i.owner_id,i.id item_id,i.name item_name FROM borrow_requests r JOIN items i ON i.id=r.item_id WHERE r.id=?',[id]);
    if(!x)return res.status(404).json({error:'Request not found'});
    if(x.status!=='completed')return res.status(409).json({error:'Request is not completed'});
    if(![x.borrower_id,x.owner_id].includes(req.user.id))return res.status(403).json({error:'Forbidden'});
    const other=req.user.id===x.borrower_id?x.owner_id:x.borrower_id;
    const c=await db.getConnection();
    try{
      await c.beginTransaction();
      try{await c.query('INSERT INTO reviews(request_id,reviewer_id,reviewee_id,rating,comment) VALUES(?,?,?,?,?)',[id,req.user.id,other,rating,comment])}
      catch(e){if(e.code==='ER_DUP_ENTRY'){await c.rollback();return res.status(409).json({error:'You already reviewed this request'})}throw e}
      await notify(c,other,'review_received',`You received a review for ${x.item_name}`,{requestId:id,itemId:x.item_id});
      await c.commit();
      res.status(201).json({ok:true});
    }catch(e){await c.rollback();throw e}finally{c.release()}
  }catch(e){next(e)}
});
module.exports=r;
