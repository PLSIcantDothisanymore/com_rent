import express from "express"
import pool from "./connection.js"
import cors from "cors"

const app  = express();
app.use(cors());

app.use(express.json());

app.get("/hello",(req,res) => {
    res.send("Hello World");
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
            VALUE(?,?,?,?,?,?,?,?,?)
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