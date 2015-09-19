var http = require('http');
var utils = require('./lib/utils');
var chatServer = require('./lib/chat_server');
var cache = {};

var server = http.createServer(function (req, res) {
    var filePath = false;
    if (req.url == "/") {
        filePath = "public/index.html";
    } else {
        filePath = "public" + req.url;
    }

    var absPath = "./" + filePath;
    utils.serveStatic(res, cache, absPath);
});

chatServer.listen(server);
server.listen(3000, function () { console.log("服务器已启动！") });
