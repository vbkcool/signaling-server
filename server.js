import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.get("/", (req, res) => res.send("✅ WebRTC Signaling Server is running"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Map to track users in rooms
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`🔗 Connected: ${socket.id}`);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    console.log(`📥 ${socket.id} joined room ${roomId}`);

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    io.to(roomId).emit("room-users", Array.from(rooms.get(roomId)));
  });

  // Handle signaling data: offer/answer/candidate
  socket.on("signal", (data) => {
    const { roomId } = data;
    console.log(`📡 Signal: ${data.type} from ${socket.id} to ${roomId}`);
    socket.to(roomId).emit("signal", data);
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socket.id);
        io.to(roomId).emit("room-users", Array.from(rooms.get(roomId)));
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Signaling server running on port ${PORT}`)
);
