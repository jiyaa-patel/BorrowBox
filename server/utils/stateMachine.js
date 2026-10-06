const TRANSITIONS={requested:['accepted','rejected','cancelled'],accepted:['borrowed','cancelled'],borrowed:['return_pending'],return_pending:['completed'],completed:[],rejected:[],cancelled:[]};
async function move(conn,request,to,actorId){
  if(!TRANSITIONS[request.status]?.includes(to)){const e=Error('Invalid request transition');e.status=409;throw e}
  const stamps={borrowed:'borrowed_at',return_pending:'returned_at',completed:'completed_at'};
  const col=stamps[to];
  const [result]=await conn.query(`UPDATE borrow_requests SET status=?${col?`,${col}=NOW()`:''} WHERE id=? AND status=?`,[to,request.id,request.status]);
  if(!result.affectedRows){const e=Error('Request was already updated. Refresh and try again.');e.status=409;throw e}
  await conn.query('INSERT INTO request_events(request_id,status,actor_id) VALUES(?,?,?)',[request.id,to,actorId]);
  request.status=to;
}
module.exports={TRANSITIONS,move};
