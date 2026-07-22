const User = require("../models/User");

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    socket.on("register", async (userId) => {
      try {
        await User.findByIdAndUpdate(userId, {
          socketId: socket.id,
        });

        console.log(`User Registered : ${userId}`);
      } catch (err) {
        console.log(err);
      }
    });

    socket.on("disconnect", async () => {
      try {
        await User.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null }
        );

        console.log("🔴 User Disconnected:", socket.id);
      } catch (err) {
        console.log(err);
      }
    });
  });
};

module.exports = initializeSocket;