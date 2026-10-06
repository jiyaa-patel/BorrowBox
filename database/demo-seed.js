const bcrypt=require('bcryptjs');

const users=[
  ['Demo Student 01','24bce307@nirmauni.ac.in','24BCE307','9876500001','CSE',3,'Block A'],
  ['Demo Student 02','24bce118@nirmauni.ac.in','24BCE118','9876500002','CSE',3,'Block B'],
  ['Demo Student 03','23bce214@nirmauni.ac.in','23BCE214','9876500003','CSE',4,'Block C'],
  ['Demo Student 04','24bee041@nirmauni.ac.in','24BEE041','9876500004','EE',3,'Block A'],
  ['Demo Student 05','23bee087@nirmauni.ac.in','23BEE087','9876500005','EE',4,'Block D'],
  ['Demo Student 06','24btm052@nirmauni.ac.in','24BTM052','9876500006','Mechanical',3,'Block B'],
  ['Demo Student 07','23btm019@nirmauni.ac.in','23BTM019','9876500007','Mechanical',4,'Block C'],
  ['Demo Student 08','22bce156@nirmauni.ac.in','22BCE156','9876500008','CSE',5,'Block D'],
  ['Demo Student 09','22bee063@nirmauni.ac.in','22BEE063','9876500009','EE',5,'Block A'],
  ['Demo Student 10','24bce225@nirmauni.ac.in','24BCE225','9876500010','CSE',3,'Block C']
];

const items=[
  [0,'Academic','Scientific Calculator FX-991ES Plus','Reliable calculator for quizzes, labs and exam practice.','Library Block'],
  [0,'Electronics','USB-C 65W Laptop Charger','Fast USB-C charger suitable for most modern laptops and tablets.','CSE Building'],
  [1,'Academic','Data Structures Reference Book','Clean reference book covering trees, graphs, hashing and complexity.','Central Library'],
  [1,'Outdoor','Cricket Bat - English Willow','Well-maintained full-size bat for nets or weekend matches.','Sports Ground'],
  [2,'Electronics','Wireless Mouse','Compact wireless mouse with USB receiver and fresh batteries.','CSE Building'],
  [2,'Media','Portable Bluetooth Speaker','Small speaker with clear sound for club meetings and gatherings.','Student Activity Centre'],
  [3,'Tools','Digital Multimeter','Useful for electronics lab measurements and basic circuit debugging.','E Block Lab'],
  [3,'Electronics','Breadboard + Jumper Wire Kit','Large breadboard with male-to-male jumper wires for prototyping.','E Block'],
  [4,'Academic','Engineering Mathematics Notes','Organized handwritten notes covering transforms, probability and calculus.','Library Block'],
  [4,'Tools','Mini Screwdriver Set','Precision screwdriver set for electronics and laptop maintenance.','Hostel Block D'],
  [5,'Tools','Adjustable Spanner Set','Two adjustable spanners suitable for workshop and project work.','Mechanical Workshop'],
  [5,'Outdoor','Badminton Racket Pair','Two rackets with a shuttle tube for casual evening games.','Sports Complex'],
  [6,'Outdoor','Football Size 5','Match-size football in good condition with proper air pressure.','Sports Ground'],
  [6,'Events','Extension Board - 6 Socket','Six-socket extension board useful for club events and project demos.','Student Activity Centre'],
  [7,'Electronics','HDMI to USB-C Adapter','Adapter for connecting USB-C laptops to projectors and displays.','CSE Building'],
  [7,'Media','Tripod Stand','Adjustable tripod for phones and lightweight cameras.','Auditorium'],
  [8,'Events','LED Fairy Lights','Warm decorative lights for stalls, club rooms and small events.','Student Activity Centre'],
  [8,'Tools','Soldering Iron Kit','Basic soldering iron with stand and desoldering pump.','E Block Lab'],
  [9,'Academic','Operating Systems Notes','Concise OS notes covering processes, memory, scheduling and file systems.','Central Library'],
  [9,'Media','USB Condenser Microphone','Plug-and-play microphone for presentations, recordings and online meetings.','CSE Building']
];

function date(offset){
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+offset);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

async function ensureUser(db,row,hash){
  const [name,email,student,phone,department,year,area]=row;
  await db.query(`INSERT INTO users(name,email,student_id,password_hash,phone,department,year,campus_area,role)
    VALUES(?,?,?,?,?,?,?,?,'user') ON DUPLICATE KEY UPDATE name=VALUES(name),phone=VALUES(phone),department=VALUES(department),year=VALUES(year),campus_area=VALUES(campus_area),is_active=1`,
    [name,email,student,hash,phone,department,year,area]);
  const [[u]]=await db.query('SELECT id FROM users WHERE email=?',[email]);
  return u.id;
}

// Approximate campus coordinates (Nirma University, Ahmedabad) so "Find Near Me" has data to work with.
const CAMPUS={
  'Library Block':[23.12905,72.54480],
  'Central Library':[23.12890,72.54510],
  'CSE Building':[23.12840,72.54400],
  'Sports Ground':[23.12720,72.54620],
  'Sports Complex':[23.12740,72.54580],
  'Student Activity Centre':[23.12950,72.54560],
  'E Block Lab':[23.12800,72.54350],
  'E Block':[23.12810,72.54340],
  'Hostel Block D':[23.13010,72.54300],
  'Mechanical Workshop':[23.12690,72.54420],
  'Auditorium':[23.12960,72.54470]
};

async function ensureItem(db,ownerId,categoryId,name,description,location,from,to){
  const [lat,lng]=CAMPUS[location]||[null,null];
  const [[old]]=await db.query('SELECT id,latitude FROM items WHERE owner_id=? AND name=? LIMIT 1',[ownerId,name]);
  if(old){
    if(old.latitude==null&&lat!=null)await db.query('UPDATE items SET latitude=?,longitude=? WHERE id=?',[lat,lng,old.id]);
    return old.id;
  }
  const [r]=await db.query(`INSERT INTO items(owner_id,category_id,name,description,location,latitude,longitude,available_from,available_to,status)
    VALUES(?,?,?,?,?,?,?,?,?,'active')`,[ownerId,categoryId,name,description,location,lat,lng,from,to]);
  return r.insertId;
}

async function ensureRequest(db,{itemId,borrowerId,start,end,message,status,borrowedAt,returnedAt,completedAt}){
  const [[old]]=await db.query('SELECT id,status FROM borrow_requests WHERE item_id=? AND borrower_id=? AND message=? LIMIT 1',[itemId,borrowerId,message]);
  if(old)return old.id;
  const [r]=await db.query(`INSERT INTO borrow_requests(item_id,borrower_id,start_date,end_date,message,status,borrowed_at,returned_at,completed_at)
    VALUES(?,?,?,?,?,?,?,?,?)`,[itemId,borrowerId,start,end,message,status,borrowedAt||null,returnedAt||null,completedAt||null]);
  return r.insertId;
}

async function ensureEvents(db,requestId,states,actors){
  const [[c]]=await db.query('SELECT COUNT(*) n FROM request_events WHERE request_id=?',[requestId]);
  if(Number(c.n))return;
  for(let i=0;i<states.length;i++)await db.query('INSERT INTO request_events(request_id,status,actor_id) VALUES(?,?,?)',[requestId,states[i],actors[i]||null]);
}

module.exports=async function seedDemo(db){
  const hash=await bcrypt.hash('Borrow123',10);
  const userIds=[];
  for(const u of users)userIds.push(await ensureUser(db,u,hash));

  const [cats]=await db.query('SELECT id,name FROM categories');
  const categoryIds=Object.fromEntries(cats.map(c=>[c.name,c.id]));
  const itemIds=[];
  for(const [ownerIndex,category,name,description,location] of items){
    itemIds.push(await ensureItem(db,userIds[ownerIndex],categoryIds[category],name,description,location,date(-7),date(45)));
  }

  const demos=[
    {item:0,borrower:1,start:-22,end:-20,status:'completed',message:'[DEMO] Calculator for an exam practice session',borrowedAt:date(-22)+' 10:00:00',returnedAt:date(-20)+' 16:00:00',completedAt:date(-20)+' 17:00:00'},
    {item:3,borrower:2,start:-18,end:-16,status:'completed',message:'[DEMO] Cricket practice for inter-class match',borrowedAt:date(-18)+' 17:00:00',returnedAt:date(-16)+' 19:00:00',completedAt:date(-16)+' 20:00:00'},
    {item:6,borrower:4,start:-15,end:-14,status:'completed',message:'[DEMO] Multimeter for circuit testing',borrowedAt:date(-15)+' 11:00:00',returnedAt:date(-14)+' 15:00:00',completedAt:date(-14)+' 16:00:00'},
    {item:11,borrower:7,start:-12,end:-10,status:'completed',message:'[DEMO] Badminton games after classes',borrowedAt:date(-12)+' 17:00:00',returnedAt:date(-10)+' 19:00:00',completedAt:date(-10)+' 20:00:00'},
    {item:14,borrower:5,start:-9,end:-8,status:'completed',message:'[DEMO] Adapter for classroom presentation',borrowedAt:date(-9)+' 09:00:00',returnedAt:date(-8)+' 14:00:00',completedAt:date(-8)+' 15:00:00'},
    {item:18,borrower:8,start:-6,end:-5,status:'completed',message:'[DEMO] OS notes for revision',borrowedAt:date(-6)+' 12:00:00',returnedAt:date(-5)+' 18:00:00',completedAt:date(-5)+' 19:00:00'},
    {item:2,borrower:9,start:2,end:4,status:'requested',message:'[DEMO] Need the book for DSA revision'},
    {item:5,borrower:0,start:1,end:2,status:'requested',message:'[DEMO] Speaker for a club meeting'},
    {item:13,borrower:3,start:0,end:2,status:'accepted',message:'[DEMO] Extension board for project showcase'},
    {item:16,borrower:6,start:-1,end:1,status:'borrowed',message:'[DEMO] Fairy lights for a department event',borrowedAt:date(-1)+' 18:00:00'},
    {item:9,borrower:1,start:-2,end:0,status:'return_pending',message:'[DEMO] Screwdriver set for laptop maintenance',borrowedAt:date(-2)+' 14:00:00',returnedAt:date(0)+' 12:00:00'}
  ];

  const reqIds=[];
  for(const d of demos){
    const id=await ensureRequest(db,{itemId:itemIds[d.item],borrowerId:userIds[d.borrower],start:date(d.start),end:date(d.end),message:d.message,status:d.status,borrowedAt:d.borrowedAt,returnedAt:d.returnedAt,completedAt:d.completedAt});
    reqIds.push(id);
    const ownerIndex=items[d.item][0],owner=userIds[ownerIndex],borrower=userIds[d.borrower];
    const states=['requested'],actors=[borrower];
    if(['accepted','borrowed','return_pending','completed'].includes(d.status)){states.push('accepted');actors.push(owner)}
    if(['borrowed','return_pending','completed'].includes(d.status)){states.push('borrowed');actors.push(borrower)}
    if(['return_pending','completed'].includes(d.status)){states.push('return_pending');actors.push(borrower)}
    if(d.status==='completed'){states.push('completed');actors.push(owner)}
    await ensureEvents(db,id,states,actors);
  }

  const completed=demos.map((d,i)=>({d,i})).filter(x=>x.d.status==='completed');
  const comments=['Smooth exchange and very responsive.','Item was exactly as described.','Easy pickup and timely return.','Great campus borrowing experience.','Friendly and reliable borrower.','Would happily borrow or lend again.'];
  for(let k=0;k<completed.length;k++){
    const {d,i}=completed[k],requestId=reqIds[i],owner=userIds[items[d.item][0]],borrower=userIds[d.borrower];
    await db.query('INSERT IGNORE INTO reviews(request_id,reviewer_id,reviewee_id,rating,comment) VALUES(?,?,?,?,?)',[requestId,borrower,owner,k%3===0?4:5,comments[k]]);
    await db.query('INSERT IGNORE INTO reviews(request_id,reviewer_id,reviewee_id,rating,comment) VALUES(?,?,?,?,?)',[requestId,owner,borrower,5,comments[(k+2)%comments.length]]);
  }

  const wishes=[[0,4,0],[1,7,0],[2,10,1],[3,15,0],[4,19,0],[5,0,0],[6,2,0],[7,12,0],[8,5,0],[9,8,0]];
  for(const [u,item,notify] of wishes)await db.query('INSERT IGNORE INTO wishlist(user_id,item_id,notify) VALUES(?,?,?)',[userIds[u],itemIds[item],notify]);

  const notes=[
    [0,'welcome','Welcome to BorrowBox! Browse nearby campus items and start borrowing.',null,null],
    [1,'request_update','Your recent BorrowBox activity is ready to review.',reqIds[0],itemIds[0]],
    [3,'request_accepted','A demo borrowing request has been accepted.',reqIds[8],itemIds[13]],
    [6,'handover_confirmed','Handover confirmed for your current borrowed item.',reqIds[9],itemIds[16]],
    [2,'review_received','You received a new 5-star review.',reqIds[1],itemIds[3]]
  ];
  for(const [u,type,message,requestId,itemId] of notes){
    const [[exists]]=await db.query('SELECT id FROM notifications WHERE user_id=? AND type=? AND message=? LIMIT 1',[userIds[u],type,message]);
    if(!exists)await db.query('INSERT INTO notifications(user_id,type,message,request_id,item_id,is_read) VALUES(?,?,?,?,?,0)',[userIds[u],type,message,requestId,itemId]);
  }

  console.log('Demo data ready: 10 users, 20 listings and borrowing activity');
};
