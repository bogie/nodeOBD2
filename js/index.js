const { remote, ipcRenderer } = require('electron');
const net = require('net');
const {BrowserWindow} = remote;
const win = BrowserWindow.getFocusedWindow();

const Chart = require('../node_modules/chart.js/dist/Chart');

var OBDPIDs = require("../js/OBD2_PIDS");

var receiveBuffer = "";
var subscriptions = ["0105","010C"];
var curSub = 0;
const sendBuffer = [];
var sendTimer;
var subscriptionTimer;
var waitingForResponse = false;
let gwin;
var capabilities = [];


function sendData() {
    if(sendBuffer.length > 0 && !waitingForResponse) {
        var data = sendBuffer.shift();
        console.log("Sending data to ODB2: ",data);
        win.socket.write(data);
        waitingForResponse = true;
    } else {
        //console.log("sendData: no data",sendBuffer);
    }
}

function sendSubscriptions() {
    win.socket.write(subscriptions[curSub]+"\r");
    curSub++;
    if(curSub == subscriptions.length)
        curSub = 0;
    /*for(var i = 0; i<subscriptions.length; i++){
        //console.log("Writing subscription: ",subscriptions[i]);
        win.socket.write(subscriptions[i]+"\r");
    }*/
}

function connectOBD2(host,port) {
    logOut("Trying to connect to: " + host + "@" + port);
    win.socket.connect(port,host, function(){
        logOut("Connected");
    });
}

function sendToOBD2(data) {
    sendBuffer.push(data+"\r");
}

function logOut(text) {
    var log = document.getElementById("logBox");
    log.value += text + "\n";
}

function handleRealtimeData(bytes) {
    console.log("Received Code1 data in index.js with bytes: ",bytes);
    var data = {};
    data.label = new Date().getTime();
    data.data = bytes;
    gwin.send('newGraphData', data);
}

function setPidsSupported(bytes) {
    var pidInfo = OBDPIDs.service01[bytes[1]];
    var pidList = document.getElementById("PIDList");
    for(var i = 2; i < bytes.length; i++) {
        var bit = bytes[i];
        console.log("PIDSupported found bit at index: "+i+" with value: "+pidInfo.convert(bit));
    }
    capabilities = bytes;
}

function mode1_freezeDTC(bytes) {

}

function mode1_statusDTC(bytes) {

}

function mode1_fuelSystemStatus(bytes) {

}

function mode1_OBD2Standard(bytes) {
    var statusHtml = document.getElementById("OBDStandard");
    var num = Number.parseInt(bytes[2],16);
    statusHtml.innerText = num;
    console.log("Set OBD2Standard: ",num);
}

function handleMode1(bytes) {
    console.log("Received mode1: ",bytes);
    var pidInfo = OBDPIDs.service01[bytes[1]];
    if(pidInfo.realtime == true) {
        console.log("Received PID: "+pidInfo.name+" with data: "+bytes);
        handleRealtimeData(bytes);
        return;
    }
    switch(bytes[1]) {
        case "00":
            setPidsSupported(bytes);
            break;
        case "01":
            mode1_statusDTC(bytes);
            break;
        case "02":
            mode1_freezeDTC(bytes);
            break;
        case "03":
            mode1_fuelSystemStatus(bytes);
            break;
        case "1C":
            mode1_OBD2Standard(bytes);
            break;
        case "12":
            break;
        case "13":
            break;
        default:
            console.log("Received unknown Mode1: ",bytes[1]);
            break;
    }
}

function setVIN(bytes){
    var vinLabel = document.getElementById("VINlabel");
    var vin = "";
    for(var i = 2; i < bytes.length; i++) {
        if(bytes[i] != "00")
            vin += bytes[i];
    }
    vinLabel.innerHTML = vin;
}

function handleMode9(bytes) {
    switch(bytes[1]) {
        case "02":
            setVIN(bytes);
            break;
    }
}

function handleAT(bytes) {
    console.log("Received AT code: ", bytes);
}

function setVersion(bytes) {
    console.log("Received ELM Version: ", bytes);
}

function handleDataReceived(line) {
    var bytesNum = 0;
    var bytes = [];

    line = line.replace(/ /g, '');

    for(bytesNum = 0; bytesNum < line.length; bytesNum += 2) {
        bytes.push(line.substr(bytesNum,2));
    }

    console.log("handleDataReceived: got line: ",line);
    console.log("handleDataReceived converted to bytes: ", bytes);
    //logOut('Received: '+line);

    if(line.startsWith("SEARCHING")) {
        console.log("Waiting for response");
        return;
    }

    if(line.startsWith("ELM")) {
        waitingForResponse = false;
        setVersion(bytes);
        return;
    }

    if(line.startsWith("OK") || line.startsWith("?") || line.startsWith("NODATA")){
        waitingForResponse = false;
        return;
    }

    switch(bytes[0]) {
        case "AT":
            waitingForResponse = false;
            handleAT(bytes);
            break;
        case "41":
            waitingForResponse = false;
            handleMode1(bytes);
            break;
        case "42":
            waitingForResponse = false;
            handleMode2(bytes);
            break;
        case "43":
            handleMode3(bytes);
            break;
        case "44":
            handleMode4(bytes);
            break;
        case "45":
            handleMode5(bytes);
            break;
        case "46":
            handleMode6(bytes);
            break;
        case "47":
            handleMode7(bytes);
            break;
        case "48":
            handleMode8(bytes);
            break;
        case "49":
            handleMode9(bytes);
            break;
        default:
            console.log("Received unhandled code: ",bytes[0]);
            console.log("with raw data: ",line);
            break;
    }
    if(waitingForResponse) {
        console.log("Waiting for Response but received: ",line);
    }
}

window.onload = function () {
    if(gwin == null) {
        gwin = new BrowserWindow({ width: 800, height: 800});
        gwin.loadFile('html/graph.html');
    }
    gwin.on('closed', () => {
        gwin = null;
    })
    var connectButton = document.getElementById("connectButton");
    connectButton.onclick= function() {
        var host = document.getElementById("hostInput").value;
        var port = document.getElementById("portInput").value;
        if(connectButton.innerText == "Connect"){
            connectOBD2(host,port);
            connectButton.innerText = "Disconnect";
        } else {
            win.socket.end();
        }        
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
        sendTimer = setInterval(sendData,30);
        subscriptionTimer = setInterval(sendSubscriptions,80);
        sendToOBD2("ATZ");
        sendToOBD2("ATE0");
        sendToOBD2("ATAT2");
        sendToOBD2("ATST0A");
        sendToOBD2("ATS0");
        sendToOBD2("ATL0");
        sendToOBD2("ATSP0");
        sendToOBD2("ATH0");
        sendToOBD2("0100");
    });

    win.socket.on('data', function(data){
        var raw = receiveBuffer + data.toString("utf8");

        console.log("onData: data from socket is: "+data.toString("utf8")+" receiveBuffer is: "+receiveBuffer);
        var commandArray = raw.split(">");

        if(commandArray.length <= 1) {
            receiveBuffer = raw;
        } else {
            for(var i = 0; i < commandArray.length; i++) {
                var command = commandArray[i];
                if(command === '') {
                    continue;
                }

                var lines = command.split('\r');
                for(var j = 0; j < lines.length; j++) {
                    var line = lines[j];
                    if(line === '') {
                        continue;
                    }
                    handleDataReceived(line);
                }
                receiveBuffer = '';
            }
        }
    });

    win.socket.on('close', function() {
        logOut('Connection closed');
        connectButton.innerText = "Connect";
        clearInterval(sendTimer);
        clearInterval(subscriptionTimer);
    });
    
    win.socket.on('error', function(error) {
        logOut(error);
    });
}