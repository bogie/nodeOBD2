const Chart = require('chart.js');
const cz = require('chartjs-plugin-zoom');
const ca = require('chartjs-plugin-downsample');
//const cr = require('chartjs-plugin-streaming/dist/chartjs-plugin-streaming')
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
var startTime = -1;

var opts = {
    elements: {
        line: {
            tension: 0 // disables bezier curves
        }
    },
    title: {
        display: true,
        text: "OBD2 Data Graph"
    },
    downsample: {
        enabled: true,
        threshold: 500, // change this

        auto: false, // don't re-downsample the data every move
        onInit: true, // but do resample it when we init the chart (this is default)

        preferOriginalData: true, // use our original data when downscaling so we can downscale less, if we need to.
        restoreOriginalData: false, // if auto is false and this is true, original data will be restored on pan/zoom - that isn't what we want.
    },
    scales: {
        xAxes: [
            {
            type: 'time',
            distribution: 'linear',
            time : {
                unit: 'millisecond',
                stepSize: 100,
                displayFormats: {
                    millisecond: 'ss.SSS'
                },
            min: 0,
            beginAtZero: true
            },/*
            type: 'realtime',
            realtime: {         // per-axis options
                duration: 20000,    // data in the past 20000 ms will be displayed
                refresh: 1000,      // onRefresh callback will be called every 1000 ms
                delay: 1000,        // delay of 1000 ms, so upcoming values are known before plotting a line
                pause: false,       // chart is not paused
                ttl: undefined
            },*/
            ticks: {
                autoSkip: true,
                maxTicksLimit: 20.1
            }
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
        intersect: false,
        animationDuration: 0 // duration of animations when hovering an item

    },
    animation: {
        duration: 0 // general animation time
    },
    responsiveAnimationDuration: 0,
    pan: {
        enabled: true,
        mode: 'x',
        rangeMin: {
            x: null
        },
        rangeMax: {
            x: null
        }
    },
    zoom: {
        enabled: true,
        mode: 'x',
        rangeMin: {
            x: null
        },
        rangeMax: {
            x: null
        }
    },
    downsample: {
        enabled: true,
        threshold: 200, // change this

        auto: false, // don't re-downsample the data every move
        onInit: true, // but do resample it when we init the chart (this is default)

        preferOriginalData: true, // use our original data when downscaling so we can downscale less, if we need to.
        restoreOriginalData: false, // if auto is false and this is true, original data will be restored on pan/zoom - that isn't what we want.
    },
    plugins: {
        streaming: {
            framerate: 15
        }
    }
}

var lineChartData = {};

function addYAxis(type, pidInfo, newColor) {
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

window.onload = function () {
    var ctx = document.getElementById("myChart");
    window.graph = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: opts
    });

    ipcRenderer.on('newGraphData', (event, data) => {
        if(startTime == -1){
            startTime = Date.now();
            time = 0;
        } else {
            time = (data.time - startTime);
        }
        //console.log("newGraphData: data object: ", data);
        var pidInfo = OBDPIDs.service01[data.type];
        var idx = -1;
        //console.log("Got OBD data with type: <", data.type, "> and data: <", data.value, ">");
        window.graph.data.datasets.forEach((dataset, index) => {
            //console.log("Comparing label: " + dataset.label + " with obdcode: " + pidInfo.name);
            if (dataset.label == pidInfo.name) {
                //console.log("Found dataset index: ", index);
                idx = index;
            }
        });

        var value;
        if (pidInfo.hasOwnProperty("convert")) {
            value = pidInfo.convert(data.value);
        } else {
            value = data.value;
        }
        if (idx < 0) {
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
            addYAxis(data.type, pidInfo, newColor);
            //console.log("Added new dataset: ", ds.label, " at idx: ", idx);
            //window.graph.update(0);
        }
        window.graph.data.datasets[idx].data.push({ x: time, y: value });
        window.graph.update({
            preservation: true
        });
    });
}
