import { Server, Socket } from "socket.io";
import authNamespace from "../namespace/auth.namespace";

let io: Server;

/**
 * Creates a WebSocket server using Socket.IO.
 * @param server The HTTP or HTTPS server instance
 */
export const createSocketServer = (server: any): void => {
  io = new Server(server, {
    cors: {
      origin: "*", // CORS origin (do not add the path here)
      methods: ["GET", "POST"],
    },
  });

  // ✅ Load (Routes) namespaces
  authNamespace(io);
};

export { io };

// Server-side
// io.on("connection", (socket) => {

//   // basic emit
//   socket.emit(/* ... */);

//   // to all clients in the current namespace except the sender
//   socket.broadcast.emit(/* ... */);

//   // to all clients in room1 except the sender
//   socket.to("room1").emit(/* ... */);

//   // to all clients in room1 and/or room2 except the sender
//   socket.to("room1").to("room2").emit(/* ... */);

//   // to all clients in room1
//   io.in("room1").emit(/* ... */);

//   // to all clients in namespace "myNamespace"
//   io.of("myNamespace").emit(/* ... */);

//   // to all clients in room1 in namespace "myNamespace"
//   io.of("myNamespace").to("room1").emit(/* ... */);

//   // to individual socketid (private message)
//   io.to(socketId).emit(/* ... */);

//   // to all clients on this node (when using multiple nodes)
//   io.local.emit(/* ... */);

//   // to all connected clients
//   io.emit(/* ... */);

//   // WARNING: `socket.to(socket.id).emit()` will NOT work, as it will send to everyone in the room
//   // named `socket.id` but the sender. Please use the classic `socket.emit()` instead.

//   // with acknowledgement
//   socket.emit("question", (answer) => {
//     // ...
//   });

//   // without compression
//   socket.compress(false).emit(/* ... */);

//   // a message that might be dropped if the low-level transport is not writable
//   socket.volatile.emit(/* ... */);

// });

// Client-side
// // basic emit
// socket.emit(/* ... */);

// // with acknowledgement
// socket.emit("question", (answer) => {
//   // ...
// });

// // without compression
// socket.compress(false).emit(/* ... */);

// // a message that might be dropped if the low-level transport is not writable
// socket.volatile.emit(/* ... */);
