import express from "express"
import pool from "./connection.js"
import cors from "cors"

const app  = express();
app.use(cors());

app.use(express.json());

app.get("/hello",(req,res) => {
    res.send("Hello World");
});


//get => fecth data
//post => add data(body)
//put => edit data(body)
//delete => delete data
app.get("/all-category", async (req, res) => {
    try {
        // Grab the whole list of rows
        const rows = await pool.query("SELECT * FROM category");
        
        // Send the ENTIRE array (rows), not just the first one (rows[0])
        return res.json(rows); 
        
    } catch (error) {
        console.error("Database error:", error);
        return res.status(500).json({ error: "Failed to fetch categories" });
    }
});

app.get("/all-customer", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM customer");
        
        // ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return res.json(rows);
        
    } catch (error) {
        // ถ้าพัง (เช่น ดาต้าเบสล่ม, หรือยังไม่ได้สร้างตาราง) มันจะเด้งมาตรงนี้ทันที!
        console.error("เกิดข้อผิดพลาด:", error);
        
        // ส่งข้อความกลับไปหา Postman ทันที จะได้ไม่ต้องรอนาน
        return res.status(500).json({ 
            message: "ต่อดาต้าเบสไม่สำเร็จ หรือมีบางอย่างผิดพลาด", 
            errorDetail: error.message 
        });
    }
});

app.get("/all-equipment", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM equipment");
        
        // ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return res.json(rows);
        
    } catch (error) {
        // ถ้าพัง (เช่น ดาต้าเบสล่ม, หรือยังไม่ได้สร้างตาราง) มันจะเด้งมาตรงนี้ทันที!
        console.error("เกิดข้อผิดพลาด:", error);
        
        // ส่งข้อความกลับไปหา Postman ทันที จะได้ไม่ต้องรอนาน
        return res.status(500).json({ 
            message: "ต่อดาต้าเบสไม่สำเร็จ หรือมีบางอย่างผิดพลาด", 
            errorDetail: error.message 
        });
    }
});

app.get("/all-payment", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM payment");
        
        // ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return res.json(rows);
        
    } catch (error) {
        // ถ้าพัง (เช่น ดาต้าเบสล่ม, หรือยังไม่ได้สร้างตาราง) มันจะเด้งมาตรงนี้ทันที!
        console.error("เกิดข้อผิดพลาด:", error);
        
        // ส่งข้อความกลับไปหา Postman ทันที จะได้ไม่ต้องรอนาน
        return res.status(500).json({ 
            message: "ต่อดาต้าเบสไม่สำเร็จ หรือมีบางอย่างผิดพลาด", 
            errorDetail: error.message 
        });
    }
});

app.get("/all-rental", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM rental");
        
        // ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return res.json(rows);
        
    } catch (error) {
        // ถ้าพัง (เช่น ดาต้าเบสล่ม, หรือยังไม่ได้สร้างตาราง) มันจะเด้งมาตรงนี้ทันที!
        console.error("เกิดข้อผิดพลาด:", error);
        
        // ส่งข้อความกลับไปหา Postman ทันที จะได้ไม่ต้องรอนาน
        return res.status(500).json({ 
            message: "ต่อดาต้าเบสไม่สำเร็จ หรือมีบางอย่างผิดพลาด", 
            errorDetail: error.message 
        });
    }
});


app.get("/all-rental_detail", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM rental_detail");
        
        // ถ้าสำเร็จ ให้ส่งข้อมูลกลับไป
        return res.json(rows);
        
    } catch (error) {
        // ถ้าพัง (เช่น ดาต้าเบสล่ม, หรือยังไม่ได้สร้างตาราง) มันจะเด้งมาตรงนี้ทันที!
        console.error("เกิดข้อผิดพลาด:", error);
        
        // ส่งข้อความกลับไปหา Postman ทันที จะได้ไม่ต้องรอนาน
        return res.status(500).json({ 
            message: "ต่อดาต้าเบสไม่สำเร็จ หรือมีบางอย่างผิดพลาด", 
            errorDetail: error.message 
        });
    }
});

app.post("/add-category",async(req,res) =>{
    try {
        const {category_id,category_name} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO category (category_id,category_name)
            VALUE(?,?)
            `,[category_id,category_name]
        )

        console.log("insertedResult:",insertedresult);

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});



const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log('The server is running on 3000');
});
