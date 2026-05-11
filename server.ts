import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import * as admin from "firebase-admin";
import * as OneSignal from 'onesignal-node';
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// Initialize OneSignal Client
let onesignalClient: OneSignal.Client | null = null;
const getOneSignalClient = () => {
  if (!onesignalClient) {
    const appId = process.env.VITE_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (appId && apiKey) {
      onesignalClient = new OneSignal.Client(appId, apiKey);
    }
  }
  return onesignalClient;
};

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

function getDb() {
  if (!db) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId
        });
      }
      db = admin.firestore();
    } catch (err) {
      console.error("Failed to initialize Firebase Admin:", err);
    }
  }
  return db;
}

// Seed rooms if empty
async function seedRooms() {
  console.log("Checking for missing rooms in database...");
  const database = getDb();
  if (!database) {
    console.warn("Skipping seedRooms: database not initialized");
    return;
  }
  try {
    const desiredRooms = [
      '101', '102', '103', '104', '105',
      '201', '202', '203', '204', '205', '301', '302'
    ];
    
    const snapshot = await database.collection('rooms').get();
    const existingRoomNumbers = snapshot.docs.map(doc => doc.id);
    const missingRooms = desiredRooms.filter(r => !existingRoomNumbers.includes(r));

    if (missingRooms.length > 0) {
      console.log("Seeding missing rooms into Firebase:", missingRooms);
      const batch = database.batch();
      for (const roomNumber of missingRooms) {
        const roomRef = database.collection('rooms').doc(roomNumber);
        batch.set(roomRef, { number: roomNumber, status: 'Available' });
      }
      await batch.commit();
      console.log("Missing rooms seeded successfully.");
    } else {
      console.log("All rooms already exist in database.");
    }
  } catch (err) {
    console.error("Error seeding rooms:", err);
  }
}

async function startServer() {
  // Call seedRooms in background
  seedRooms();

  const app = express();
  app.use(express.json());

  // API Routes (Kept for compatibility, though frontend now uses Firebase SDK)
  
  // Rooms
  app.get("/api/rooms", async (req, res) => {
    try {
      const database = getDb();
      if (!database) throw new Error("Database not initialized");
      const snapshot = await database.collection('rooms').get();
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
      const database = getDb();
      if (!database) throw new Error("Database not initialized");
      const snapshot = await database.collection('rooms').where('number', '==', number).limit(1).get();
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
      const database = getDb();
      if (!database) throw new Error("Database not initialized");
      const snapshot = await database.collection('bookings').orderBy('date', 'desc').get();
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(bookings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const database = getDb();
      if (!database) throw new Error("Database not initialized");
      const doc = await database.collection('settings').doc('config').get();
      res.json(doc.exists ? doc.data() : {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const database = getDb();
      if (!database) throw new Error("Database not initialized");
      await database.collection('settings').doc('config').set(req.body, { merge: true });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/notify-booking", async (req, res) => {
    const b = req.body;
    const client = getOneSignalClient();
    
    if (!client) {
      return res.status(500).json({ error: "OneSignal not configured" });
    }

    try {
      const notification = {
        contents: {
          en: `New booking: Room ${b.room_number || 'N/A'} for ${b.guest_name || 'Guest'}. Amount: ₹${b.total_amount || 0}`,
        },
        headings: {
          en: "🏨 New Reservation",
        },
        included_segments: ["All"],
      };

      await client.createNotification(notification);
      res.json({ success: true });
    } catch (err: any) {
      console.error("OneSignal notification error:", err);
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
