import express from "express"
import pool from "./connection.js"
import cors from "cors"
import bcrypt from "bcryptjs";


const app  = express();
app.use(cors());

app.use(express.json());

app.get("/hello",(req,res) => {
    res.send("Hello World");
});


const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'railway' // เปลี่ยนเป็นชื่อฐานข้อมูลของคุณ
};

// ==========================================
// ส่วนที่ 1: ระบบสมาชิก (User)
// ==========================================

app.post('/register', async (req, res) => {
    const { user_id, username, password } = req.body;
    if (!user_id || !username || !password) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    try {
        const sql = "INSERT INTO user (user_id, username, password) VALUES (?, ?, ?)";
        await pool.query(sql, [user_id, username, password]);
        return res.status(200).json({ message: "สมัครสมาชิกสำเร็จ" });
    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ message: "ไม่สามารถสมัครสมาชิกได้", errorDetail: error.message });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "กรุณากรอก Username และ Password" });
    }
    try {
        const sql = "SELECT * FROM user WHERE username = ? AND password = ?";
        const result = await pool.query(sql, [username, password]);
        const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

        if (rows && rows.length > 0) {
            return res.status(200).json({ message: "ล็อกอินสำเร็จ!", user: rows[0] });
        } else {
            return res.status(401).json({ message: "Username หรือ Password ไม่ถูกต้อง" });
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "ระบบล็อกอินมีปัญหา", errorDetail: error.message });
    }
});

// ==========================================
// ส่วนที่ 2: จัดการข้อมูลลูกค้า (Customer)
// ==========================================

// ตรวจสอบว่า User นี้เคยกรอกข้อมูลลูกค้าหรือยัง
// ถ้าเคยกรอกแล้ว → ส่งข้อมูลเดิมกลับไปให้หน้าเว็บ pre-fill ในฟอร์มทันที
app.get('/check-customer/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const sql = "SELECT * FROM customer WHERE user_id = ?";
        const result = await pool.query(sql, [userId]);
        const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

        if (rows && rows.length > 0) {
            return res.status(200).json({ 
                exists: true, 
                customer: rows[0]
            });
        } else {
            return res.status(200).json({ exists: false });
        }
    } catch (error) {
        console.error("Check Customer Error:", error);
        return res.status(500).json({ message: "ระบบมีปัญหา", errorDetail: error.message });
    }
});

// บันทึก/อัปเดตข้อมูลลูกค้า
// ถ้า User_id นี้มีข้อมูลอยู่แล้ว → UPDATE แทนที่ข้อมูลเดิม
// ถ้ายังไม่มี → INSERT ใหม่
app.post('/save-customer', async (req, res) => {
    const { customer_id, full_name, phone, user_id } = req.body;

    if (!full_name || !phone || !user_id) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    try {
        const checkSql = "SELECT * FROM customer WHERE user_id = ?";
        const result = await pool.query(checkSql, [user_id]);
        const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

        if (rows && rows.length > 0) {
            // มีอยู่แล้ว → UPDATE
            const updateSql = `UPDATE customer SET full_name = ?, phone = ? WHERE user_id = ?`;
            await pool.query(updateSql, [full_name, phone, user_id]);
            return res.status(200).json({ message: "อัปเดตข้อมูลลูกค้าสำเร็จ" });
        } else {
            // ยังไม่มี → INSERT
            const insertSql = `INSERT INTO customer (customer_id, full_name, phone, user_id) VALUES (?, ?, ?, ?)`;
            await pool.query(insertSql, [customer_id, full_name, phone, user_id]);
            return res.status(200).json({ message: "บันทึกข้อมูลลูกค้าสำเร็จ" });
        }

    } catch (error) {
        console.error("Save Customer Error:", error);
        return res.status(500).json({ message: "บันทึกไม่สำเร็จ", errorDetail: error.message });
    }
});

app.get("/all-customer", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM customer");
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

// ==========================================
// ส่วนที่ 3: ดึงข้อมูลสินค้าและหมวดหมู่
// ==========================================

app.get("/all-category", async (req, res) => {
    try {
        const rows = await pool.query("SELECT * FROM category");
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

app.get("/all-equipment", async (req, res) => {
    try {
        const rows = await pool.query("SELECT * FROM equipment");
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

app.get("/equipment/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM equipment WHERE equipment_id = ?", [req.params.id]);
        if (rows.length > 0) return res.json(rows[0]);
        return res.status(404).json({ message: "ไม่พบสินค้านี้" });
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

// ==========================================
// ส่วนที่ 4: ระบบเช่าและชำระเงิน
// ==========================================

app.post("/add-rental", async (req, res) => {
    const { rental_id, order_date, total_amount, total_deposit, payment_status, customer_id } = req.body;
    try {
        const sql = `INSERT INTO rental (rental_id, order_date, total_amount, total_deposit, payment_status, customer_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [rental_id, order_date, total_amount, total_deposit, payment_status, customer_id]);
        return res.status(200).json({ message: "สร้างใบสั่งเช่าสำเร็จ!", rental_id: rental_id });
    } catch (error) {
        console.error("Add Rental Error:", error);
        return res.status(500).json({ message: "สร้างใบสั่งเช่าไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-rental-detail", async (req, res) => {
    const { rentaldetail_id, start_date, end_date, rental_id, equipment_id } = req.body;
    try {
        const sql = `INSERT INTO rental_detail (rentaldetail_id, start_date, end_date, rental_id, equipment_id) 
                     VALUES (?, ?, ?, ?, ?)`;
        await pool.query(sql, [rentaldetail_id, start_date, end_date, rental_id, equipment_id]);
        return res.status(200).json({ message: "บันทึกรายละเอียดการเช่าสำเร็จ!" });
    } catch (error) {
        console.error("Add Rental Detail Error:", error);
        return res.status(500).json({ message: "บันทึกรายละเอียดไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-payment", async (req, res) => {
    const { payment_id, payment_date, payment_amount, payment_method, payment_proof, rental_id } = req.body;
    try {
        const sql = `INSERT INTO payment (payment_id, payment_date, payment_amount, payment_method, payment_proof, rental_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        const proof = payment_proof === "NULL" ? null : payment_proof;
        await pool.query(sql, [payment_id, payment_date, payment_amount, payment_method, proof, rental_id]);
        return res.status(200).json({ message: "บันทึกการชำระเงินสำเร็จ!" });
    } catch (error) {
        console.error("Add Payment Error:", error);
        return res.status(500).json({ message: "บันทึกไม่สำเร็จ", errorDetail: error.message });
    }
});

// ==========================================
// ดักจับ API ที่ไม่มีอยู่จริง
// ==========================================
app.use((req, res) => {
    console.log(`⚠️ ไม่พบ API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        message: "ไม่พบ API นี้ในระบบ", 
        suggestion: `ตรวจสอบ URL ${req.originalUrl} ในไฟล์ HTML อีกครั้ง`
    });
});

//get => fecth data(query,params)
//post => add data(body)
//put => edit data(body)
//delete => delete data(query,params)
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

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-customer",async(req,res) =>{
    try {
        const {customer_id,full_name,phone,identity_proof} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO customer (customer_id,full_name,phone,identity_proof)
            VALUE(?,?,?,?)
            `,[customer_id,full_name,phone,identity_proof]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-equipment",async(req,res) =>{
    try {
        const {equipment_id,brand,model,Serial_number,daily_rate,deposit_fee,equipment_status,Condition_,category_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO equipment (equipment_id,brand,model,Serial_number,daily_rate,deposit_fee,equipment_status,Condition_,category_id)
            VALUES(?,?,?,?,?,?,?,?,?)
            `,[equipment_id,brand,model,Serial_number,daily_rate,deposit_fee,equipment_status,Condition_,category_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-payment",async(req,res) =>{
    try {
        const {payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO payment (payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id)
            VALUE(?,?,?,?,?,?)
            `,[payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-rental",async(req,res) =>{
    try {
        const {rental_id,order_date,total_amount,total_deposit,payment_status,customer_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO rental (rental_id,order_date,total_amount,total_deposit,payment_status,customer_id)
            VALUE(?,?,?,?,?,?)
            `,[rental_id,order_date,total_amount,total_deposit,payment_status,customer_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-rental_detail",async(req,res) =>{
    try {
        const {rentaldetail_id,start_date,end_date,actual_return_date,fine_amount,condition_note,rental_id,equipment_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO rental_detail (rentaldetail_id,start_date,end_date,actual_return_date,fine_amount,condition_note,rental_id,equipment_id)
            VALUE(?,?,?,?,?,?,?,?)
            `,[rentaldetail_id,start_date,end_date,actual_return_date,fine_amount,condition_note,rental_id,equipment_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.put("/edit-category",async(req,res)=>{
    try {
        const {category_id,category_name} = req.body;

        const updateResult = await pool.query(
            `UPDATE category SET category_name = ?
            WHERE category_id = ?
            `,[category_name,category_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-customer",async(req,res)=>{
    try {
        const {customer_id,full_name,phone,identity_proof} = req.body;

        const updateResult = await pool.query(
            `UPDATE customer SET full_name = ?,phone = ?,identity_proof = ?
            WHERE customer_id = ?
            `,[full_name,phone,identity_proof,customer_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-customer",async(req,res)=>{
    try {
        const {customer_id,full_name,phone,identity_proof} = req.body;

        const updateResult = await pool.query(
            `UPDATE customer SET full_name = ?,phone = ?,identity_proof = ?
            WHERE customer_id = ?
            `,[full_name,phone,identity_proof,customer_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-equipment",async(req,res)=>{
    try {
        const {equipment_id,brand,model,Serial_number,daily_rate,deposit_fee,equipment_status,Condition_,category_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE equipment SET brand = ?,model = ?,Serial_number = ?,daily_rate = ?,deposit_fee = ?,equipment_status = ?,Condition_ = ?,category_id = ?
            WHERE equipment_id = ?
            `,[brand,model,Serial_number,daily_rate,deposit_fee,equipment_status,Condition_,category_id,equipment_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-payment",async(req,res)=>{
    try {
        const {payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE payment SET payment_date = ?,payment_amount = ?,payment_method = ?,payment_proof = ?,rental_id = ?
            WHERE payment_id = ?
            `,[payment_date,payment_amount,payment_method,payment_proof,rental_id,payment_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-rental",async(req,res)=>{
    try {
        const {rental_id,order_date,total_amount,total_deposit,payment_status,customer_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE rental SET order_date = ?,total_amount = ?,total_deposit = ?,payment_status = ?,customer_id = ?
            WHERE rental_id = ?
            `,[order_date,total_amount,total_deposit,payment_status,customer_id,rental_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-rental_detail",async(req,res)=>{
    try {
        const {rentaldetail_id,start_date,end_date,actual_return_date,fine_amount,condition_note,rental_id,equipment_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE rental_detail SET start_date = ?,end_date = ?,actual_return_date = ?,fine_amount = ?,condition_note = ?,rental_id =?,equipment_id =?
            WHERE rentaldetail_id = ?
            `,[start_date,end_date,actual_return_date,fine_amount,condition_note,rental_id,equipment_id,rentaldetail_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.delete("/delete-category", async (req, res) => {
    try {
        // Fix 1: Added { } to pull the exact string/number out of the object
        const { category_id } = req.query;

        // Fix 2: Added [ ] to get the database result, not the array!
        const deletetedResult = await pool.query(
            `DELETE FROM category 
             WHERE category_id = ?
            `, [category_id]
        )

        if (deletetedResult?.affectedRows === 0) {
            throw new Error("delete error");
        }

        return res.status(200).send({ message: "success" });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
});

const PORT = process.env.PORT || 3000
app.listen(PORT,()=>{
    console.log('The server is running on 3000');
});