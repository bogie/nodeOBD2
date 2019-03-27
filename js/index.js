const { remote, ipcRenderer } = require('electron');
const net = require('net');
const {BrowserWindow} = remote;
const win = BrowserWindow.getFocusedWindow();

const Chart = require('chart.js');

const sendBuffer = [];
var sendTimer;


const RPMData = [                    { 
    x: 1553633735382,
    y: 800
    },
    {
        x: 1553633735402,
        y: 1200
    },{
        x: 1553633735422,
        y: 1800
    },{
        x: 1553633735442,
        y: 2400
    },
    {
        x: 1553633735462,
        y: 6000
    }];

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
    let gwin;
    if(gwin == null) {
        gwin = new BrowserWindow({ width: 800, height: 800});
        gwin.loadFile('html/graph.html');
    }
    gwin.on('closed', () => {
        gwin = null;
    })
    document.getElementById("connectButton").onclick= function() {
        var host = document.getElementById("hostInput").value;
        var port = document.getElementById("portInput").value;
        connectOBD2(host,port);
    }

    document.getElementById("consoleButton").onclick = function() {
        sendToOBD2(document.getElementById("consoleInput").value);
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
        if(raw.startsWith('41')) {
            console.log("Received Code1 data in index.js");
            var data = {};
            data.label = new Date().getTime();
            data.data = raw.replace('41','');
            gwin.send('newGraphData', data);
        }
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