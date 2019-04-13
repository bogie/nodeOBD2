const EventEmitter = require('events');

class Connection extends EventEmitter {
    constructor(type, properties) {
        super();
        this.type = type;
        this.properties = properties;
        this.lastMsgSent = 0;
        this.latency = -1;
    }

    send(data) {
        this.lastMsgSent = Date.now();
    }
}

var exports = module.exports = Connection;