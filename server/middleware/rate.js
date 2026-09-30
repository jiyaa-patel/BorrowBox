const rateLimit=require('express-rate-limit');
const authLimit=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-8',legacyHeaders:false});
const handoverLimit=rateLimit({windowMs:60*1000,limit:10,standardHeaders:'draft-8',legacyHeaders:false});
module.exports={authLimit,handoverLimit};
