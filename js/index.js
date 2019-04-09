const electron = require('electron');
const { remote, ipcRenderer } = require('electron');
const net = require('net');
const {BrowserWindow} = remote;
const win = BrowserWindow.getFocusedWindow();

const Chart = require('../node_modules/chart.js/dist/Chart');

var OBDPIDs = require("../js/OBD2_PIDS");

var receiveBuffer;
const subscriptions = [];
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
        win.socket.write("01"+subscriptions[curSub]+"\r");
        curSub++;
        if(curSub == subscriptions.length)
            curSub = 0;
    }
}

function resetHard() {
    sendToOBD2("ATPPFFOFF");
}

function sendSubscriptions() {
    win.socket.write("01"+subscriptions[curSub]+"\r");
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
    if(data.indexOf("01") == 0) {
        if(capabilities & Number.parseInt(data.substr(2,2),16)) {
            sendBuffer.push(data);
        } else {
            console.log("Error request not supported: ",data);
        }
    } else {
        sendBuffer.push(data);
    }
}

function logOut(text) {
    var log = document.getElementById("logBox");
    log.value += text + "\n";
    log.scrollTop = log.scrollHeight;
}

function handleRealtimeData(type,value) {
    var data = {};
    data.time = new Date().getTime();
    data.type = type;
    data.value = value;
    gwin.send('newGraphData', data);
}

function onPidsClicked(elmnt) {
    var opcode = elmnt.getAttribute("id");
    console.log("Subscriptions pre check: ",subscriptions);
    if(elmnt.checked) {
        console.log("Checked box: ",opcode);
        subscriptions.push(opcode);
        console.log("Added new subscription: ",subscriptions);
    } else {
        console.log("Unchecked box: ", opcode);
        var subIdx = subscriptions.indexOf(opcode);
        console.log("removing subIdx:"+subIdx+" from subscriptions: ",subscriptions);
        if(subscriptions.length > 1) {
            subscriptions.splice(subIdx,1);
        } else {
            subscriptions.splice(0,subscriptions.length);
        }
        console.log("Subscriptions after remove: ",subscriptions);
    }
}

function setPidsSupported(value) {
    // Todo: rewrite entire Pids system to bitwise operations
    var pidInfo = OBDPIDs.service01["00"];
    var pidList = document.getElementById("PIDList");
    
    console.log("setPidsSupported recevied value: ",value);
    var pids = pidInfo.convert(value);
    console.log("setPidsSupported: ",pids);
    capabilities = Number.parseInt(pids,2);
    for(var i = 0; i < pids.length; i++) {
        var num = i+1;
        console.log("pids["+num+"] is: "+pids[i]);
        if(pids[i] == "1") {
            var idx = num.toString(16).toUpperCase();
            if(idx.length == 1)
                idx = "0"+num.toString(16).toUpperCase();
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
                checkBoxNode.setAttribute("id",idx);
                checkBoxNode.setAttribute("onClick","onPidsClicked(this)");
                node.appendChild(checkBoxNode);
            }
            pidList.appendChild(node);
        }
    }
    console.log("Parsed capabilities: ",capabilities);
    if(capabilities & 20) {
        console.log("requesting extended PIDS");
        sendToOBD2("0120");
    }
    if(capabilities & 40) {
        sendToOBD2("0140");
    }
}

function mode1_freezeDTC(value) {
    logOut("DTC freeze successfull");
}

function mode1_statusDTC(value) {
    var pidInfo = OBDPIDs.service01["01"];
    var status = pidInfo.convert(value);
    logOut("Received DTC Status binary: "+status);
    // MIL light
    var MILstatus = document.getElementById("monitorStatus");
    if(status[0] == "1") {
        var numMil = Number.parseInt(status.slice(1,8),2);
        MILstatus.innerText = "Check Engine, "+numMil+" faults";
    } else {
        MILstatus.innerText = "Engine OK";
    }
}

function mode1_fuelSystemStatus(value) {
    var pidInfo = OBDPIDs.service["03"];
    var status = pidInfo.convert(value);
    logOut("Received fuelSystemStatus: "+status);
}

function mode1_OBD2Standard(value) {
    var statusHtml = document.getElementById("OBDStandard");
    var num = Number.parseInt(value[0],16);
    statusHtml.innerText = num;
    logOut("Set OBD2Standard: "+num);
}

function handleMode1(bytes) {
    console.log("Received mode1: ",bytes);
    while(bytes.length>0) {
        var type = bytes.splice(0,1).toString();
        console.log("handleMode1: received type: ",type);
        var pidInfo = OBDPIDs.service01[type];
        var value = bytes.splice(0,pidInfo.length);
        console.log("handleMode1: value is ",value);
        
        if(pidInfo.realtime == true) {
            console.log("Received PID: "+pidInfo.name+" with data: "+value);
            handleRealtimeData(type,value);
            return;
        }
        switch(type) {
            case "00":
            case "20":
            case "40":
                setPidsSupported(value);
                break;
            case "01":
                mode1_statusDTC(value);
                break;
            case "02":
                mode1_freezeDTC(value);
                break;
            case "03":
                mode1_fuelSystemStatus(value);
                break;
            case "1C":
                mode1_OBD2Standard(value);
                break;
            case "12":
                break;
            case "13":
                break;
            default:
                console.log("Received unknown Mode1: ",type);
                break;
        }
    }
}

function setVIN(bytes){
    var vinLabel = document.getElementById("vinLabel");
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
            waitingForResponse = false;
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

    console.log("handleDataReceived: got line: ",line);

    if(line.startsWith("SEARCHING")) {
        console.log("Waiting for response");
        return;
    }

    if(line.endsWith("V")) {
        waitingForResponse = false;
        setVoltage(line);
        return;
    }

    if(line.startsWith("ELM")) {
        waitingForResponse = false;
        setVersion(line);
        return;
    }

    if(line.startsWith("OK") || line.startsWith("?") || line.startsWith("NODATA")){
        waitingForResponse = false;
        return;
    }

    for(bytesNum = 0; bytesNum < line.length; bytesNum += 2) {
        bytes.push(line.substr(bytesNum,2));
    }
    
    //console.log("handleDataReceived converted to bytes: ", bytes);
    logOut('Received: '+line);

    switch(bytes[0]) {
        case "AT":
            waitingForResponse = false;
            handleAT(bytes.slice(1,bytes.length));
            break;
        case "41":
            waitingForResponse = false;
            handleMode1(bytes.slice(1,bytes.length));
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
    while(pidList.hasChildNodes()) {
        pidList.removeChild(pidList.firstChild);
    }

    var vinLabel = document.getElementById("vinLabel");
    vinLabel.innerText = "Not connected";

    var obdLabel = document.getElementById("OBDStandard");
    obdLabel.innerText = "Not connected";

    var milStatus = document.getElementById("monitorStatus");
    milStatus.innerText = "Not connected";

    var elmVersionHTML = document.getElementById("elmVersion");
    elmVersionHTML.innerText = "Not connected";

    var elmVoltageHTML = document.getElementById("elmVoltage");
    elmVoltageHTML.innerText = "Not connected";
}

function initiateELM327() {
    waitingForResponse = false;
    receiveBuffer = "";
    subscriptions.splice(0,subscriptions.length);
    curSub = 0;
    sendBuffer = ["ATZ","ATAL1","ATE0","ATAT2","ATRV","ATST0A","ATS0","ATL0","ATSP0","ATH0","0100","0101","0902","011C"];
    capabilities = ["00"];

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
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    if(gwin == null) {
        gwin = new BrowserWindow({ x: width/2, y: 0, width: width/2, height: height, autoHideMenuBar: true});
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

        //console.log("onData: data from socket is: "+data.toString("utf8")+" receiveBuffer is: "+receiveBuffer);
        var commandArray = raw.split(">");

        if(commandArray.length <= 1) {
            receiveBuffer = commandArray[0];
        } else {
            for(var i = 0; i < commandArray.length; i++) {
                var message = commandArray[i];
                if(message === '') {
                    continue;
                }

                message = message.replace(/ /g,'');
                var lines = message.split("\r").filter(Boolean);
                if(lines.length == 0)
                    continue;
                
                var data = "";
                if(lines.length > 1 && message.indexOf(":")) {
                  //console.log("Multiline!");
                  var numBytes = Number.parseInt(lines[0],16);
                  //console.log("expecting numbytes: ", numBytes);
                  
                  
                  for(var i = 1; i < lines.length; i++) {
                    data += lines[i].split(":")[1];
                  }
                  //console.log("multiline data: ",data);
                  handleDataReceived(data);
                } else {
                    for(var j = 0; j < lines.length; j++) {
                        var line = lines[j];
                        handleDataReceived(line);
                    }
                }    
            }
            receiveBuffer = '';
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