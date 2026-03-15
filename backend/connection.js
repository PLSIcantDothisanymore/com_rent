import util from "util"
import mysql from 'mysql2'
import "dotenv/config";


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, // 👈 Now it pulls the secret password!
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.getConnection((err,connection) => {
    if(err){
        console.error("cannot connect to database: ",err)
    };

    if(connection){
        connection.release();
    };

    return;
});

pool.query = util.promisify(pool.query);

export default pool;