var socketio = require("socket.io");
var io;
var guestName = '游客';
var defaultRoom = '公共大厅';
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function (server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function (socket) {
        console.log(socket.id, 'contented!')
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, defaultRoom);
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        socket.on('rooms', function () { socket.emit('rooms', io.sockets.manager.rooms) });
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = guestName + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', { success: true, name: name });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { success: true, room: room });
    socket.emit('rooms', io.sockets.manager.rooms);
    socket.broadcast.to(room).emit('message', { text: nickNames[socket.id] + ' 已加入房间！' });
    var usersInRoom = io.sockets.clients(room);
    if (usersInRoom.length > 1) {
        var usersInRoomSummary = "当前在此房间的用户：";
        for (var index in usersInRoom) {
            var userSocketId = usersInRoom[index].id;
            if (userSocketId != socket.id) {
                if (index > 0) {
                    usersInRoomSummary += ', ';
                }

                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += "。";
        socket.emit('message', { text: usersInRoomSummary });
    }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
    socket.on('nameAttempt', function (name) {
        if (name.indexOf(guestName) == 0) {
            socket.emit('nameResult', { success: false, message: '昵称不能以“' + guestName + '”开始！' })
        } else {
            if (namesUsed.indexOf(name) == -1) {
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit("nameResult", { success: true, name: name });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', { text: previousName + ' 现已更名为 ' + name + '。' });
            } else {
                socket.emit("nameResult", { success: false, message: "昵称已存在，不能使用此昵称！" });
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
            nickName: nickNames[socket.id],
            text: nickNames[socket.id] + '：' + message.text
        })
    });
}

function handleRoomJoining(socket) {
    socket.on('join', function (room) {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
        var nameIndex = namesUsed[socket.id];
        delete namesUsed[nameIndex];
        delete nickNames[nameIndex];
        console.log(socket.id, 'disconnect!')
    });
}
