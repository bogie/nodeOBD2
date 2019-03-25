const {remote} = require('electron');
const net = require('net');
const {BrowserWindow} = remote;
const win = BrowserWindow.getFocusedWindow();

const sendBuffer = [];
var sendTimer;

function sendData() {
    if(sendBuffer.length>0)
        win.socket.write(sendBuffer.shift());
}

function connectOBD2(host,port) {
    logOut("Trying to connect to: " + host + "@" + port);
    win.socket.connect(port,host, function(){
        logOut("Connected");
    })
}

function sendToOBD2(data) {
    sendBuffer.push(data+"\r");
}

function logOut(text) {
    var log = document.getElementById("logBox");
    log.value += text + "\n";
}

window.onload = function () { 
    document.getElementById("connectButton").onclick= function() {
        var host = document.getElementById("hostInput").value;
        var port = document.getElementById("portInput").value;
        connectOBD2(host,port);
    }
    document.getElementById("consoleInput").onkeydown = function(evt) {
        if(evt.code == "Enter"){
            sendToOBD2(document.getElementById("consoleInput").value);
        }
    }

    win.socket = new net.Socket();
    win.socket.setEncoding("ascii");

    logOut("Socket init");
    win.socket.on('ready', function() {
        sendTimer = setInterval(sendData,40);
        sendToOBD2("ATZ");
        sendToOBD2("ATRV");
    });
    win.socket.on('data', function(data){
        var raw = data.toString();
        raw = raw.replace('\r','');
        raw = raw.replace('>','');
        logOut('Received: '+raw);
    });

    win.socket.on('close', function() {
        logOut('Connection closed');
        clearInterval(sendTimer);
    });
    
    win.socket.on('error', function(error) {
        logOut(error);
    });
}