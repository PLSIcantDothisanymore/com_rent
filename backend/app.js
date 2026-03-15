import express from "express";
import pool from "./connection.js";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/check-Customer/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const sql = "SELECT * FROM customer WHERE user_id = ?";
        const result = await pool.query(sql, [userId]);
        const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

        if (rows && rows.length > 0) {
            return res.status(200).json({ 
                exists: true, 
                Customer: rows[0]
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
app.post('/save-Customer', async (req, res) => {
    const { cust_id, cust_name, cust_phone, user_id } = req.body;

    if (!cust_name || !cust_phone || !user_id) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    try {
        const checkSql = "SELECT * FROM customer WHERE user_id = ?";
        const result = await pool.query(checkSql, [user_id]);
        const rows = (Array.isArray(result) && Array.isArray(result[0])) ? result[0] : result;

        if (rows && rows.length > 0) {
            // มีอยู่แล้ว → UPDATE
            const updateSql = `UPDATE customer SET cust_name = ?, cust_phone = ? WHERE user_id = ?`;
            await pool.query(updateSql, [cust_name, cust_phone, user_id]);
            return res.status(200).json({ message: "อัปเดตข้อมูลลูกค้าสำเร็จ" });
        } else {
            // ยังไม่มี → INSERT
            const insertSql = `INSERT INTO customer (cust_id, cust_name, cust_phone, user_id) VALUES (?, ?, ?, ?)`;
            await pool.query(insertSql, [cust_id, cust_name, cust_phone, user_id]);
            return res.status(200).json({ message: "บันทึกข้อมูลลูกค้าสำเร็จ" });
        }

    } catch (error) {
        console.error("Save Customer Error:", error);
        return res.status(500).json({ message: "บันทึกไม่สำเร็จ", errorDetail: error.message });
    }
});

app.get("/all-Customer", async (req, res) => {
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

app.get("/all-Categories", async (req, res) => {
    try {
        const rows = await pool.query("SELECT * FROM category");
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

app.get("/all-Equipments", async (req, res) => {
    try {
        const rows = await pool.query("SELECT * FROM equipment");
        return res.json(rows);
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

app.get("/Equipments/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM equipment WHERE equip_id = ?", [req.params.id]);
        if (rows.length > 0) return res.json(rows[0]);
        return res.status(404).json({ message: "ไม่พบสินค้านี้" });
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

// ==========================================
// ส่วนที่ 4: ระบบเช่าและชำระเงิน
// ==========================================

app.post("/add-Rentals", async (req, res) => {
    const { rental_id, rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id } = req.body;
    try {
        const sql = `INSERT INTO rental (rental_id, rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [rental_id, rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id]);
        return res.status(200).json({ message: "สร้างใบสั่งเช่าสำเร็จ!", rental_id: rental_id });
    } catch (error) {
        console.error("Add Rental Error:", error);
        return res.status(500).json({ message: "สร้างใบสั่งเช่าไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-Rentals-detail", async (req, res) => {
    const { rd_id, rd_start_date, rd_end_date, rental_id, equip_id } = req.body;
    try {
        const sql = `INSERT INTO rental_detail (rd_id, rd_start_date, rd_end_date, rental_id, equip_id) 
                     VALUES (?, ?, ?, ?, ?)`;
        await pool.query(sql, [rd_id, rd_start_date, rd_end_date, rental_id, equip_id]);
        return res.status(200).json({ message: "บันทึกรายละเอียดการเช่าสำเร็จ!" });
    } catch (error) {
        console.error("Add Rental Detail Error:", error);
        return res.status(500).json({ message: "บันทึกรายละเอียดไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-Payments", async (req, res) => {
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
app.get("/all-Categories", async (req, res) => {
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

app.get("/all-Customer", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM Customer");
        
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

app.get("/all-Equipments", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM Equipments");
        
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

app.get("/all-Payments", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM Payments");
        
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

app.get("/all-Rentals", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM Rentals");
        
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


app.get("/all-Rental_details", async (req, res) => {
    try {
        // ดึงมาเฉพาะข้อมูล (rows) เพื่อไม่ให้ข้อมูลขยะติดมาด้วย
        const rows = await pool.query("SELECT * FROM Rental_details");
        
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

app.post("/add-Categories",async(req,res) =>{
    try {
        const {category_id,category_name} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Categories (category_id,category_name)
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

app.post("/add-Customer",async(req,res) =>{
    try {
        const {cust_id,cust_name,cust_phone,identity_proof} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Customer (cust_id,cust_name,cust_phone,identity_proof)
            VALUE(?,?,?,?)
            `,[cust_id,cust_name,cust_phone,identity_proof]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-Equipments",async(req,res) =>{
    try {
        const {equip_id,equip_brand,equip_model,Serial_number,equip_rate,deposit_fee,equipment_status,Condition_,category_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Equipments (equip_id,equip_brand,equip_model,Serial_number,equip_rate,deposit_fee,equipment_status,Condition_,category_id)
            VALUES(?,?,?,?,?,?,?,?,?)
            `,[equip_id,equip_brand,equip_model,Serial_number,equip_rate,deposit_fee,equipment_status,Condition_,category_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-Payments",async(req,res) =>{
    try {
        const {payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Payments (payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id)
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

app.post("/add-Rentals",async(req,res) =>{
    try {
        const {rental_id,rental_order_date,rental_total_amount,rental_total_deposit,rental_payment_status,cust_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Rentals (rental_id,rental_order_date,rental_total_amount,rental_total_deposit,rental_payment_status,cust_id)
            VALUE(?,?,?,?,?,?)
            `,[rental_id,rental_order_date,rental_total_amount,rental_total_deposit,rental_payment_status,cust_id]
        )
        db.query(sql, [values], (err, dbResult) => {
        if (err) return res.status(500).json({ errorDetail: err.message });
        
        // ส่ง ID ที่เพิ่งถูก Auto-increment กลับไปให้ Frontend
        res.status(200).json({ 
            message: "Success", 
            rental_id: dbResult.insertId // dbResult.insertId คือ ID ล่าสุดที่เพิ่งถูกสร้าง
        }); 
    }); 

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.post("/add-Rental_details",async(req,res) =>{
    try {
        const {rd_id,rd_start_date,rd_end_date,rd_actual_return_date,rd_fine_amount,rd_condition_note,rental_id,equip_id} = req.body;

        const insertedresult = await pool.query(
            `INSERT INTO Rental_details (rd_id,rd_start_date,rd_end_date,rd_actual_return_date,rd_fine_amount,rd_condition_note,rental_id,equip_id)
            VALUE(?,?,?,?,?,?,?,?)
            `,[rd_id,rd_start_date,rd_end_date,rd_actual_return_date,rd_fine_amount,rd_condition_note,rental_id,equip_id]
        )

        if(insertedresult?.affectedRows === 0){
            throw new Error("insert error");
        }

        return res.status(201).send({message: "success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
});

app.put("/edit-Categories",async(req,res)=>{
    try {
        const {category_id,category_name} = req.body;

        const updateResult = await pool.query(
            `UPDATE Categories SET category_name = ?
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

app.put("/edit-Customer",async(req,res)=>{
    try {
        const {cust_id,cust_name,cust_phone,identity_proof} = req.body;

        const updateResult = await pool.query(
            `UPDATE Customer SET cust_name = ?,cust_phone = ?,identity_proof = ?
            WHERE cust_id = ?
            `,[cust_name,cust_phone,identity_proof,cust_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-Customer",async(req,res)=>{
    try {
        const {cust_id,cust_name,cust_phone,identity_proof} = req.body;

        const updateResult = await pool.query(
            `UPDATE Customer SET cust_name = ?,cust_phone = ?,identity_proof = ?
            WHERE cust_id = ?
            `,[cust_name,cust_phone,identity_proof,cust_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-Equipments",async(req,res)=>{
    try {
        const {equip_id,equip_brand,equip_model,Serial_number,equip_rate,deposit_fee,equipment_status,Condition_,category_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE Equipments SET equip_brand = ?,equip_model = ?,Serial_number = ?,equip_rate = ?,deposit_fee = ?,equipment_status = ?,Condition_ = ?,category_id = ?
            WHERE equip_id = ?
            `,[equip_brand,equip_model,Serial_number,equip_rate,deposit_fee,equipment_status,Condition_,category_id,equip_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-Payments",async(req,res)=>{
    try {
        const {payment_id,payment_date,payment_amount,payment_method,payment_proof,rental_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE Payments SET payment_date = ?,payment_amount = ?,payment_method = ?,payment_proof = ?,rental_id = ?
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

app.put("/edit-Rentals",async(req,res)=>{
    try {
        const {rental_id,rental_order_date,rental_total_amount,rental_total_deposit,rental_payment_status,cust_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE Rentals SET rental_order_date = ?,rental_total_amount = ?,rental_total_deposit = ?,rental_payment_status = ?,cust_id = ?
            WHERE rental_id = ?
            `,[rental_order_date,rental_total_amount,rental_total_deposit,rental_payment_status,cust_id,rental_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.put("/edit-Rental_details",async(req,res)=>{
    try {
        const {rd_id,rd_start_date,rd_end_date,rd_actual_return_date,rd_fine_amount,rd_condition_note,rental_id,equip_id} = req.body;

        const updateResult = await pool.query(
            `UPDATE Rental_details SET rd_start_date = ?,rd_end_date = ?,rd_actual_return_date = ?,rd_fine_amount = ?,rd_condition_note = ?,rental_id =?,equip_id =?
            WHERE rd_id = ?
            `,[rd_start_date,rd_end_date,rd_actual_return_date,rd_fine_amount,rd_condition_note,rental_id,equip_id,rd_id]
        )
        if(updateResult?.affectedRows === 0){
            throw new Error("update error");
        }

        return res.status(200).send({message:"success"});
    } catch (error) {
        return res.status(500).send({message: error.message});
    }
})

app.delete("/delete-Categories", async (req, res) => {
    try {
        // Fix 1: Added { } to pull the exact string/number out of the object
        const { category_id } = req.query;

        // Fix 2: Added [ ] to get the database result, not the array!
        const deletetedResult = await pool.query(
            `DELETE FROM Categories 
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 The server is running on port ${PORT}`);
});