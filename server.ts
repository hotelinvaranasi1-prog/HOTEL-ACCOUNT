import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("hotel.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Available' -- Available, Occupied, Cleaning, Maintenance
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    room_number TEXT NOT NULL,
    guest_name TEXT,
    booking_type TEXT NOT NULL, -- Walk-in, OTA
    ota_source TEXT,
    room_price REAL DEFAULT 0,
    misc_charges REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    cash_paid REAL DEFAULT 0,
    online_paid REAL DEFAULT 0,
    balance_amount REAL DEFAULT 0,
    commission_amount REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    net_income REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'Unpaid', -- Paid, Unpaid
    booking_status TEXT DEFAULT 'Active', -- Active, Cancelled
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for existing tables
try { db.exec("ALTER TABLE bookings ADD COLUMN check_in TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE bookings ADD COLUMN check_out TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE invoices ADD COLUMN booking_source TEXT;"); } catch(e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date TEXT NOT NULL,
    guest_name TEXT,
    guest_address TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    check_in TEXT,
    check_out TEXT,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    booking_source TEXT,
    room_data TEXT, -- JSON array of room entries
    summary_data TEXT, -- JSON object of totals
    payment_data TEXT, -- JSON object of payments
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Recalculate net_income for existing bookings to remove GST deduction
  UPDATE bookings 
  SET gst_amount = 0, 
      net_income = total_amount - commission_amount 
  WHERE booking_type = 'OTA';

  -- Fix payment_status for existing bookings based on balance_amount
  UPDATE bookings
  SET payment_status = CASE WHEN balance_amount <= 0 THEN 'Paid' ELSE 'Unpaid' END;
`);

// Seed rooms if empty
const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get() as { count: number };
if (roomCount.count === 0) {
  const insertRoom = db.prepare("INSERT INTO rooms (number, status) VALUES (?, ?)");
  for (let i = 101; i <= 110; i++) insertRoom.run(i.toString(), 'Available');
  for (let i = 201; i <= 210; i++) insertRoom.run(i.toString(), 'Available');
  insertRoom.run('301', 'Available');
  insertRoom.run('302', 'Available');
}

// Ensure 301 and 302 exist even if table wasn't empty
const ensureRooms = db.prepare("INSERT OR IGNORE INTO rooms (number, status) VALUES (?, ?)");
ensureRooms.run('301', 'Available');
ensureRooms.run('302', 'Available');
ensureRooms.run('205', 'Available');

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  
  // Auth (Simple)
  app.post("/api/login", (req, res) => {
    const { password } = req.body;
    if (password === "admin123") { // Simple hardcoded password for staff
      res.json({ success: true, token: "staff-token-123" });
    } else {
      res.status(401).json({ success: false, message: "Invalid password" });
    }
  });

  // Rooms
  app.get("/api/rooms", (req, res) => {
    const rooms = db.prepare("SELECT * FROM rooms").all();
    res.json(rooms);
  });

  app.patch("/api/rooms/:number/status", (req, res) => {
    const { number } = req.params;
    const { status } = req.body;
    db.prepare("UPDATE rooms SET status = ? WHERE number = ?").run(status, number);
    res.json({ success: true });
  });

  // Bookings
  app.get("/api/bookings", (req, res) => {
    const bookings = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all();
    res.json(bookings);
  });

  app.post("/api/bookings", async (req, res) => {
    const b = req.body;
    
    // Calculate totals
    const total_amount = (Number(b.room_price) || 0) + (Number(b.misc_charges) || 0);
    const balance_amount = total_amount - (Number(b.cash_paid) || 0) - (Number(b.online_paid) || 0);
    const payment_status = balance_amount <= 0 ? 'Paid' : 'Unpaid';
    
    let commission_amount = 0;
    let gst_amount = 0;
    let net_income = total_amount;

    if (b.booking_type === 'OTA') {
      commission_amount = Number(b.commission_amount) || 0;
      gst_amount = 0; // Removed 18% GST on commission
      net_income = total_amount - commission_amount;
    }

    const stmt = db.prepare(`
      INSERT INTO bookings (
        date, check_in, check_out, room_number, guest_name, booking_type, ota_source,
        room_price, misc_charges, total_amount, cash_paid, online_paid,
        balance_amount, commission_amount, gst_amount,
        net_income, payment_status, booking_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      b.date, b.check_in, b.check_out, b.room_number, b.guest_name, b.booking_type, b.ota_source,
      b.room_price, b.misc_charges, total_amount, b.cash_paid, b.online_paid,
      balance_amount, commission_amount, gst_amount,
      net_income, payment_status, 'Active'
    );

    // Update room status to Occupied
    db.prepare("UPDATE rooms SET status = 'Occupied' WHERE number = ?").run(b.room_number);

    // Telegram Notification (Mock for now, but structure is here)
    const telegramEnabled = db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled'").get() as any;
    if (telegramEnabled?.value === 'true') {
      const botToken = db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as any;
      const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_id'").get() as any;
      
      if (botToken?.value && chatId?.value) {
        const message = `🏨 *New Booking Added*\n\nRoom: ${b.room_number}\nGuest: ${b.guest_name || 'N/A'}\nType: ${b.booking_type}\nTotal: ₹${total_amount}\nStatus: ${payment_status}`;
        fetch(`https://api.telegram.org/bot${botToken.value}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId.value, text: message, parse_mode: 'Markdown' })
        }).catch(err => console.error("Telegram error:", err));
      }
    }

    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.put("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    const b = req.body;

    const total_amount = (Number(b.room_price) || 0) + (Number(b.misc_charges) || 0);
    const balance_amount = total_amount - (Number(b.cash_paid) || 0) - (Number(b.online_paid) || 0);
    const payment_status = balance_amount <= 0 ? 'Paid' : 'Unpaid';
    
    let commission_amount = 0;
    let gst_amount = 0;
    let net_income = total_amount;

    if (b.booking_type === 'OTA') {
      commission_amount = Number(b.commission_amount) || 0;
      gst_amount = 0; // Removed GST
      net_income = total_amount - commission_amount;
    }

    const stmt = db.prepare(`
      UPDATE bookings SET
        date = ?, check_in = ?, check_out = ?, room_number = ?, guest_name = ?, booking_type = ?, ota_source = ?,
        room_price = ?, misc_charges = ?, total_amount = ?, cash_paid = ?, online_paid = ?,
        balance_amount = ?, commission_amount = ?, gst_amount = ?,
        net_income = ?, payment_status = ?, booking_status = ?
      WHERE id = ?
    `);

    stmt.run(
      b.date, b.check_in, b.check_out, b.room_number, b.guest_name, b.booking_type, b.ota_source,
      b.room_price, b.misc_charges, total_amount, b.cash_paid, b.online_paid,
      balance_amount, commission_amount, gst_amount,
      net_income, payment_status, b.booking_status, id
    );

    res.json({ success: true });
  });

  app.post("/api/bookings/:id/cancel", (req, res) => {
    const { id } = req.params;
    const booking = db.prepare("SELECT room_number FROM bookings WHERE id = ?").get(id) as any;
    
    db.prepare("UPDATE bookings SET booking_status = 'Cancelled' WHERE id = ?").run(id);
    if (booking) {
      db.prepare("UPDATE rooms SET status = 'Available' WHERE number = ?").run(booking.room_number);
    }
    res.json({ success: true });
  });

  app.post("/api/bookings/:id/misc", (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as any;
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const newMisc = (Number(booking.misc_charges) || 0) + (Number(amount) || 0);
    const newTotal = (Number(booking.room_price) || 0) + newMisc;
    const newBalance = newTotal - (Number(booking.cash_paid) || 0) - (Number(booking.online_paid) || 0);
    const newStatus = newBalance <= 0 ? 'Paid' : 'Unpaid';
    
    let net_income = newTotal;
    if (booking.booking_type === 'OTA') {
      net_income = newTotal - (Number(booking.commission_amount) || 0);
    }

    db.prepare(`
      UPDATE bookings SET 
        misc_charges = ?, total_amount = ?, balance_amount = ?, payment_status = ?, net_income = ?
      WHERE id = ?
    `).run(newMisc, newTotal, newBalance, newStatus, net_income, id);

    res.json({ success: true });
  });

  app.post("/api/bookings/:id/pay", (req, res) => {
    const { id } = req.params;
    const { method, amount } = req.body; // method: 'cash' or 'online'
    
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id) as any;
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const newCash = method === 'cash' ? booking.cash_paid + amount : booking.cash_paid;
    const newOnline = method === 'online' ? booking.online_paid + amount : booking.online_paid;
    const newBalance = booking.total_amount - newCash - newOnline;
    const newStatus = newBalance <= 0 ? 'Paid' : 'Unpaid';

    db.prepare(`
      UPDATE bookings SET 
        cash_paid = ?, online_paid = ?, balance_amount = ?, payment_status = ?
      WHERE id = ?
    `).run(newCash, newOnline, newBalance, newStatus, id);

    res.json({ success: true });
  });

  // Invoices
  app.get("/api/invoices", (req, res) => {
    const invoices = db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
    res.json(invoices);
  });

  app.get("/api/invoices/:id", (req, res) => {
    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(invoice);
  });

  app.post("/api/invoices", (req, res) => {
    const i = req.body;
    
    // Generate Invoice Number if not provided
    let invoice_number = i.invoice_number;
    if (!invoice_number) {
      const last = db.prepare("SELECT id FROM invoices ORDER BY id DESC LIMIT 1").get() as any;
      const nextId = (last?.id || 0) + 1;
      const year = new Date().getFullYear();
      invoice_number = `INV/${year}/${nextId.toString().padStart(4, '0')}`;
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO invoices (
          booking_id, invoice_number, invoice_date, guest_name, guest_address,
          guest_phone, guest_email, check_in, check_out, adults, children, booking_source,
          room_data, summary_data, payment_data, comments
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        i.booking_id || null, invoice_number, i.invoice_date, i.guest_name, i.guest_address,
        i.guest_phone, i.guest_email, i.check_in, i.check_out, i.adults, i.children, i.booking_source || 'Walk-in',
        JSON.stringify(i.room_data), JSON.stringify(i.summary_data), JSON.stringify(i.payment_data), i.comments
      );

      res.json({ success: true, id: result.lastInsertRowid, invoice_number });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: "Invoice number already exists" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.put("/api/invoices/:id", (req, res) => {
    const { id } = req.params;
    const i = req.body;

    const stmt = db.prepare(`
      UPDATE invoices SET
        invoice_number = ?, invoice_date = ?, guest_name = ?, guest_address = ?,
        guest_phone = ?, guest_email = ?, check_in = ?, check_out = ?, adults = ?, children = ?,
        booking_source = ?, room_data = ?, summary_data = ?, payment_data = ?, comments = ?
      WHERE id = ?
    `);

    stmt.run(
      i.invoice_number, i.invoice_date, i.guest_name, i.guest_address,
      i.guest_phone, i.guest_email, i.check_in, i.check_out, i.adults, i.children,
      i.booking_source, JSON.stringify(i.room_data), JSON.stringify(i.summary_data), JSON.stringify(i.payment_data), i.comments, id
    );

    res.json({ success: true });
  });

  app.delete("/api/invoices/:id", (req, res) => {
    db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, String(value));
    }
    res.json({ success: true });
  });

  // Reports
  app.delete("/api/bookings/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM bookings WHERE id = ?").run(id);
      db.prepare("DELETE FROM invoices WHERE booking_id = ?").run(id);
      res.json({ success: true, message: "Booking deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to delete booking" });
    }
  });

  app.get("/api/reports/summary", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    const summary = db.prepare(`
      SELECT 
        SUM(total_amount) as total_revenue,
        SUM(cash_paid) as total_cash,
        SUM(online_paid) as total_online,
        SUM(CASE WHEN booking_type = 'OTA' THEN 1 ELSE 0 END) as ota_count,
        SUM(CASE WHEN booking_type = 'Walk-in' THEN 1 ELSE 0 END) as walkin_count,
        SUM(balance_amount) as pending_payments
      FROM bookings 
      WHERE date = ? AND booking_status = 'Active'
    `).get(today) as any;

    res.json(summary || {
      total_revenue: 0,
      total_cash: 0,
      total_online: 0,
      ota_count: 0,
      walkin_count: 0,
      pending_payments: 0
    });
  });

  app.get("/api/reports/summary/hotels", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    // Get bookings that overlap with today
    const bookings = db.prepare(`
      SELECT * FROM bookings 
      WHERE booking_status = 'Active' 
      AND (
        date = ? 
        OR (check_in <= ? AND check_out >= ?)
      )
    `).all(today, today, today) as any[];
    
    res.json(bookings);
  });

  // Email Sending
  app.post("/api/send-invoice-email", async (req, res) => {
    const { to, subject, text, pdfBase64, filename } = req.body;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return res.status(500).json({ 
        error: "Email configuration missing. Please set GMAIL_USER and GMAIL_APP_PASSWORD in settings." 
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });

      const mailOptions = {
        from: user,
        to,
        subject,
        text,
        attachments: [
          {
            filename: filename || 'invoice.pdf',
            content: pdfBase64.split("base64,")[1],
            encoding: 'base64'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Email error:", error);
      let errorMessage = error.message || "Failed to send email";
      if (errorMessage.includes('BadCredentials') || errorMessage.includes('535')) {
        errorMessage = "Gmail Login Failed: Please ensure you are using a 16-character 'App Password' from Google (2-Step Verification must be enabled). Standard passwords will not work.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
