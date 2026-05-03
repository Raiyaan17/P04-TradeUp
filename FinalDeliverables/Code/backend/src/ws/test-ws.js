//to test node Prototype/backend/src/ws/test-ws.js
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/ws", {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  timeout: 10000,
});

const target = "HUBC"; // change to HBL, UBL, MCB, HUBC, or FFC

socket.on("connect", () => {
  console.log("connected:", socket.id);
//   socket.emit("subscribeSymbol", target); //single sub
  ["HUBC", "FFC"].forEach((s) => socket.emit("subscribeSymbol", s));//multiple sub
});

socket.on("subscribed", (data) => {
  console.log("subscribed to:", data.symbol);
});

socket.on("tickUpdate", (msg) => {
  console.log("tickUpdate:", msg.symbol, msg.tick?.c ?? msg.tick?.price);
});

socket.on("connect_error", (err) => console.error("connect_error:", err.message));
socket.on("disconnect", (reason) => console.log("disconnected:", reason));