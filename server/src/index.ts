// Charger les variables d'environnement EN PREMIER, avant tout import
// qui dépend de process.env (Prisma, JWT, etc.)
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from "./app.js";
import { setupSocket } from "./socket/index.js";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for debugging, we can restrict later
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true // Compatibility for some clients
});

setupSocket(io);
app.set("io", io);

// Only listen if not running in Vercel/Serverless environment
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

export default app;
