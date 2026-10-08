const express=require('express');
const crypto=require('crypto');
const db=require('../db');
const {auth}=require('../middleware/auth');
const {move}=require('../utils/stateMachine');
const {handoverLimit}=require('../middleware/rate');
const notify=require('../utils/notify');
const r=express.Router();
r.use(auth);
const {today:day}=require('../utils/dates');
const validId=x=>/^\d+$/.test(String(x));

async function expire(){
  const [xs]=await db.query("SELECT id,status FROM borrow_requests WHERE status IN('requested','accepted') AND end_date<CURDATE()");
  for(const x of xs){
    await db.query("UPDATE borrow_requests SET cancelled_from=status,status='cancelled' WHERE id=? AND status=?",[x.id,x.status]);
    await db.query("INSERT INTO request_events(request_id,status,actor_id) VALUES(?,'cancelled',NULL)",[x.id]);
  }
}

async function get(id,conn=db){
  const [[x]]=await conn.query('SELECT r.*,i.owner_id,i.name item_name,u.name borrower_name,o.name owner_name FROM borrow_requests r JOIN items i ON i.id=r.item_id JOIN users u ON u.id=r.borrower_id JOIN users o ON o.id=i.owner_id WHERE r.id=?',[id]);
  return x;
}

r.use(async(req,res,next)=>{try{await expire();next()}catch(e){next(e)}});

r.post('/',async(req,res,next)=>{
  try{
    const item=Number(req.body.item_id),start=req.body.start,end=req.body.end,msg=String(req.body.message||'').trim();
    if(!Number.isInteger(item)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(start)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(end)||end<start||start<day()||msg.length>255)return res.status(400).json({error:'Invalid request'});
    const [[i]]=await db.query("SELECT i.*,u.is_active,u.name owner_name FROM items i JOIN users u ON u.id=i.owner_id WHERE i.id=? AND i.status='active'",[item]);
    if(!i||!i.is_active)return res.status(404).json({error:'Item not available'});
    if(i.owner_id===req.user.id)return res.status(400).json({error:'You cannot borrow your own item'});
    if(start<i.available_from||end>i.available_to)return res.status(400).json({error:'Dates are outside item availability'});
    const [[over]]=await db.query("SELECT id FROM borrow_requests WHERE item_id=? AND status IN('accepted','borrowed','return_pending') AND start_date<=? AND end_date>=? LIMIT 1",[item,end,start]);
    if(over)return res.status(409).json({error:'Dates overlap an existing booking'});
    const [[dup]]=await db.query("SELECT id FROM borrow_requests WHERE item_id=? AND borrower_id=? AND status IN('requested','accepted') AND start_date<=? AND end_date>=? LIMIT 1",[item,req.user.id,end,start]);
    if(dup)return res.status(409).json({error:'You already have an overlapping open request'});
    const c=await db.getConnection();
    try{
      await c.beginTransaction();
      const [z]=await c.query('INSERT INTO borrow_requests(item_id,borrower_id,start_date,end_date,message) VALUES(?,?,?,?,?)',[item,req.user.id,start,end,msg]);
      await c.query("INSERT INTO request_events(request_id,status,actor_id) VALUES(?,'requested',?)",[z.insertId,req.user.id]);
      await notify(c,i.owner_id,'request_new',`${req.user.name} requested ${i.name}`,{requestId:z.insertId,itemId:item});
      await c.commit();
      res.status(201).json({id:z.insertId});
    }catch(e){await c.rollback();throw e}finally{c.release()}
  }catch(e){next(e)}
});

r.get('/',async(req,res,next)=>{
  try{
    const incoming=req.query.role==='incoming';
    if(!incoming&&req.query.role!=='outgoing')return res.status(400).json({error:'role must be incoming or outgoing'});
    let sql='SELECT r.*,i.name item_name,i.owner_id,u.name borrower_name,o.name owner_name,EXISTS(SELECT 1 FROM reviews rv WHERE rv.request_id=r.id AND rv.reviewer_id=?) reviewed_by_me,(r.code_expires_at IS NOT NULL AND r.code_expires_at>NOW()) code_valid FROM borrow_requests r JOIN items i ON i.id=r.item_id JOIN users u ON u.id=r.borrower_id JOIN users o ON o.id=i.owner_id WHERE '+(incoming?'i.owner_id=?':'r.borrower_id=?');
    const args=[req.user.id,req.user.id];
    if(req.query.status){sql+=' AND r.status=?';args.push(req.query.status)}
    sql+=' ORDER BY r.created_at DESC';
    const [x]=await db.query(sql,args);
    res.json(x.map(v=>({...v,handover_code:incoming&&v.code_valid?v.handover_code:null,code_valid:undefined,code_attempts:undefined,is_overdue:v.status==='borrowed'&&v.end_date<day(),on_time:v.returned_at?String(v.returned_at).slice(0,10)<=v.end_date:null,reviewed_by_me:!!v.reviewed_by_me})));
  }catch(e){next(e)}
});

r.get('/:id',async(req,res,next)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({error:'Invalid request id'});
    const x=await get(req.params.id);
    if(!x)return res.status(404).json({error:'Request not found'});
    if(![x.borrower_id,x.owner_id].includes(req.user.id)&&req.user.role!=='admin')return res.status(403).json({error:'Forbidden'});
    const [events]=await db.query('SELECT status,actor_id,created_at FROM request_events WHERE request_id=? ORDER BY id',[x.id]);
    if(req.user.id!==x.owner_id)delete x.handover_code;
    res.json({...x,events,is_overdue:x.status==='borrowed'&&x.end_date<day(),on_time:x.returned_at?String(x.returned_at).slice(0,10)<=x.end_date:null});
  }catch(e){next(e)}
});

async function action(req,res,next,to,owner){
  try{
    if(!validId(req.params.id))return res.status(400).json({error:'Invalid request id'});
    const c=await db.getConnection();
    try{
      await c.beginTransaction();
      const x=await get(req.params.id,c);
      if(!x){await c.rollback();return res.status(404).json({error:'Request not found'})}
      if((owner?x.owner_id:x.borrower_id)!==req.user.id){await c.rollback();return res.status(403).json({error:'Forbidden'})}
      if(to==='accepted'){
        await c.query('SELECT id FROM items WHERE id=? FOR UPDATE',[x.item_id]);
        const [[bad]]=await c.query("SELECT id FROM borrow_requests WHERE item_id=? AND id<>? AND status IN('accepted','borrowed','return_pending') AND start_date<=? AND end_date>=? LIMIT 1",[x.item_id,x.id,x.end_date,x.start_date]);
        if(bad){await c.rollback();return res.status(409).json({error:'Dates were just booked'})}
      }
      await move(c,x,to,req.user.id);
      if(to==='accepted')await notify(c,x.borrower_id,'request_accepted',`${x.item_name} request accepted`,{requestId:x.id,itemId:x.item_id});
      if(to==='rejected')await notify(c,x.borrower_id,'request_rejected',`${x.item_name} request rejected`,{requestId:x.id,itemId:x.item_id});
      if(to==='return_pending')await notify(c,x.owner_id,'return_marked',`${x.item_name} was marked returned`,{requestId:x.id,itemId:x.item_id});
      if(to==='completed')await notify(c,x.borrower_id,'return_completed',`${x.item_name} return confirmed`,{requestId:x.id,itemId:x.item_id});
      await c.commit();
      res.json({ok:true});
    }catch(e){await c.rollback();throw e}finally{c.release()}
  }catch(e){if(e.status)return res.status(e.status).json({error:e.message});next(e)}
}

r.post('/:id/accept',(a,b,c)=>action(a,b,c,'accepted',true));
r.post('/:id/reject',(a,b,c)=>action(a,b,c,'rejected',true));

r.post('/:id/cancel',async(req,res,next)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({error:'Invalid request id'});
    const c=await db.getConnection();
    try{
      await c.beginTransaction();
      const x=await get(req.params.id,c);
      if(!x){await c.rollback();return res.status(404).json({error:'Request not found'})}
      const isB=x.borrower_id===req.user.id,isO=x.owner_id===req.user.id;
      if(!isB&&!isO){await c.rollback();return res.status(403).json({error:'Forbidden'})}
      if(isO&&x.status!=='accepted'){await c.rollback();return res.status(409).json({error:'Owner can cancel only accepted requests'})}
      const from=x.status;
      await move(c,x,'cancelled',req.user.id);
      await c.query('UPDATE borrow_requests SET cancelled_by=?,cancelled_from=? WHERE id=?',[req.user.id,from,x.id]);
      const other=isB?x.owner_id:x.borrower_id;
      await notify(c,other,'request_cancelled',`${x.item_name} request was cancelled`,{requestId:x.id,itemId:x.item_id});
      await c.commit();
      res.json({ok:true});
    }catch(e){await c.rollback();throw e}finally{c.release()}
  }catch(e){if(e.status)return res.status(e.status).json({error:e.message});next(e)}
});

r.post('/:id/handover-code',async(req,res,next)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({error:'Invalid request id'});
    const x=await get(req.params.id);
    if(!x)return res.status(404).json({error:'Request not found'});
    if(x.owner_id!==req.user.id)return res.status(403).json({error:'Forbidden'});
    if(x.status!=='accepted')return res.status(409).json({error:'Request is not accepted'});
    if(day()<x.start_date||day()>x.end_date)return res.status(409).json({error:'Handover is outside the borrowing dates'});
    const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');
    await db.query('UPDATE borrow_requests SET handover_code=?,code_expires_at=DATE_ADD(NOW(),INTERVAL 30 MINUTE),code_attempts=0 WHERE id=?',[code,x.id]);
    res.json({code,expires_in_minutes:30});
  }catch(e){next(e)}
});

r.post('/:id/confirm-handover',handoverLimit,async(req,res,next)=>{
  try{
    if(!validId(req.params.id))return res.status(400).json({error:'Invalid request id'});
    const c=await db.getConnection();
    try{
      await c.beginTransaction();
      const x=await get(req.params.id,c);
      if(!x){await c.rollback();return res.status(404).json({error:'Request not found'})}
      if(x.borrower_id!==req.user.id){await c.rollback();return res.status(403).json({error:'Forbidden'})}
      if(x.status!=='accepted'){await c.rollback();return res.status(409).json({error:'Request is not accepted'})}
      const [[valid]]=await c.query('SELECT handover_code,code_attempts,code_expires_at>NOW() valid FROM borrow_requests WHERE id=? FOR UPDATE',[x.id]);
      if(!valid.handover_code||!valid.valid){await c.rollback();return res.status(409).json({error:'Handover code is missing or expired'})}
      if(String(req.body.code||'')!==valid.handover_code){
        const n=Number(valid.code_attempts||0)+1;
        await c.query('UPDATE borrow_requests SET code_attempts=?,handover_code=IF(? >= 5,NULL,handover_code),code_expires_at=IF(? >= 5,NULL,code_expires_at) WHERE id=?',[n,n,n,x.id]);
        await c.commit();
        return res.status(400).json({error:n>=5?'Code invalidated after 5 attempts':'Wrong handover code'});
      }
      await move(c,x,'borrowed',req.user.id);
      await c.query('UPDATE borrow_requests SET handover_code=NULL,code_expires_at=NULL,code_attempts=0 WHERE id=?',[x.id]);
      await notify(c,x.owner_id,'handover_confirmed',`${x.item_name} handover confirmed`,{requestId:x.id,itemId:x.item_id});
      await c.commit();
      res.json({ok:true});
    }catch(e){await c.rollback();throw e}finally{c.release()}
  }catch(e){if(e.status)return res.status(e.status).json({error:e.message});next(e)}
});

r.post('/:id/return',(a,b,c)=>action(a,b,c,'return_pending',false));
r.post('/:id/confirm-return',(a,b,c)=>action(a,b,c,'completed',true));
module.exports=r;
