// server.js
const express = require("express");
require("dotenv").config();

const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Cấu hình CORS cho Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_DOMAINS ? process.env.CLIENT_DOMAINS.split(",") : "*", // URL của React app
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

// Lưu trữ danh sách người dùng online
let onlineUsers = new Map();

// Xử lý kết nối WebSocket
io.on("connection", (socket) => {
  console.log("Người dùng kết nối:", socket.id);

  // Xử lý khi người dùng join với username
  socket.on("join", (username) => {
    onlineUsers.set(socket.id, username);
    socket.username = username;

    // Thông báo cho tất cả client về người dùng mới
    socket.broadcast.emit("user_joined", {
      username: username,
      message: `${username} đã tham gia chat`,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    });

    // Gửi danh sách người dùng online
    io.emit("online_users", Array.from(onlineUsers.values()));
  });

  // Xử lý tin nhắn
  socket.on("send_message", (data) => {
    const messageData = {
      id: Date.now(),
      username: socket.username || "Ẩn danh",
      message: data.message,
      timestamp: new Date().toLocaleTimeString("vi-VN"),
    };

    // Gửi tin nhắn đến tất cả client
    io.emit("receive_message", messageData);
  });

  // Xử lý khi người dùng disconnect
  socket.on("disconnect", () => {
    if (socket.username) {
      onlineUsers.delete(socket.id);

      // Thông báo người dùng rời chat
      socket.broadcast.emit("user_left", {
        username: socket.username,
        message: `${socket.username} đã rời khỏi chat`,
        timestamp: new Date().toLocaleTimeString("vi-VN"),
      });

      // Cập nhật danh sách người dùng online
      io.emit("online_users", Array.from(onlineUsers.values()));
    }
    console.log("Người dùng ngắt kết nối:", socket.id);
  });

  // Xử lý typing indicator
  socket.on("typing", (data) => {
    socket.broadcast.emit("user_typing", {
      username: socket.username,
      isTyping: data.isTyping,
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});
