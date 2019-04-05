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
        win.socket.write(data+"\r");
        waitingForResponse = true;
    } else {
        if (subscriptions.length == 0)
            return;
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
    sendBuffer.push(data);
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

    console.log("setPidsSupported recevied bytes: ",bytes);
    var pids = pidInfo.convert(bytes);
    console.log("setPidsSupported: ",pids);
    for(var i = 0; i < pids.length; i++) {
        if(pids[i] == "1") {
            var idx = i.toString(16).toUpperCase();
            if(idx.length == 1)
                idx = "0"+i.toString(16).toUpperCase();
            console.log("Receiving PID info for idx: ",idx);
            var pid = OBDPIDs.service01[idx];
            if(pid == null) {
                console.log("pid with idx: "+idx+" not found");
                continue;
            }
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
    var cmd = bytes[1];
    bytes = bytes.slice(2,bytes.length);
    switch(cmd) {
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

function setVoltage(bytes) {
    var elmVoltageHTML = document.getElementById("elmVoltage");
    elmVoltageHTML.innerText = bytes.toString().replace(",","");
}

function handleAT(bytes) {
    console.log("Received AT code: ", bytes);

    var code = bytes[0];
    value = bytes.slice(1,bytes.length);
    switch(code) {
        case "RV":
            setVoltage(value);
            break;
        default:
            console.log("Received unknown AT code: ",code);
            break;
    }
}

function setVersion(bytes) {
    console.log("Received ELM Version: ", bytes);
    var elmVersionHTML = document.getElementById("elmVersion");
    elmVersionHTML.innerText = bytes.slice(6,bytes.length);
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
            handleAT(bytes.slice(1,bytes.length));
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

    var elmVersionHTML = document.getElementById("elmVersion");
    elmVersionHTML.innerText = "";

    var elmVoltageHTML = document.getElementById("elmVoltage");
    elmVoltageHTML.innerText = "";
}

function initiateELM327() {
    waitingForResponse = false;
    receiveBuffer = "";
    subscriptions = [];
    curSub = 0;
    sendBuffer = ["ATZ","AL1","ATE0","ATAT2","ATRV","ATST0A","ATS0","ATL0","ATSP0","ATH0","0100","0101","0902","011C"];
    capabilities = "";

    sendTimer = setInterval(sendData,30);
    //subscriptionTimer = setInterval(sendSubscriptions,80);
}

function resetELM327() {
    clearInterval(sendTimer);
    //clearInterval(subscriptionTimer);

    clearVehicleStatusGUI();
}

win.on('close', () => {
    gwin.close();
});

window.onload = function () {
    if(gwin == null) {
        gwin = new BrowserWindow({ x: 0, y: 0, width: 800, height: 800, autoHideMenuBar: true});
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
        if(gwin == null) {
            gwin = new BrowserWindow({ parent: win, width: 800, height: 800});
            gwin.loadFile('html/graph.html');
        }
        var raw = receiveBuffer + data.toString("utf8");

        console.log("onData: data from socket is: "+data.toString("utf8")+" receiveBuffer is: "+receiveBuffer);
        var commandArray = raw.split(">");

        if(commandArray.length <= 1) {
            receiveBuffer = commandArray[0];
        } else {
            for(var i = 0; i < commandArray.length; i++) {
                var command = commandArray[i];
                if(command === '') {
                    continue;
                }

                message = message.replace(/ /g,'');
                var lines = message.split("\r").filter(Boolean);
                console.log(lines);
                
                var data = "";
                if(message.indexOf(":")) {
                  console.log("Multiline!");
                  var numBytes = Number.parseInt(lines[0],16);
                  console.log("expecting numbytes: ", numBytes);
                  
                  
                  for(var i = 1; i < lines.length; i++) {
                    data += lines[i].split(":")[1];
                  }
                  console.log("multiline data: ",data);
                  handleDataReceived(data);
                } else {
                    // maybe this is not needed!
                    for(var j = 0; j < lines.length; j++) {
                        var line = lines[j];
                        handleDataReceived(line);
                    }
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