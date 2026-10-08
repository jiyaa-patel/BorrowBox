const path=require('path');
const express=require('express');
const helmet=require('helmet');
const app=express();
// Behind Vercel's proxy: use the real client IP (X-Forwarded-For) so rate limits apply per user, not to all users at once.
app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:'50kb'}));
// Used by `npm start` locally. On Vercel this line is ignored and the CDN serves the public/ folder instead.
app.use(express.static(path.join(__dirname,'..','public')));
app.get('/api/health',(req,res)=>res.json({ok:true}));
app.use('/api/auth',require('./routes/auth'));
app.use('/api/geo',require('./routes/geo'));
app.use('/api',require('./routes/public'));
app.use('/api/items',require('./routes/items'));
app.use('/api/requests',require('./routes/requests'));
app.use('/api/wishlist',require('./routes/wishlist'));
app.use('/api/reviews',require('./routes/reviews'));
app.use('/api/users',require('./routes/users'));
app.use('/api/notifications',require('./routes/notifications'));
app.use('/api/me',require('./routes/me'));
app.use('/api/admin',require('./routes/admin'));
app.use('/api',(req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,req,res,next)=>{
  if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON body'});
  if(err.type==='entity.too.large')return res.status(413).json({error:'Request body too large'});
  console.error(err);
  res.status(500).json({error:'Internal server error'});
});
module.exports=app;
