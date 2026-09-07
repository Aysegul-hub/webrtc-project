const express = require("express");
const http = require("http");
const {Server} = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

io.on("connection" , (socket) => {
    console.log("Bir kullanıcı bağlandı:" , socket.id);

    socket.broadcast.emit("user-joined");

    socket.on("offer", (offer) => {
        socket.broadcast.emit("offer", offer);
    });

    socket.on("answer" , (answer) => {
        socket.broadcast.emit("answer" , answer);
    });

    socket.on("ice-candidate" , (candidate) => {
        socket.broadcast.emit("ice-candidate", candidate);
    });

    socket.on("call-ended", () => {
        socket.broadcast.emit("call-ended");
    });

    socket.on("new-call",() => {
        socket.broadcast.emit("new-call");
    });

    socket.on("disconnect" ,() => {
        console.log("Bir kullanıcı ayrıldı:" , socket.id);
    });

});

server.listen(3000, () => {
    console.log("Server çalışıyor : http://localhost:3000");
});