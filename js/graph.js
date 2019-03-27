const Chart = require('../node_modules/chart.js/dist/Chart.js');
const cz = require('../node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom');
//const cjs = require('../node_modules/chartjs-plugin-streaming/dist/chartjs-plugin-streaming');

const { ipcRenderer } = require('electron');

var OBDPIDs = require("../js/OBD2_PIDS");

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

var colorNames = Object.keys(chartColors);

function onRefresh(chart) {
    console.log("Refresh");
}

window.onload = function() {
    var ctx = document.getElementById("myChart");
    window.graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: [],
                cubicInterpolationMode: 'monotone',
                label: "Engine RPM",
                borderColor: "#3e95cd",
                fill: false
            }]
        },
        options: {
            title: {
                display: true,
                text: "OBD2 Data Graph"
            },
            scales: {
                xAxes: [{
                    type: 'time'                
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
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
                mode: 'y',
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
    });

    ipcRenderer.on('newGraphData', (event, data) => {
        console.log("New Graph Data", data.data);
        //window.graph.data.labels.push(data.label);
        var type = data.data.slice(0,2);
        var idx = -1;
        window.graph.data.datasets.forEach((dataset, index) => {
            console.log("Comparing label: "+dataset.label+" with obdcode: "+ OBDPIDs.service01[type].name);
            if(dataset.label == OBDPIDs.service01[type].name){
                console.log("Found dataset index: ",index);
                idx = index;
            }
        });
        var value = data.data.slice(2);

        if(idx<0){
            var colorName = colorNames[window.graph.data.datasets.length % colorNames.length];
            var newColor = chartColors[colorName];
            const ds = {
                label: OBDPIDs.service01[type].name,
                backgroundColor: color(newColor).alpha(0.5).rgbString(),
                borderColor: newColor,
                fill: false,
                cubicInterpolationMode: 'monotone',
                data: []
            }
            idx = (window.graph.data.datasets.push(ds) - 1);
            console.log("Added new dataset: ", ds.label," at idx: ",idx);
        }
        window.graph.data.datasets[idx].data.push({ x: data.label, y: Number.parseInt(value,16)});
        window.graph.update();
    });
}
