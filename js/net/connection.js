const EventEmitter = require('events');

class Connection extends EventEmitter{
    constructor(type,properties) {
        super();
        this.type = type;
        this.properties = properties;
    }

    newData(data) {
        this.emit('data', data);
    }

    ready() {
        this.emit('ready');
    }

    disconnect() {
        this.emit('disconnected');
    }
}

var exports = module.exports = Connection;