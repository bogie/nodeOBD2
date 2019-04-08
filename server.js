const net = require('net');
const ECU_ADDR = "7E8";
const settings = {
    "echo" : true,
    "headers" : true,
    "headerBytes" : ECU_ADDR,
    "dataLenghts" : true,
    "timeout" : 32,
    "monitoring" : false,
    "spaces" : true,
    "adaptiveTiming" : 1,
    "protocol" : 0,
    "lineFeed" : false,
    "longBytes" : false
}

const version = "ELM327 v2.1";
const description = "OBDII to RS232 Interpreter";
const identifier = "";

const VIN = "WF0KXXGCBKEJ66629";

const voltage = "12.6V";

const protocols = {
    "0" : "Automatic",
    "1" : "SAE J1850 PWM (41.6 kbaud)",
    "2" : "SAE J1850 VPW (10.4 kbaud)",
    "3" : "ISO 9141-2 (5 baud init, 10.4 kbaud)",
    "4" : "ISO 14230-4 KWP (5 kbaud init, 10.4 kbaud)",
    "5" : "ISO 14230-4 KWP (fast init, 10.4 kbaud)",
    "6" : "ISO 15765-4 CAN (11 bit ID, 500 kbaud)",
    "7" : "ISO 15765-4 CAN (29 bit ID, 500 kbaud)",
    "8" : "ISO 15765-4 CAN (11 bit ID, 250 kbaud)",
    "9" : "ISO 15765-4 CAN (29 bit ID, 250 kbaud)",
    "A" : "SAE J1939 CAN (29 bit ID, 250* kbaud)",
    "B" : "USER1 CAN (11* bit ID, 125* kbaud)",
    "C" : "USER2 CAN (11* bit ID, 50* kbaud)"
}

const timings = {
    0 : "Off",
    1 : "Default",
    2 : "Aggressive"
}


const server = net.createServer((c) => {
    c.setEncoding('ascii');
    c.send = function send(data) {
        if(!settings.lineFeed) {
            data += "\r";
            data += ">\r";
        } else {
            data += "\r\n";
            data += ">\r\n";
        }

        if(!settings.spaces) {
            data = data.replace(" ","");
        }
        console.log(" Sending: ",data);
        c.write(data);
    };
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.on('data', (data) => {
        onDataRcv(c, data);
    });
    c.on('error', (error) => {
        console.log("Got error: ",error);
    });
    c.on('close', () => {
        console.log("Socket closed");
    })
});

server.listen(35000, () => {
    console.log("Bound on port: ",35000);
});

class Command {
    constructor() {
        this.type = -1;
        this.OBDmode = -1;
        this.OBDrequests = [];
        this.header = "";
    }
};

function onDataRcv(socket,data) {
    console.log('Received data: ', data.toString());

    const msg = data.toString().trim();

    const resp = new Command();
    
    if(msg.length == 1) {
        setMonitoring(socket, false);
        return;
    }

    if(msg.startsWith("AT")) {
        if(msg.startsWith("AT@1")) {
            sendDeviceDescription(socket);
            return;
        }

        if(msg.startsWith("AT@2")) {
            sendDeviceIdentifier(socket);
            return;
        }

        if(msg.startsWith("AT@3")) {
            setDeviceIdentifier(socket,msg.slice(4));
            return;
        }

        if(msg.startsWith("ATAT")) {
            setAdaptiveTiming(socket, parseInt(msg.charAt(4)));
            return;
        }

        // Defaults and DataLength
        if(msg == "ATD") {
            setDefaults(socket);
            return;
        }

        if(msg.startsWith("ATDP")) {
            if(msg.charAt(4) == "N")
                sendProtocol(socket,true);
            else
                sendProtocol(socket, false);
            return;
        }

        if(msg.startsWith("ATD")) {
            setDataLengths(socket, msg.charAt(3));
            return;
        }

        // Echo
        if(msg.startsWith("ATE")) {
            setEcho(socket, msg.charAt(3));
            return;
        }

        // Headers
        if(msg.startsWith("ATH")) {
            setHeaders(socket, msg.charAt(3));
            return;
        }

        if(msg.startsWith("ATAL")) {
            setAllowLong(socket, msg.charAt(3));
            return;
        }

        // Identify
        if(msg == "ATI") {
            sendVersion(socket);
            return;
        }

        // Low Power Mode
        if(msg.startsWith("ATLP")) {
            setLowPower(socket);
            return;
        }

        // LineFeed
        if(msg.startsWith("ATL")){
            setLineFeed(socket, msg.charAt(3));
            return;
        }

        // Protocol
        if(msg.startsWith("ATSP") || msg.startsWith("ATTP")) {
            console.log("ATSP: ",msg, " length: ",msg.length);
            if(msg.length == 5){
                setProtocol(socket, msg.charAt(4));
            }
            else {

            }
            return;
        }

        if(msg.startsWith("ATSH")) {
            setHeaderBytes(socket,msg.slice(4));
            return;
        }

        // Timeout
        if(msg.startsWith("ATST")) {
            setTimeout(socket, parseInt(msg.slice(4),16));
            return;
        }

        if(msg.startsWith("ATSS")) {
            socket.send("OK");
            return;
        }
        // Spaces
        if(msg.startsWith("ATS")) {
            setSpaces(socket, msg.charAt(3));
            return;
        }
        
        // Monitoring
        if(msg.startsWith("ATMA")) {
            setMonitoring(socket, true);
            return;
        }

        // Todo
        if(msg.startsWith("ATMP")) {
            return;
        }

        if(msg.startsWith("ATMR")) {
            return;
        }

        if(msg.startsWith("ATMT")) {
            return;
        }

        // Memory
        if(msg.startsWith("ATM")) {
            setMemory(socket, msg.charAt(3));
            return;
        }

        // Voltage
        if(msg == "ATRV") {
            sendVoltage(socket);
            return;
        }

        // Reset(Warm)
        if(msg == "ATWS") {
            sendVersion(socket);
            reset(false);
            return;
        }

        // Reset(Hard)
        if(msg == "ATZ") {
            sendVersion(socket);
            reset(true);
            return;
        }

        console.log("Unhandles AT code: ",msg);
        return;
    }

    if(msg.startsWith("ST")){
        console.log("Unhandled ST code: ", msg);
        return;
    }

    switch(msg.slice(0,2)) {
        case "01":
            handleMode1(socket,msg.slice(2));
            break;
        case "02":
            handleMode2(socket,msg.slice(2));
            break;
        case "03":
            handleMode3(socket,msg.slice(2));
            break;
        case "04":
            handleMode4(socket,msg.slice(2));
            break;
        case "07":
            handleMode7(socket,msg.slice(2));
            break;
        case "09":
            handleMode9(socket,msg.slice(2));
            break;
        case "0A":
            handleMode0A(socket,msg.slice(2));
            break;
        case "1A":
            handleMode1A(socket,msg.slice(2));
            break;
        default:
            console.log("Unhandled OBD command: ", msg);
            break;
    }
    
}

// Send Values

function sendDeviceDescription(socket) {
    console.log("Sending description: ", description);
    socket.send(description);
}

function sendDeviceIdentifier(socket) {
    console.log("Sending identifier: ", identifier);
    socket.send(identifier);
}

function sendVersion(socket) {
    console.log("Sending version: ", version);
    socket.send(version);
}

function sendVoltage(socket) {
    console.log("Sending voltage: ", voltage);
    socket.send(voltage);
}

function sendProtocol(socket, number) {
    if(number)
        socket.send("0"+settings.protocol);
    else
        socket.send(protocols[settings.protocol]);
}

// Set Config

function setDeviceIdentifier(socket, value) {
    identifier = value;
    console.log("Set identifer to: ", identifier);
    socket.send("OK");
}

function setDefaults(socket) {
    console.log("Defaults SET");
    socket.send("OK");
}

function setEcho(socket, value) {
    console.log("Echo set to: ",value);
    settings.echo = value;
    socket.send("OK");
}

function setHeaders(socket, value) {
    value == 0 ? settings.headers = false : settings.headers = true;
    console.log("Headers set to: ",settings.headers);
    socket.send("OK");
}

function setAllowLong(socket, value) {
    value == 0 ? settings.longBytes = false : settings.longBytes = true;
    socket.send("OK");
}

function setHeaderBytes(socket, value) {
    settings.headerBytes = value;
    console.log("HeaderBytes set to: ",settings.headerBytes);
    socket.send("OK");
}

function setLowPower(socket) {
    console.log("Entering low power state");
    socket.write("OK");
}

function setDataLengths(socket, value) {
    value == 0 ? settings.dataLengths = false : settings.dataLengths = true;
    console.log("DataLengths set to: ", settings.dataLengths);
    socket.send("OK");
}

function setLineFeed(socket, value) {
    value == 0 ? settings.lineFeed = false : settings.lineFeed = true;
    console.log("LineFeed set to: ", settings.lineFeed);
    socket.send("OK");
}

function setProtocol(socket, value) {
    if(value == 0)
        settings.protocol = 6;
    else
        settings.protocol = value;
    
    console.log("Protocol set to: ", protocols[settings.protocol]);
    socket.send("OK");
}

function setTimeout(socket, value) {
    settings.timeout = value;
    console.log("Timeout set to: ", settings.timeout, "msec");
    socket.send("OK");
}

function setMemory(socket, value) {
    value == 0 ? settings.memory = false : settings.memory = true;
    console.log("Memory set to: ", settings.memory);
    socket.send("OK");
}

function setMonitoring(socket, value) {
    settings.monitoring = value;
    console.log("Monitoring set to: ", settings.monitoring);
    socket.send("OK");
}

function setSpaces(socket, value) {
    value == 0 ? settings.spaces = false : settings.spaces = true;
    console.log("Spaces set to: ", settings.spaces);
    socket.send("OK");
}

function setAdaptiveTiming(socket, value) {
    settings.adaptiveTiming = value;
    console.log("Adaptive Timing set to: ", timings[settings.adaptiveTiming]);
    socket.send("OK");
}

function reset(value) {
    console.log("Resetting:");
    value ? console.log("Hard!") : console.log("Warm!");
}

// OBD Commands

function handleMode1(socket, msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }
    response += "41";
    if(msg == "00") {
        // send PID
        response += "00";
        response += "BFFFFFFF";
        socket.send(response);
        return;
    }

    if(msg == "01") {
        response += "01";
        response += "4D52118";
        socket.send(response);
        return;
    }

    if(msg == "05") {
        // Send ECT
        response += "05";
        response += (40).toString(16);
        socket.send(response);
        return;
    }

    if(msg == "0B") {
        response += "0B";
        response += (50).toString(16);
        socket.send(response);
        return;
    }

    if(msg == "0C") {
        // RPM
        response += "0C";
        response += (4000).toString(16);
        socket.send(response);
        return;
    }
    if(msg == "0D") {
        // Speed
        response += "0D";
        response += (157).toString(16);
        socket.send(response);
        return;
    }

    if(msg == "0F") {
        // Intake Temp AIR
        response += "0F";
        response += (100).toString(16);
        socket.send(response);
        return;
    }

    if(msg == "1C") {
        // OBD Standard
        response += "1C";
        response += "06";
        socket.send(response);
        return;
    }

    socket.send("?");
}

function handleMode3(socket, msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }
    response += "43";
    response += "013300000000";
    socket.send(response);
}

function handleMode7(socket, msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }
    response += "47";
    socket.send(response);
}
function handleMode9(socket, msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }

    response += "49";
    if(msg == "02") {
        // VIN
        // W F0KX XGCB KEJ6 6629
        response += "02";

        // CAN
        socket.write("014\r");
        socket.write("0:"+response+VIN.substr(0,3)+"\r");
        socket.write("1:"+VIN.substr(3,7)+"\r");
        socket.write("2:"+VIN.substr(10,7)+"\r");
        socket.write(">\r");

        //J1850
        /*var raw_vin = "000"+VIN;
        for(var i=0; i<5; i++) {
            var line = response;
            line += "0";
            line += (i+1).toString();
            line += raw_vin.substr(i*4,4);
            console.log("Writing VIN:", line);
            socket.write(line+"\r");
        }
        socket.write(">\r");*/
    }

    if(msg == "04") {
        response += "04";
        socket.write("013\r");
        socket.write("0:"+response+"01"+"353630\r");
        socket.write("1:32383934394143\r");
        socket.write("2:00000000000031\r");
        socket.write(">\r");
        console.log("sent 0904");
    }

    if(msg == "0A") {
        // ECU name
        response += "0A";
        response += "nodeOBD test ECU";
        response += 0x00;
        response += 0x00;
        response += 0x00;
        response += 0x00;
        socket.write(response+="\r");
        socket.write(">\r");
    }

    if(msg == "08") {
        // In use performance tracking
        response += "08";
        socket.write(response+"00"+"\r");
        socket.write(">\r");
    }

    if(msg == "0B") {
        response += "0B";
        socket.write(response+"00"+"\r");
        socket.write(">\r");
    }
}

function handleMode0A(socket,msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }

    response += "4A";
    socket.send(response);
}

function handleMode1A(socket,msg) {
    var response = "";
    if(settings.headers) {
        if(settings.headerBytes.length == 0) {
            response += "416B10";
        } else {
            response += settings.headerBytes;
        }
    }

    response += "5A";
    response += msg.slice(0,2);
    response += "00";
    socket.send(response);
}
