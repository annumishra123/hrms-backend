// const User = require("../models/User");

// const initializeSocket = (io) => {
//   io.on("connection", (socket) => {
//     console.log("🟢 User Connected:", socket.id);

//     socket.on("register", async (userId) => {
//       try {
//         await User.findByIdAndUpdate(userId, {
//           socketId: socket.id,
//         });

//         console.log(`User Registered : ${userId}`);
//       } catch (err) {
//         console.log(err);
//       }
//     });

//     socket.on("disconnect", async () => {
//       try {
//         await User.findOneAndUpdate(
//           { socketId: socket.id },
//           { socketId: null }
//         );

//         console.log("🔴 User Disconnected:", socket.id);
//       } catch (err) {
//         console.log(err);
//       }
//     });
//   });
// };

// module.exports = initializeSocket;






const User = require("../models/User");

const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 User Connected:", socket.id);

    socket.on("register", async (userId) => {
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { socketId: socket.id },
          { new: true }
        );

        // 🔴 Personal room — is user ko target karne ke liye
        socket.join(`user:${userId}`);

        // 🔴 Admin/HR shared room — sab admins ko ek saath notify karne ke liye
        if (user?.role === "admin" || user?.role === "hr") {
          socket.join("admins");
        }

        console.log(`User Registered: ${userId} | Rooms: ${[...socket.rooms]}`);
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