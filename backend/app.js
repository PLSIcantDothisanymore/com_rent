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
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }
    try {
        const sql = "INSERT INTO user (username, password) VALUES (?, ?)";
        await pool.query(sql, [username, password]);
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
// ส่วนที่ 2: จัดการข้อมูลลูกค้า (customer)
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
        console.error("Check customer Error:", error);
        return res.status(500).json({ message: "ระบบมีปัญหา", errorDetail: error.message });
    }
});

// บันทึก/อัปเดตข้อมูลลูกค้า
// ถ้า User_id นี้มีข้อมูลอยู่แล้ว → UPDATE แทนที่ข้อมูลเดิม
// ถ้ายังไม่มี → INSERT ใหม่
app.post('/save-customer', async (req, res) => {
    const { cust_name, cust_phone, user_id } = req.body;

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
            
            // Return the existing cust_id
            return res.status(200).json({ 
                message: "อัปเดตข้อมูลลูกค้าสำเร็จ", 
                cust_id: rows[0].cust_id 
            });
        } else {
            // ยังไม่มี → INSERT
            const insertSql = `INSERT INTO customer (cust_name, cust_phone, user_id) VALUES (?, ?, ?)`;
            const insertResult = await pool.query(insertSql, [cust_name, cust_phone, user_id]);
            
            const newCustId = insertResult.insertId || (Array.isArray(insertResult) && insertResult[0] && insertResult[0].insertId);

            // Return the new auto-incremented cust_id
            return res.status(200).json({ 
                message: "บันทึกข้อมูลลูกค้าสำเร็จ", 
                cust_id: newCustId 
            });
        }

    } catch (error) {
        console.error("Save customer Error:", error);
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

app.get('/all-equipment', async (req, res) => {
    try {
        // ใช้ JOIN เพื่อดึง category_name จากตาราง Categories มาด้วย
        const sql = `
            SELECT e.*, c.category_name 
            FROM Equipments e
            LEFT JOIN category c ON e.category_id = c.category_id
        `;
        
        const [rows] = await pool.query(sql); 

        return res.status(200).json(rows);

    } catch (error) {
        console.error("Error fetching equipment:", error);
        return res.status(500).json({ 
            message: "ไม่สามารถดึงข้อมูลอุปกรณ์ได้", 
            errorDetail: error.message 
        });
    }
});

app.get("/equipment/:id", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM equipment WHERE equip_id = ?", [req.params.id]);
        if (rows.length > 0) return res.json(rows[0]);
        return res.status(404).json({ message: "ไม่พบสินค้านี้" });
    } catch (error) {
        return res.status(500).json({ message: "Error", errorDetail: error.message });
    }
});

app.post("/add-equipment", async (req, res) => {
    const { equip_brand, equip_model, equip_rate, Serial_number, category_id, equipment_status, deposit_fee, Condition_ } = req.body;
    try {
        const sql = `INSERT INTO equipment (equip_brand, equip_model, equip_rate, Serial_number, category_id, equipment_status, deposit_fee, Condition_) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [equip_brand, equip_model, equip_rate, Serial_number, category_id, equipment_status, deposit_fee, Condition_]);
        return res.status(200).json({ message: "เพิ่มอุปกรณ์สำเร็จ!" });
    } catch (error) {
        console.error("Add equipment Error:", error);
        return res.status(500).json({ message: "เพิ่มอุปกรณ์ไม่สำเร็จ", errorDetail: error.message });
    }
});

// ==========================================
// ส่วนที่ 4: ระบบเช่าและชำระเงิน
// ==========================================

app.post("/add-rental", async (req, res) => {
    const { rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id } = req.body;
    try {
        const sql = `INSERT INTO rental (rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id) VALUES (?, ?, ?, ?, ?)`;
        const result = await pool.query(sql, [rental_order_date, rental_total_amount, rental_total_deposit, rental_payment_status, cust_id]);
        
        // mysql2 might return [ResultSetHeader, undefined] or just ResultSetHeader depending on promisify
        let newId = result.insertId;
        if (newId === undefined && Array.isArray(result) && result[0]) {
            newId = result[0].insertId;
        }
        
        if (newId === undefined || newId === null) {
            console.error("Failed to get insertId. Result:", result);
            return res.status(500).json({ message: "ไม่สามารถดึงรหัสการเช่าใหม่ได้", result: result });
        }

        console.log("New Rental ID created:", newId);
        return res.status(200).json({ message: "สร้างใบสั่งเช่าสำเร็จ!", rental_id: newId });
    } catch (error) {
        console.error("Add rental Error:", error);
        return res.status(500).json({ message: "สร้างใบสั่งเช่าไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-rental-detail", async (req, res) => {
    const { rd_start_date, rd_end_date, rental_id, equip_id } = req.body;
    try {
        const sql = `INSERT INTO rental_detail (rd_start_date, rd_end_date, rental_id, equip_id) VALUES (?, ?, ?, ?)`;
        await pool.query(sql, [rd_start_date, rd_end_date, rental_id, equip_id]);
        return res.status(200).json({ message: "บันทึกรายละเอียดการเช่าสำเร็จ!" });
    } catch (error) {
        console.error("Add rental Detail Error:", error);
        return res.status(500).json({ message: "บันทึกรายละเอียดไม่สำเร็จ", errorDetail: error.message });
    }
});

app.post("/add-payment", async (req, res) => {
    const { payment_date, payment_amount, payment_method, payment_proof, rental_id } = req.body;
    try {
        const sql = `INSERT INTO payment (payment_date, payment_amount, payment_method, payment_proof, rental_id) VALUES (?, ?, ?, ?, ?)`;
        const proof = payment_proof === "NULL" ? null : payment_proof;
        await pool.query(sql, [payment_date, payment_amount, payment_method, proof, rental_id]);
        return res.status(200).json({ message: "บันทึกการชำระเงินสำเร็จ!" });
    } catch (error) {
        console.error("Add payment Error:", error);
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
