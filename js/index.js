const { remote, ipcRenderer } = require('electron');
const net = require('net');
const {BrowserWindow} = remote;
const win = BrowserWindow.getFocusedWindow();

const Chart = require('../node_modules/chart.js/dist/Chart');

var OBDPIDs = require("../js/OBD2_PIDS");

var receiveBuffer;
var subscriptions;
var curSub;
var sendBuffer;
var sendTimer;
var subscriptionTimer;
var waitingForResponse;
let gwin;
var capabilities;


function sendData() {
    if(sendBuffer.length > 0 && !waitingForResponse) {
        var data = sendBuffer.shift();
        console.log("Sending data to ODB2: ",data);
        win.socket.write(data);
        waitingForResponse = true;
    } else {
        win.socket.write(subscriptions[curSub]+"\r");
        curSub++;
        if(curSub == subscriptions.length)
            curSub = 0;
    }
}

function sendSubscriptions() {
    win.socket.write(subscriptions[curSub]+"\r");
    curSub++;
    if(curSub == subscriptions.length)
        curSub = 0;
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
    var pidInfo = OBDPIDs.service01["01"];
    var pidList = document.getElementById("PIDList");

    var pids = pidInfo.convert(bytes);
    console.log("setPidsSupported: ",pids);
    for(var i = 0; i < pids.length; i++) {
        if(pids[i] == "1") {
            var idx = i.toString(16);
            if(i<10)
                idx = "0"+i.toString(16);
            var pid = OBDPIDs.service01[idx];
            var node = document.createElement("li");
            var nodeText = document.createTextNode(pid.name);
            node.appendChild(nodeText);
            if(pid.realtime) {
                var checkBoxNode = document.createElement("input");
                checkBoxNode.setAttribute("type","checkbox");
                checkBoxNode.setAttribute("id",pid.name);
                node.appendChild(checkBoxNode);
            }
            pidList.appendChild(node);
        }
    }
    capabilities = bytes;
}

function mode1_freezeDTC(bytes) {
    logOut("DTC freeze successfull");
}

function mode1_statusDTC(bytes) {
    var pidInfo = OBDPIDs.service01["01"];
    var status = pidInfo.convert(bytes);
    logOut("Received DTC Status binary: ",status);
    // MIL light
    var MILstatus = document.getElementById("monitorStatus");
    if(status[0] == "1") {
        var numMil = Number.parseInt(status.slice(1,8),2);
        MILstatus.innerText = "Check Engine, "+numMil+" faults";
    } else {
        MILstatus.innerText = "Engine OK";
    }
}

function mode1_fuelSystemStatus(bytes) {
    var pidInfo = OBDPIDs.service["03"];
    var status = pidInfo.convert(bytes);
    logOut("Received fuelSystemStatus: ",status);
}

function mode1_OBD2Standard(bytes) {
    var statusHtml = document.getElementById("OBDStandard");
    var num = Number.parseInt(bytes[0],16);
    statusHtml.innerText = num;
    logOut("Set OBD2Standard: ",num);
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
            setPidsSupported(bytes.splice(0,2));
            break;
        case "01":
            mode1_statusDTC(bytes.splice(0,2));
            break;
        case "02":
            mode1_freezeDTC(bytes.splice(0,2));
            break;
        case "03":
            mode1_fuelSystemStatus(bytes.splice(0,2));
            break;
        case "1C":
            mode1_OBD2Standard(bytes.splice(0,2));
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

function clearVehicleStatusGUI() {
    var pidList = document.getElementById("PIDList");
    pidList.childNodes.forEach(child => pidList.removeChild(child));

    var vinLabel = document.getElementById("vinLabel");
    vinLabel.innerText = "";

    var obdLabel = document.getElementById("OBDStandard");
    obdLabel.innerText = "";

    var milList = document.getElementById("milList");
    milList.childNodes.forEach(child => milList.removeChild(child));

    var milStatus = document.getElementById("MILStatus");
    milStatus.innerText = "Not connected";
}

function initiateELM327() {
    waitingForResponse = false;
    receiveBuffer = "";
    subscriptions = ["0105","010C"];
    curSub = 0;
    sendBuffer = ["ATZ","ATE0","ATAT2","ATST0A","ATS0","ATL0","ATSP0","ATH0","0100","0101","0902","011C"];
    capabilities = "";

    sendTimer = setInterval(sendData,30);
    //subscriptionTimer = setInterval(sendSubscriptions,80);
}

function resetELM327() {
    clearInterval(sendTimer);
    //clearInterval(subscriptionTimer);

    clearVehicleStatusGUI();
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
        initiateELM327();
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
        resetELM327();
    });
    
    win.socket.on('error', function(error) {
        logOut(error);
    });
}