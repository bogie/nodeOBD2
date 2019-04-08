/*function hex2bin(bytes) {
    console.log("hex2bin received bytes: ",bytes);
    var binArray = "";
    for(var i = 0; i < bytes.length; i++) {
        var rawBin = Number.parseInt(bytes[i],16).toString(2);
        var missing = 8 - rawBin.length;
        var bin = "";
        for(var j = 0; j < missing; j++) {
            bin += "0";
        }
        bin += rawBin;
        binArray += bin;
        console.log("hex2Bin: appending bin -> ",bin);
    }
    return binArray;
}*/

function hex2bin(hex) {
    if(Array.isArray(hex)) {
        console.log("hex2bin: hex is an array, changing to string");
        hex = hex.toString();
        console.log("hex2bin new hex: ",hex);
        hex = hex.replace(/,/g,"");        
    }
    console.log("hex2bin replaced hex: ",hex);
    var bin = Number.parseInt(hex,16).toString(2);
    console.log("hex2bin: bin is: "+bin+" with length: "+bin.length);

    while(bin.length%4 != 0) {
        bin = "0" + bin;
    }
    console.log("Returning new bin: ",bin);
    return bin;
}

function convertPIDsSupported(bytes) {
    /*var missing = 32 - bits.toString(2).length;
    var bin = "";
    for(var i = 0; i <missing; i++) {
        bin += "0";
    }
    bin += bits.toString(2);
    return bin;*/
    
    return hex2bin(bytes);
}

function convertMonitorStatus(bytes) {
    return hex2bin(bytes);
}

function convertFuelStatus(bytes) {
    var bin = hex2bin(bytes);
    var result = {};
    result.system1 = (Number.parseInt(bin[0],2)+1);
    if(bytes.length>1)
        result.system2 = (Number.parseInt(bin[1],2)+1);
    return result;
}

function convertPercent(bytes) {
    return Number.parseInt(bytes[0],16)/2.55;
}

function convertTemperature(bytes) {
    var temp = Number.parseInt(bytes[0],16);
    temp -= 40;
    console.log("setting temp: "+temp+" from bytes: "+bytes);
    return temp;
}

function convertFuelTrim(bytes) {
    return Number.parseInt(bytes[0],16)/1.28;
}

function convertFuelPressure(bytes) {
    return Number.parseInt(bytes[0],16)*3;
}

function convertAbsolutePressure(bytes) {
    return Number.parseInt(bytes[0],16);
}

function convertRPM(bytes) {
    var firstRaw = 256 * Number.parseInt(bytes[2],16);
    var secondRaw;
    var RPM;

    if(bytes.length>3){
        secondRaw = Number.parseInt(bytes[3],16);
    } else {
        secondRaw = 0;
    }
    RPM = (firstRaw + secondRaw)/4;
    return RPM;
}
function convertSpeed(bytes) {
    return Number.parseInt(bytes[0],16)
}

function convertTimingAdvance(bytes) {
    return (Number.parseInt(bytes[0],16)/2)-64;
}

function convertMAFairFlowRate(bytes) {
    var firstRaw = 256 * Number.parseInt(bytes[2],16);
    var secondRaw;
    var flowRate;

    if(bytes.length>3){
        secondRaw = Number.parseInt(bytes[3],16);
    } else {
        secondRaw = 0;
    }
    flowRate = (firstRaw + secondRaw)/100;
    return flowRate;
}

function convertOxygenBits(bytes) {
    var bits = hex2bin(bytes);

    var bank1 = [];
    var bank2 = [];
    for(var i = 0; i <4; i++) {
        if(bits[i] == "1")
            bank1.push(i);
    }
    for(var i = 4; i < 8; i++) {
        if(bits[1] == "1")
            bank2.push(i);
    }
    return {"bank1": bank1, "bank2": bank2};
}

function convertOxygenSensor(bytes) {
    var voltage = Number.parseInt(bytes[0],16)/200;
    var trim = Number.parseInt(bytes[1],16)/1.28;
    trim -= 100;
    return {"voltage": voltage, "trim": trim};
}

function convertAuxInputStatus(bytes) {
    var bits = hex2bin(bytes);
    if(bits[0] == "1") {
        return "PTO Active";
    } else {
        return "PTO inactive";
    }
}

function convertRuntime(bytes) {
    return (Number.parseInt(bytes[0],16)*256)+Number.parseInt(bytes[1],16);
}

function convertFuelRailPressure(bytes) {
    return ((Number.parseInt(bytes[0],16)*256)+Number.parseInt(bytes[1],16))*0.079;
}

function convertFuelRailGaugePressure(bytes) {
    return ((Number.parseInt(bytes[0],16)*256)+Number.parseInt(bytes[1],16))*10;
}

function convertOSFuelAirVoltage(bytes) {
    var fuelAirRatio = 2/65536;
    fuelAirRatio *= (256*Number.parseInt(bytes[0],16)+Number.parseInt(bytes[1],16));

    var voltage = 8/65536;
    voltage *= (256*Number.parseInt(bytes[2],16)+Number.parseInt(bytes[3],16));

    return {"fuelAirRatio": fuelAirRatio, "voltage": voltage};
}

function convertSysVapPressure(bytes){
    var pressure = Number.parseInt(bytes[0],16)*256;
    pressure += Number.parseInt(bytes[1],16);
    pressure /= 4;

    // twos compliment?!?!?!?!
    pressure = ~pressure +1;
    return pressure;
}

var fuelSystemStatus = [
    "Open loop due to insufficient engine temperature",
    "Closed loop, using oxygen sensor feedback to determine fuel mix",
    "Open loop due to engine load OR fuel cut due to deceleration",
    "Open loop due to system failure",
    "Closed loop, using at least one oxygen sensor but there is a fault in the feedback system"
]
var OBDStandard = [
    "Zero",
    "OBD-II as defined by the CARB",
    "OBD as defined by the EPA",
    "OBD and OBD-II",
	"OBD-I",
    "Not OBD compliant",
    "EOBD (Europe)",
    "EOBD and OBD-II",
    "EOBD and OBD",
    "EOBD, OBD and OBD II",
    "JOBD (Japan)",
    "JOBD and OBD II",
    "JOBD and EOBD",
    "JOBD, EOBD, and OBD II",
    "Reserved",
    "Reserved",
    "Reserved",
    "Engine Manufacturer Diagnostics (EMD)",
    "Engine Manufacturer Diagnostics Enhanced (EMD+)",
    "Heavy Duty On-Board Diagnostics (Child/Partial) (HD OBD-C)",
    "Heavy Duty On-Board Diagnostics (HD OBD)",
    "World Wide Harmonized OBD (WWH OBD)",
    "Reserved",
    "Heavy Duty Euro OBD Stage I without NOx control (HD EOBD-I)",
    "Heavy Duty Euro OBD Stage I with NOx control (HD EOBD-I N)",
    "Heavy Duty Euro OBD Stage II without NOx control (HD EOBD-II)",
    "Heavy Duty Euro OBD Stage II with NOx control (HD EOBD-II N)",
    "Reserved",
    "Brazil OBD Phase 1 (OBDBr-1)",
    "Brazil OBD Phase 2 (OBDBr-2)",
    "Korean OBD (KOBD)",
    "India OBD I (IOBD I)",
    "India OBD II (IOBD II)",
    "Heavy Duty Euro OBD Stage VI (HD EOBD-IV)"
]

var fuelTypes = [
    "Not available",
    "Gasoline",
    "Methanol",
    "Ethanol",
    "Diesel",
    "LPG",
    "CNG",
    "Propane",
    "Electric",
    "Bifuel running Gasoline",
    "Bifuel running Methanol",
    "Bifuel running Ethanol",
    "Bifuel running LPG",
    "Bifuel running CNG",
    "Bifuel running Propane",
    "Bifuel running Electricity",
    "Bifuel running electric and combustion engine",
    "Hybrid gasoline",
    "Hybrid Ethanol",
    "Hybrid Diesel",
    "Hybrid Electric",
    "Hybrid running electric and combustion engine",
    "Hybrid Regenerative",
    "Bifuel running diesel"
]

var PIDs = {
    service01 : {
        "00": { realtime: false, name: "PIDs supported", length: 4, unit: "Bitencoded", convert: convertPIDsSupported},
        "01": { realtime: false, name: "Monitor status since DTCs cleared", length: 4, unit: "Bitencoded", convert: convertMonitorStatus},
        "02": { realtime: false, name: "Freeze DTC", length: 2},
        "03": { realtime: false, name: "Fuel System Status", length: 2, unit: "Bitencoded", convert: convertFuelStatus},
        "04": { realtime: true, name: "Calculated engine load", min: 0, max: 100, length: 1, unit: "%", convert: convertPercent},
        "05": { realtime: true, name: "Engine coolant temperature", min: -40, max: 215, length: 1, unit: "Celsius", convert: convertTemperature},
        "06": { realtime: true, name: "Short term fuel trim - Bank 1", min: -100, max: 99.2, length: 1, unit: "%", convert: convertFuelTrim},
        "07": { realtime: true, name: "Long term fuel trim - Bank 1", min: -100, max: 99.2, length: 1, unit: "%", convert: convertFuelTrim},
        "08": { realtime: true, name: "Short term fuel trim - Bank 2", min: -100, max: 99.2, length: 1, unit: "%", convert: convertFuelTrim},
        "09": { realtime: true, name: "Long term fuel trim - Bank 2", min: -100, max: 99.2, length: 1, unit: "%", convert: convertFuelTrim},
        "0A": { realtime: true, name: "Fuel pressure", min: 0, max: 765, length: 1, unit: "kPa", convert: convertFuelPressure},
        "0B": { realtime: true, name: "Intake manifold absolute pressure", min: 0, max: 255, length: 1, unit: "kPa", convert: convertAbsolutePressure},
        "0C": { realtime: true, name: "Engine RPM", min: 0, max: 16383.75, length: 2, unit: "RPM", convert: convertRPM},
        "0D": { realtime: true, name: "Vehicle Speed", min: 0, max: 255, length: 1, unit: "km/h", convert: convertSpeed},
        "0E": { realtime: true, name: "Timing Advance", min: -64, max: 63.5, length: 1, unit: "° before TDC", convert: convertTimingAdvance},
        "0F": { realtime: true, name: "Intake air temperature", min: -40, max: 215, length: 1, unit: "Celsius", convert: convertTemperature},
        "10": { realtime: true, name: "MAF air flow rate", min: 0, max: 655.35, length: 2, unit: "g/s", convert: convertMAFairFlowRate},
        "11": { realtime: true, name: "Throttle position", min: 0, max: 100, length: 1, unit: "%", convert: convertPercent},
        "12": { realtime: false, name: "Commanded secondary air status", length: 1, unit: "bitencoded", convert: hex2bin},
        "13": { realtime: false, name: "Oxygen sensors present (in 2 banks)", length: 1, unit: "bitencoded", convert: convertOxygenBits},
        "14": { realtime: true, name: "Oxygen Sensor 1(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2], length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "15": { realtime: true, name: "Oxygen Sensor 2(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "16": { realtime: true, name: "Oxygen Sensor 3(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "17": { realtime: true, name: "Oxygen Sensor 4(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "18": { realtime: true, name: "Oxygen Sensor 5(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "19": { realtime: true, name: "Oxygen Sensor 6(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "1A": { realtime: true, name: "Oxygen Sensor 7(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "1B": { realtime: true, name: "Oxygen Sensor 8(A: Voltage, B: Short term fuel trim", min: [0,-100], max: [1.275, 99.2],length: 2, unit: ["Voltage","% Trim"], convert: convertOxygenSensor},
        "1C": { realtime: false, name: "OBD standards this vehicle conforms to", length: 1, unit: "bitencoded", convert: hex2bin},
        "1D": { realtime: false, name: "Oxygen sensors present (in 4 banks)", length: 1, unit: "bitencoded", convert: hex2bin},
        "1E": { realtime: false, name: "Auxillary input status", length: 1, unit: "bitencoded", convert: convertAuxInputStatus},
        "1F": { realtime: true, name: "Run time since engine start", min: 0, max: 65535, length: 2, unit: "seconds", convert: convertRuntime},
        "20": { realtime: false, name: "PIDs supported(21-40)", length: 4, unit: "bitencoded", convert: convertPIDsSupported},
        "21": { realtime: true, name: "Distance traveled with malfunction indicator lamp (MIL) on", min: 0, max: 65535, length: 2, unit: "km", convert: convertRuntime},
        "22": { realtime: true, name: "Fuel Rail Pressure (relative to manifold vacuum)", min: 0, max: 5177.265, length: 2, unit: "kPa", convert: convertFuelRailPressure},
        "23": { realtime: true, name: "Fuel Rail Gauge Pressure (diesel, or gasoline direct injection)", min: 0, max: 655350, length: 2, unit: "kPa", convert: convertFuelRailGaugePressure},
        "24": { realtime: true, name: "Oxygen Sensor 1(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "25": { realtime: true, name: "Oxygen Sensor 2(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "26": { realtime: true, name: "Oxygen Sensor 3(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "27": { realtime: true, name: "Oxygen Sensor 4(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "28": { realtime: true, name: "Oxygen Sensor 5(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "29": { realtime: true, name: "Oxygen Sensor 6(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "2A": { realtime: true, name: "Oxygen Sensor 7(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "2B": { realtime: true, name: "Oxygen Sensor 8(AB: Fuel-Air Equivalence Ratio, CD: Voltage)", min: [0,0], max: [2,8], length: 4, unit: ["Fuel/Air Ratio","Voltage"], convert: convertOSFuelAirVoltage},
        "2C": { realtime: true, name: "Commanded EGR", min: 0, max: 100, length: 1, unit: "%", convert: convertPercent},
        "2D": { realtime: true, name: "EGR Error", min: -100, max: 99.2, length: 1, unit: "%", convert: convertFuelTrim},
        "2E": { realtime: true, name: "Commanded evaporative purge", min: 0, max: 100, length: 1, unit: "%", convert: convertPercent},
        "2F": { realtime: true, name: "Fuel Tank Level Input", min: 0, max: 100, length: 1, unit: "%", convert: convertPercent},
        "30": { realtime: true, name: "Warm-ups since codes cleared", min: 0, max: 255, length: 1, unit: "count", convert: () => {return Number.parseInt(bytes[0],16);}},
        "31": { realtime: true, name: "Distance traveled since codes cleared", min: 0, max: 65535, length: 2, unit: "km", convert: convertRuntime},
        "32": { realtime: true, name: "Evap. System Vapor Pressure", min: -8192, max: 8191.75, length: 2, unit: "Pa", convert: convertSysVapPressure},
        "33": { realtime: true, name: "Absolute Baormetric Pressure",min: 0, max: 255, length: 1, unit: "kPa", convert: convertAbsolutePressure},
        "34": { realtime: true, name: "Oxygen Sensor 1(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "35": { realtime: true, name: "Oxygen Sensor 2(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "36": { realtime: true, name: "Oxygen Sensor 3(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "37": { realtime: true, name: "Oxygen Sensor 4(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "38": { realtime: true, name: "Oxygen Sensor 5(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "39": { realtime: true, name: "Oxygen Sensor 6(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "3A": { realtime: true, name: "Oxygen Sensor 7(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "3B": { realtime: true, name: "Oxygen Sensor 8(AB: Fuel-Air Equivalence Ratio, CD: Current)"},
        "3C": { realtime: true, name: "Catalyst Temperature: Bank 1, Sensor 1"},
        "3D": { realtime: true, name: "Catalyst Temperature: Bank 2, Sensor 1"},
        "3E": { realtime: true, name: "Catalyst Temperature: Bank 1, Sensor 2"},
        "3F": { realtime: true, name: "Catalyst Temperature: Bank 2, Sensor 2"},
        "40": { realtime: false, name: "PIDs supported(41-60)"}
    }
};

var exports = module.exports = PIDs;