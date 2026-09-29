const mysql=require('mysql2/promise');
const pool=mysql.createPool({host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,dateStrings:true,waitForConnections:true,connectionLimit:10,ssl:process.env.DB_SSL==='true'?{}:undefined});
module.exports=pool;
