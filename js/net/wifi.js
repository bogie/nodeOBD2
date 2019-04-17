const net = require('net');
const Connection = require('./connection');

class WiFiConnection extends Connection {
    constructor(properties) {
        super("WiFi", properties);
        this.socket = null;
    }

    init() {
        this.socket = new net.Socket();
        //this.socket.setEncoding('ascii');

        this.socket.on('ready', () => {
            console.log("ready!");
            //super.ready();
            super.emit('ready');
        });

        this.socket.on('data', (data) => {
            this.latency = Date.now() - this.lastMsgSent;
            super.emit('data', data);
        });

        this.socket.on('error', (error) => {
            super.emit('error', error);
        });

        this.socket.on('close', () => {
            super.emit('disconnected');
        })
    }

    connect(host, port) {
        this.socket.connect(port, host, () => {
            console.log("Connecting to: " + host + "@" + port);
        });
    }

    disconnect() {
        this.socket.end();
        super.emit('disconnected');
    }

    send(data) {
        super.send();
        console.log("Sending data via WiFi, data: " + data);
        this.socket.write(data);
    }
}

var exports = module.exports = WiFiConnection;