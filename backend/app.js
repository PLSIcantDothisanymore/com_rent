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
// 1. API สมัครสมาชิก (Register) - ฉบับสมบูรณ์
// ==========================================
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    // เช็คว่ากรอกข้อมูลครบไหม
    if (!email || !password || !name) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    let connection; 
    try {
        connection = await pool.promise().getConnection(); 
        await connection.beginTransaction();

        // 1. เช็คว่ามีอีเมลนี้หรือยังในตาราง user
        const [existingUsers] = await connection.execute('SELECT * FROM user WHERE Username = ?', [email]);
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        // 2. เข้ารหัสผ่าน
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. บันทึกลงตาราง user
        const [userResult] = await connection.execute(
            'INSERT INTO user (Username, Password, Role) VALUES (?, ?, ?)',
            [email, hashedPassword, 'customer']
        );
        // ดึง ID ของ user ที่เพิ่งสร้างมาเก็บไว้ในตัวแปร newUserId
        const newUserId = userResult.insertId; 

        // 4. สุ่มรหัสลูกค้า 10 หลัก สำหรับตาราง customer
        const randomCustomerId = Math.floor(1000000000 + Math.random() * 9000000000);

        // 5. บันทึกลงตาราง customer
        await connection.execute(
            'INSERT INTO customer (customer_id, User_ID, full_name) VALUES (?, ?, ?)',
            [randomCustomerId, newUserId, name]
        );

        // สำเร็จ! บันทึกข้อมูลลงฐานข้อมูลจริงๆ
        await connection.commit();
        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ!' });

    } catch (error) {
        if (connection) await connection.rollback(); // ถ้ามี Error ให้ยกเลิกการบันทึกข้อมูล
        console.error('Register Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
    } finally {
        if (connection) connection.release(); // คืนการเชื่อมต่อให้ระบบ
    }
});


// ==========================================
// 2. API เข้าสู่ระบบ (Login)
// ==========================================
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    try {
        // 💡 1. เปลี่ยนคอลัมน์ username เป็นตัวเล็ก
        const [users] = await pool.promise().execute('SELECT * FROM user WHERE username = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        const user = users[0];

        // 💡 2. เปลี่ยน user.Password เป็น user.password (ตัว p เล็ก)
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        res.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                // 💡 3. เปลี่ยนชื่อคอลัมน์ให้เป็นตัวเล็กทั้งหมด
                id: user.user_id,        
                username: user.username,  
                role: user.role           
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
    }
});


// ============================================
// ส่วนของ Route /confirm-rental ที่แก้ไขแล้ว
// ============================================
// นำโค้ดนี้ไปแทนที่ส่วน app.post("/confirm-rental", ...) ในไฟล์ app.js ของคุณ

app.post("/confirm-rental", async (req, res) => {
  const { customer_id, items, total_amount } = req.body;
  const rental_id = Math.floor(100000 + Math.random() * 900000);

  let connection;
  try {
    // ✅ ดึง connection แบบ Promise (ต้องใช้ mysql2/promise เท่านั้น)
    connection = await pool.getConnection(); 
    
    await connection.beginTransaction();

    // 1. Insert ลงตาราง rental
    await connection.execute(
      "INSERT INTO rental (rental_id, total_amount, rental_status, customer_id) VALUES (?, ?, 'Pending', ?)",
      [rental_id, total_amount, customer_id]
    );

    // 2. Loop Insert รายการอุปกรณ์
    for (let item of items) {
      await connection.execute(
        "INSERT INTO rental_detail (rental_id, equipment_id, price_per_day) VALUES (?, ?, ?)",
        [rental_id, item.equipment_id, item.daily_rate]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "จองสำเร็จ!", rental_id: rental_id });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
});


async function submitOrder() {
    // 1. ดึงข้อมูลจาก localStorage
    const cart = JSON.parse(localStorage.getItem('cartData') || '[]');
    const customerId = localStorage.getItem('customer_id');

    // ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
    if (cart.length === 0) {
        alert("❌ ไม่มีสินค้าในตะกร้า");
        return;
    }

    // ตรวจสอบว่ามีข้อมูลลูกค้าหรือไม่
    if (!customerId) {
        alert("❌ ไม่พบข้อมูลลูกค้า กรุณากรอกข้อมูลก่อนทำการจอง");
        // window.location.href = "customer.html"; // อาจจะส่งกลับไปหน้ากรอกข้อมูล
        return;
    }

    // 2. คำนวณยอดรวม (ตรวจสอบว่าเป็นตัวเลขแน่นอน)
    const totalAmount = cart.reduce((sum, item) => sum + (Number(item.daily_rate) || 0), 0);

    // เตรียมข้อมูลส่งไปยัง Backend
    const orderData = {
        customer_id: customerId,
        items: cart.map(item => ({
            equipment_id: item.equipment_id,
            daily_rate: item.daily_rate
        })),
        total_amount: totalAmount
    };

    console.log("📤 กำลังส่งข้อมูลการจอง:", orderData);

    try {
        const response = await fetch('http://localhost:3000/confirm-rental', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData )
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            alert("✅ การสั่งจองสำเร็จ! เลขที่ใบจอง: " + result.rental_id);
            localStorage.removeItem('cartData'); // ล้างตะกร้า
            window.location.href = "index.html"; // กลับหน้าหลัก
        } else {
            alert("❌ การจองไม่สำเร็จ: " + (result.message || "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    }
}

// API สำหรับดึงข้อมูล Customer จาก User_ID เพื่อเช็คว่าเคยกรอกข้อมูลหรือยัง
// API สำหรับตรวจสอบว่า User นี้มีข้อมูลลูกค้า (Customer) หรือยัง
app.get("/get-customer-profile/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const [rows] = await pool.promise().query(
            "SELECT * FROM customer WHERE user_id = ?", 
            [userId]
        );

        if (rows.length > 0) {
            // ถ้าเจอข้อมูล ส่ง JSON กลับไป
            res.json(rows[0]);
        } else {
            // ถ้าไม่เจอ ส่ง JSON บอกว่าไม่พบ
            res.json({ notFound: true });
        }
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
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

app.post("/add-rental-detail",async(req,res) =>{
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