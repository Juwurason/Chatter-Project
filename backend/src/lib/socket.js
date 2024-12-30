import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle 'typing' event: Emit to other users that a user is typing
  socket.on("typing", (data) => {
    const { userId, username } = data; // Data should include userId and username
    socket.broadcast.emit("userTyping", { userId, username });
  });

  // Handle 'stopTyping' event: Emit to other users that a user stopped typing
  socket.on("stopTyping", (userId) => {
    socket.broadcast.emit("userStoppedTyping", { userId });
  });

  // Handle delivering messages
  socket.on("deliver", (messageData) => {
    const { recipientUserId, message } = messageData;
    const recipientSocketId = userSocketMap[recipientUserId];

    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", message); // Send message to the recipient
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
