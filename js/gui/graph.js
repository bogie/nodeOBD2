const Chart = require('chart.js');
const cz = require('chartjs-plugin-zoom');
const { ipcRenderer } = require('electron');

var OBDPIDs = require("../js/obd2/OBD2_PIDS");

const color = Chart.helpers.color;

var chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

var scalePosition = "left";
var colorNames = Object.keys(chartColors);

var opts = {
    title: {
        display: true,
        text: "OBD2 Data Graph"
    },
    scales: {
        xAxes: [{
            type: 'time'                
        }],
        yAxes: [{
            type: 'linear',
            position: 'left',
            id: "dummy",
            display: false,
            gridLines: {
                drawOnChartArea: true, // only want the grid lines for one axis to show up
            },
            min: 0,
            max: 100
        }]
    },
    responsive: true,
    tooltips: {
        mode: 'nearest',
        intersect: false
    },
    hover: {
        mode: 'nearest',
        intersect: false
    },
    pan: {
        enabled: true,
        mode: 'xy',
        rangeMin: {
            x: null,
            y: null
        },
        rangeMax: {
            x: null,
            y: null
        },
        onPan: function({chart}) { console.log("I was panned"); }
    },
    zoom: {
        enabled: true,
        drag: false,
        mode: 'x',
        rangeMin: {
            x: null,
            y: 0
        },
        rangeMax: {
            x: null,
            y: null
        },
        onZoom: function({chart}) { console.log("I was zoomed"); }
    }
}

var lineChartData = {};

function addYAxis(type, pidInfo,newColor) {
    opts.scales.yAxes.push({
        type: "linear",
        display: true,
        position: scalePosition,
        id: type,
        ticks: {
            fontColor: newColor,
            precision: 2
        },
        min: pidInfo.min,
        max: pidInfo.max
    });
    window.graph.destroy();
    var ctx = document.getElementById("myChart").getContext("2d");
    window.graph = Chart.Line(ctx, {
        data: lineChartData,
        options: opts
    });
    scalePosition = (scalePosition == "left") ? "right" : "left" 
}

window.onload = function() {
    var ctx = document.getElementById("myChart");
    window.graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: opts
    });

    ipcRenderer.on('newGraphData', (event, data) => {
        console.log("newGraphData: data object: ",data);
        var pidInfo = OBDPIDs.service01[data.type];
        var idx = -1;
        console.log("Got OBD data with type: <",data.type,"> and data: <",data.value,">");
        window.graph.data.datasets.forEach((dataset, index) => {
            console.log("Comparing label: "+dataset.label+" with obdcode: "+ pidInfo.name);
            if(dataset.label == pidInfo.name){
                console.log("Found dataset index: ",index);
                idx = index;
            }
        });

        var value;
        if(pidInfo.hasOwnProperty("convert")) {
            value = pidInfo.convert(data.value);
        } else {
            value = data.value;
        }
        if(idx<0){
            var colorName = colorNames[window.graph.data.datasets.length % colorNames.length];
            var newColor = chartColors[colorName];
            const ds = {
                label: pidInfo.name,
                backgroundColor: color(newColor).alpha(0.5).rgbString(),
                borderColor: newColor,
                fill: false,
                cubicInterpolationMode: 'monotone',
                data: [],
                yAxisID: data.type
            }
            idx = (window.graph.data.datasets.length);
            window.graph.data.datasets.push(ds);
            lineChartData.datasets = window.graph.data.datasets;
            addYAxis(data.type,pidInfo,newColor);
            console.log("Added new dataset: ", ds.label," at idx: ",idx);
            window.graph.update();
        }
        window.graph.data.datasets[idx].data.push({ x: data.time, y: value});
        window.graph.update();
    });
}