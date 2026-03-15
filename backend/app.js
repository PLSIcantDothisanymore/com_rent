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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 The server is running on port ${PORT}`);
});