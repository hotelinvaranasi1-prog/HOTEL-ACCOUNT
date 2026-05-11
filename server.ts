import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

// Seed rooms if empty
async function seedRooms() {
  try {
    const snapshot = await db.collection('rooms').limit(1).get();
    if (snapshot.empty) {
      console.log("Seeding rooms into Firebase...");
      const batch = db.batch();
      const rooms = [];
      for (let i = 101; i <= 110; i++) rooms.push(i.toString());
      for (let i = 201; i <= 210; i++) rooms.push(i.toString());
      rooms.push('301', '302');

      for (const roomNumber of rooms) {
        const roomRef = db.collection('rooms').doc(roomNumber);
        batch.set(roomRef, { number: roomNumber, status: 'Available' });
      }
      await batch.commit();
      console.log("Rooms seeded successfully.");
    }
  } catch (err) {
    console.error("Error seeding rooms:", err);
  }
}
seedRooms();

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes (Kept for compatibility, though frontend now uses Firebase SDK)
  
  // Rooms
  app.get("/api/rooms", async (req, res) => {
    try {
      const snapshot = await db.collection('rooms').get();
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/rooms/:number/status", async (req, res) => {
    const { number } = req.params;
    const { status } = req.body;
    try {
      const snapshot = await db.collection('rooms').where('number', '==', number).limit(1).get();
      if (!snapshot.empty) {
        await snapshot.docs[0].ref.update({ status });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bookings
  app.get("/api/bookings", async (req, res) => {
    try {
      const snapshot = await db.collection('bookings').orderBy('date', 'desc').get();
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const doc = await db.collection('settings').doc('config').get();
      res.json(doc.exists ? doc.data() : {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      await db.collection('settings').doc('config').set(req.body, { merge: true });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Email Sending
  app.post("/api/send-invoice-email", async (req, res) => {
    const { to, subject, text, pdfBase64, filename } = req.body;

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return res.status(500).json({ 
        error: "Email configuration missing. Please set GMAIL_USER and GMAIL_APP_PASSWORD in environment." 
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
        errorMessage = "Gmail Login Failed: Please ensure you are using a 16-character 'App Password' from Google (2-Step Verification must be enabled).";
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
