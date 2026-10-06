const express=require('express');
const rateLimit=require('express-rate-limit');
const r=express.Router();
const limit=rateLimit({windowMs:60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});

// Turns coordinates into a short, human-readable place name using OpenStreetMap Nominatim.
// Always answers 200 with { name: string|null } so the client can fall back to raw coordinates.
r.get('/reverse',limit,async(req,res)=>{
  const lat=Number(req.query.lat),lng=Number(req.query.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid coordinates'});
  try{
    const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`;
    const x=await fetch(url,{headers:{'User-Agent':'BorrowBox/1.0 (campus borrowing app)','Accept-Language':'en'},signal:AbortSignal.timeout(4000)});
    if(!x.ok)return res.json({name:null});
    const d=await x.json();
    const a=d.address||{};
    const parts=[d.name&&d.name!==a.road?d.name:'',a.road,a.neighbourhood||a.suburb||a.village||a.town||a.city].filter(Boolean);
    const name=[...new Set(parts)].join(', ').slice(0,100)||String(d.display_name||'').split(',').slice(0,3).join(',').trim().slice(0,100)||null;
    res.json({name});
  }catch{res.json({name:null})}
});
module.exports=r;
