var Chat = function (socket) {
    this.socket = socket;
}

Chat.prototype.sendMessage = function (text) {
    this.socket.emit('message', { text: text });
}

Chat.prototype.changeRoom = function (room) {
    this.socket.emit('join', { newRoom: room });
}

Chat.prototype.processCommand = function (command) {
    var words = command.split(' ');
    var command = words[0].substring(1, words[0].length).toLowerCase();
    words.shift();
    var commandText = words.join(' ');
    var ret = false;
    switch (command) {
        case "join":
            this.changeRoom(commandText)
            break;
        case "nick":
            this.socket.emit('nameAttempt', commandText)
            break;
        case "clear":
            $('#messages').empty();
            break;
        default:
            ret = '不支持的命令：' + command + '。';
            break;
    }

    return ret;
}

var socket = io.connect();
var nickName, currentRoom;

socket.on('disconnect', function () {
    console.log("与服务其断开");
});

socket.on('reconnect', function () {
    console.log("重新连接到服务器");
});

$(function () {
    var chatApp = new Chat(socket);
    socket.on('nameResult', function (result) {
        var message;
        if (result.success) {
            nickName = result.name;
            message = "成功更换昵称为：" + result.name;
        } else {
            message = result.message;
        }

        $('#messages').append(systemMessage(message));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    });

    socket.on('joinResult', function (result) {
        currentRoom = result.room;
        $('#room').text(result.room);
        $('#messages').append(systemMessage("加入房间：" + result.room));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    });

    socket.on('message', function (message) {
        $('#messages').append(userMessage(message.text));
        $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    });

    socket.on('rooms', function (rooms) {
        $('#room-list').empty();
        for (var room in rooms) {
            room = room.substring(1, room.length);
            if (room != '') {
                var className = 'list-group-item';
                if (room == currentRoom) {
                    className += ' active';
                }

                $('#room-list').append($('<a href="#" class="' + className + '"></a>').text(room));
            }
        }

        $('#room-list a').click(function () {
            var that = $(this);
            if (that.hasClass("active")) {
                return;
            }

            chatApp.processCommand('/join ' + that.text());
            $('#send-message').focus();
        });
    });

    setInterval(function () {
        socket.emit('rooms');
    }, 10000);

    $('#send-message').focus();
    $('#send-form').submit(function () {
        processUserInput(chatApp, socket);
        return false;
    });
});


function systemMessage(message) {
    return $('<div class="system"></div>').html('<i>' + message + '</i>');
}

function userMessage(message) {
    return $('<div class="user"></div>').text(message);
}

function processUserInput(chatApp, socket) {
    var message = $.trim($('#send-message').val());
    if (message == '') {
        return;
    }

    if (message.charAt(0) == '/') {
        var result = chatApp.processCommand(message);
        if (result) {
            $('#messages').append(systemMessage(systemMessage));
        }
    } else {
        chatApp.sendMessage(message);
        $('#messages').append(userMessage(nickName + '：' + message));
    }

    $('#messages').scrollTop($('#messages').prop('scrollHeight'));
    $('#send-message').val('');
}
