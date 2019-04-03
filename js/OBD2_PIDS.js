function convertPIDsSupported(bits) {
    var missing = 32 - bits.toString(2).length;
    var bin = "";
    for(var i = 0; i <missing; i++) {
        bin += "0";
    }
    bin += bits.toString(2);
    return bin;
}

function convertMonitorStatus(args) {

}

function convertTemperature(bytes) {
    var temp = Number.parseInt(bytes[2],16) - 40;
    console.log("setting temp: ",temp);
    return temp;
}

function convertRPM(bytes) {
    var firstRaw = 256 * Number.parseInt(bytes[2],16);
    var secondRaw = Number.parseInt(bytes[3],16);
    var RPM;
    if(Number.isNaN(secondRaw)){
        RPM = firstRaw;
    } else {
        RPM = firstRaw + secondRaw;
    }

    RPM = RPM/4;
    console.log("Converted RPM: byte[2]="+bytes[2]+" byte[3]="+bytes[3]+"first="+firstRaw+" second= "+secondRaw+" total="+RPM);
    return RPM;
}

var PIDs = {
    service01 : {
        "00": { realtime: false, name: "PIDs supported", unit: "Bitencoded", convert: convertPIDsSupported},
        "01": { realtime: false, name: "Monitor status since DTCs cleared", unit: "Bitencoded", convert: convertMonitorStatus},
        "02": { realtime: false, name: "Freeze DTC"},
        "03": { realtime: false, name: "Fuel System Status"},
        "04": { realtime: true, name: "Calculated engine load"},
        "05": { realtime: true, name: "Engine coolant temperature", unit: "Celsius", convert: convertTemperature},
        "06": { realtime: true, name: "Short term fuel trim - Bank 1"},
        "07": { realtime: true, name: "Long term fuel trim - Bank 1"},
        "08": { realtime: true, name: "Short term fuel trim - Bank 2"},
        "09": { realtime: true, name: "Long term fuel trim - Bank 2"},
        "0A": { realtime: true, name: "Fuel pressure"},
        "0B": { realtime: true, name: "Intake manifold absolute pressure"},
        "0C": { realtime: true, name: "Engine RPM", unit: "RPM", convert: convertRPM},
        "0D": { realtime: true, name: "Vehicle Speed"},
        "0E": { realtime: true, name: "Timing Advance"},
        "0F": { realtime: true, name: "Intake air temperature"},
        "10": { realtime: true, name: "MAF air flow rate"},
        "11": { realtime: true, name: "Throttle position"},
        "12": { realtime: false, name: "Commanded secondary air status"},
        "13": { realtime: false, name: "Oxygen sensors present (in 2 banks)"},
        "14": { realtime: true, name: "Oxygen Sensor 1(A: Voltage, B: Short term fuel trim"},
        "15": { realtime: true, name: "Oxygen Sensor 2(A: Voltage, B: Short term fuel trim"},
        "16": { realtime: true, name: "Oxygen Sensor 3(A: Voltage, B: Short term fuel trim"},
        "17": { realtime: true, name: "Oxygen Sensor 4(A: Voltage, B: Short term fuel trim"},
        "18": { realtime: true, name: "Oxygen Sensor 5(A: Voltage, B: Short term fuel trim"},
        "19": { realtime: true, name: "Oxygen Sensor 6(A: Voltage, B: Short term fuel trim"},
        "1A": { realtime: true, name: "Oxygen Sensor 7(A: Voltage, B: Short term fuel trim"},
        "1B": { realtime: true, name: "Oxygen Sensor 8(A: Voltage, B: Short term fuel trim"},
        "1C": { realtime: false, name: "OBD standards this vehicle conforms to"},
        "1D": { realtime: false, name: "Oxygen sensors present (in 4 banks)"},
        "1E": { realtime: false, name: "Auxillary input status"},
        "1F": { realtime: true, name: "Run time since engine start"},
        "20": { realtime: false, name: "PIDs supported(21-40)"},
        "21": { realtime: true, name: "Distance traveled with malfunction indicator lamp (MIL) on"},
        "22": { realtime: true, name: "Fuel Rail Pressure (relative to manifold vacuum)"},
        "23": { realtime: true, name: "Fuel Rail Gauge Pressure (diesel, or gasoline direct injection)"},
        "24": { realtime: true, name: "Oxygen Sensor 1(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "25": { realtime: true, name: "Oxygen Sensor 2(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "26": { realtime: true, name: "Oxygen Sensor 3(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "27": { realtime: true, name: "Oxygen Sensor 4(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "28": { realtime: true, name: "Oxygen Sensor 5(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "29": { realtime: true, name: "Oxygen Sensor 6(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "2A": { realtime: true, name: "Oxygen Sensor 7(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "2B": { realtime: true, name: "Oxygen Sensor 8(AB: Fuel-Air Equivalence Ratio, CD: Voltage)"},
        "2C": { realtime: true, name: "Commanded EGR"},
        "2D": { realtime: true, name: "EGR Error"},
        "2E": { realtime: true, name: "Commanded evaporative purge"},
        "2F": { realtime: true, name: "Fuel Tank Level Input"},
        "30": { realtime: true, name: "Warm-ups since codes cleared"},
        "31": { realtime: true, name: "Distance traveled since codes cleared"},
        "32": { realtime: true, name: "Evap. System Vapor Pressure"},
        "33": { realtime: true, name: "Absolute Baormetric Pressure"},
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