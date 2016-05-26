$(document).ready(function() {

    $(document).on('pageshow', '#first', function(data) {});



});

var map;
var longitude;
var latitude;
var latLong;

var p = {
    x: 0,
    y: 0
};
var p1 = {
    x: 0,
    y: 0,
    d: 0
};
var p2 = {
    x: 0,
    y: 0,
    d: 0
};
var p3 = {
    x: 0,
    y: 0,
    d: 0
};


var base64 = cordova.require('cordova/base64');
var BLUETOOTH_BASE_UUID = '-0000-1000-8000-00805f9b34fb';
var beacons = {};
var beaconS = {};

var scan = false;
var addressS = null;
var startTime = null;
var time = 0;
var updateTimer = null;

var data = {
    "time": [],
    "rssi": []
};
var ctx;
var myLineChart;
var dataChart = {
    labels: [],
    datasets: [{
        label: "My dataset",
        fillColor: "rgba(220,220,220,0.2)",
        strokeColor: "rgba(220,220,220,1)",
        pointColor: "rgba(220,220,220,1)",
        pointStrokeColor: "#fff",
        pointHighlightFill: "#fff",
        pointHighlightStroke: "rgba(220,220,220,1)",
        data: []
    }]
};

var options = {
    animation: false,
    scaleShowGridLines: true,
    scaleShowVerticalLines: true,
    showTooltips: false,
    datasetFill: true,
    onAnimationComplete: function() { // console.log(this.toBase64Image())
    }
};

var app = {

    initialize: function() {
        this.bindEvents();
    },

    bindEvents: function() {
        document.getElementById("scanButton").addEventListener("click", scanDevice);
        document.getElementById("shareFile").addEventListener("click", shareFile);
        // document.getElementById("readFile").addEventListener("click", readLog);
        document.getElementById("saveGraph").addEventListener("click", saveGraph);
        document.addEventListener("stop", stopScan, false);
        document.getElementById("scanButton").innerHTML = "Scan";
        // console.log("page show");
        // console.log(dataChart.datasets[0].data);



        document.addEventListener("deviceready", function() {

            var btn1 = document.getElementById("get-p1-btn");
            btn1.onclick = function() {
                getP(p1)
            };

            var btn2 = document.getElementById("get-p2-btn");
            btn2.onclick = function() {
                getP(p2)
            };

            var btn3 = document.getElementById("get-p3-btn");
            btn3.onclick = function() {
                getP(p3)
            };

            var BPbtn = document.getElementById("get-beacon-position");
            BPbtn.onclick = function() {
                getBeaconPosition()
            };

            var mapDiv = document.getElementById("map_canvas");

            navigator.geolocation.getCurrentPosition(function(position) {

                longitude = px =position.coords.longitude;
                latitude = py = position.coords.latitude;
                latLong = new plugin.google.maps.LatLng(latitude, longitude);

                map = plugin.google.maps.Map.getMap(mapDiv, {
                    'backgroundColor': 'white',
                    'mapType': plugin.google.maps.MapTypeId.HYBRID,
                    'controls': {
                        'compass': true,
                        'myLocationButton': true,
                        'indoorPicker': true,
                        'zoom': true
                    },
                    'gestures': {
                        'scroll': true,
                        'tilt': true,
                        'rotate': true,
                        'zoom': true
                    },
                    'camera': {
                        'latLng': latLong,
                        'tilt': 30,
                        'zoom': 15,
                        'bearing': 50
                    }
                });

                var msg = ["Current position:\n",
                    "latitude:" + position.coords.latitude,
                    "longitude:" + position.coords.longitude].join("\n");

                map.addMarker({
                    'position': latLong,
                    'title': msg
                }, function(marker) {

                    marker.showInfoWindow();

                });

                console.log(latLong);

            });


        });



    },

};

app.initialize();

function getP(pp) {
    navigator.geolocation.getCurrentPosition(function(position) {
        pp.x = position.coords.longitude;
        pp.y = position.coords.latitude;
        pp.d = beaconS.accuracy;
        // console.log('distance: ' + beaconS.accuracy);
    });


}

function getBeaconPosition() {

    p = trilateration(p1, p2, p3);

    console.log('x: ' + p.x);
    console.log('y: ' + p.y);

}

function scanDevice() {


    // p = trilateration(p1, p2, p3);
    // console.log('x: ' + p.x);
    // console.log('y: ' + p.y);

    if (scan) {
        // Set button text
        document.getElementById("scanButton").innerHTML = "Scan";
        scan = false;
        stopScan();
    } else {
        console.log('scan');
        document.getElementById("scanButton").innerHTML = "Stop";
        scan = true;
        startScan();
        saveFile();
        // Set display interval
        updateTimer = setInterval(display, 500);
    }

}

function display() {

    displayBeaconList();
    displayBeacon();
    displayMap();
}


function displayMap() {

    var mapDiv = document.getElementById("map_canvas");

    longitude = p.x;
    latitude = p.y;
    latLong = new plugin.google.maps.LatLng(latitude, longitude);

    map = plugin.google.maps.Map.getMap(mapDiv, {
        'backgroundColor': 'white',
        'mapType': plugin.google.maps.MapTypeId.HYBRID,
        'controls': {
            'compass': true,
            'myLocationButton': true,
            'indoorPicker': true,
            'zoom': true
        },
        'gestures': {
            'scroll': true,
            'tilt': true,
            'rotate': true,
            'zoom': true
        },
        'camera': {
            'latLng': latLong,
            'tilt': 30,
            'zoom': 15,
            'bearing': 50
        }
    });

    var msg = ["Beacon position:\n",
        "latitude:" + p.x,
        "longitude:" + p.y].join("\n");

map.clear();
    map.addMarker({
        'position': latLong,
        'title': msg
    }, function(marker) {

        marker.showInfoWindow();

    });

    console.log(latLong);
}

function startScan() {
    evothings.ble.startScan(
        [],
        function(device) {
            // console.log(JSON.stringify(device));
            // console.log('_Name : ' + device.name);
            // console.log('\t Address: ' + device.address);
            // console.log('\t Record: ' + device.scanRecord);
            // console.log('\t Advertisement data: ' + device.advertisementData);
            var sr = base64DecToArr(device.scanRecord);
            // console.log('scanRecord: ' + uint8ArrToHexString(sr));
            device.timeStamp = Date.now();
            beacons[device.address] = device;
            // classify beacons
            // isIBeacon = true : iBeacon
            // type = 1: Eddystone TLM
            // type = 2: Eddystone UID
            //  type = 3: Eddystone URL
            classify(beacons[device.address]);
        },
        function(error) {
            // console.log('BLE scan error: ' + error);
        });
}

function stopScan() {

    console.log("stop");
    // clear interval
    clearInterval(updateTimer);
    // stop scan
    evothings.ble.stopScan();

}

function displayBeaconList() {

    $("#deviceList").empty();
    $('#found-beacons').empty();
    var html = '';
    var timeNow = Date.now();
    // getSortedBeaconList: sort beacon list
    $.each(getSortedBeaconList(beacons), function(key, beacon) {
        if (beacon.timeStamp + 6000 > timeNow) {
            var rssiWidth = 1;
            if (beacon.rssi < -100) {
                rssiWidth = 100;
            } else if (beacon.rssi < 0) {
                rssiWidth = 100 + beacon.rssi;
            }
            var res =
                '<ul>' + '<li>Address : ' + beacon.address + '</li>' + '<li>RSSI : ' + beacon.rssi + '</li>' + '</ul>';
            var p = document.getElementById('deviceList');
            var li = document.createElement('li');
            var $a = $("<a href=\"#connected\" data-transition=\"flip\">" + res + "</a>");
            $(li).append($a);
            $a.bind("click", {
                address: beacon.address
            }, eventBeaconClicked);
            p.appendChild(li);
            $("#deviceList").listview("refresh");
        }
    });

}

function eventBeaconClicked(event) {

    // Set selected beacon

    // addressS : address of selected beacon
    addressS = event.data.address;
    startTime = Date.now();
    time = 0;
    console.log(addressS);
    // clear data log
    data.time = [];
    data.rssi = [];
    dataChart.labels = [];
    dataChart.datasets[0].data = [];
    // Truncate log file
    logOb.createWriter(truncateFile, fail);
    // Clear chart
    document.getElementById('chart').innerHTML = '';
    document.getElementById('iBeacon').innerHTML = '';
    document.getElementById('Eddystone').innerHTML = '';

}

function displayBeacon() {

    navigator.geolocation.getCurrentPosition(function(position) {
        // 	console.log('Latitude: '          + position.coords.latitude          + '\n' +
        // 'Longitude: '         + position.coords.longitude         + '\n' +
        // 'Altitude: '          + position.coords.altitude          + '\n' +
        // 'Accuracy: '          + position.coords.accuracy          + '\n' +
        // 'Altitude Accuracy: ' + position.coords.altitudeAccuracy  + '\n' +
        // 'Heading: '           + position.coords.heading           + '\n' +
        // 'Speed: '             + position.coords.speed             + '\n' +
        // 'Timestamp: '         + position.timestamp                + '\n');

        var html = ''
        var res = 'Signal perdu';
        var resIBeacon;
        var resEddystone;
        var timeNow = Date.now();


        $.each(beacons, function(key, beacon) {
            if (beacon.timeStamp + 6000 > timeNow) {
                var rssiWidth = 1; // Used when RSSI is zero or greater.
                if (beacon.rssi < -100) {
                    rssiWidth = 100;
                } else if (beacon.rssi < 0) {
                    rssiWidth = 100 + beacon.rssi;
                }

                if (beacon.address == addressS) {
                    beaconS = beacon;
                    console.log('display');

                    var date2 = new Date();
                    var e = date2 - startTime;
                    // if ((e / 1000) >= 2) {

                    if (beacon.rssi) {
                        data.rssi.push(-(beacon.rssi));
                        // Delete first data when data length > 8
                        if (dataChart.datasets[0].data.length > 8) {
                            dataChart.datasets[0].data.splice(0, 1);
                            dataChart.labels.splice(0, 1);
                        }
                        dataChart.datasets[0].data.push(-(beacon.rssi));
                    } else {
                        data.rssi.push(0);
                        if (dataChart.datasets[0].data.length > 8) {
                            dataChart.datasets[0].data.splice(0, 1);
                            dataChart.labels.splice(0, 1);
                        }
                        dataChart.datasets[0].data.push(0);
                    }

                    data.time.push(time);
                    dataChart.labels.push(time);

                    var str = time + "\t" + beacon.rssi + "\t" + position.coords.latitude + "\n";
                    writeLog(str);

                    startTime = new Date();
                    time++;

                    // draw chart
                    if (document.getElementById('chart').innerHTML == '') {
                        console.log("draw chart");
                        var htmlChart = '<canvas id="myChart" backgroy ></canvas>';
                        document.getElementById('chart').innerHTML = htmlChart;
                        ctx = document.getElementById("myChart").getContext("2d");
                        myLineChart = new Chart(ctx).Line(dataChart, options);
                    } else {
                        myLineChart.destroy();
                        var htmlChart = '<canvas id="myChart" ></canvas>';
                        document.getElementById('chart').innerHTML = htmlChart;
                        ctx = document.getElementById("myChart").getContext("2d");
                        myLineChart = new Chart(ctx).Line(dataChart, options);

                    }

                    // }

                    // console.log(beacon.isIBeacon);
                    // console.log(beacon.type);
                    res = '<a href=\"#map\" data-transition=\"flip\"><ul>' + '<li> geolocation' + '<ul>' + '<li>Latitude : ' + position.coords.latitude + '</li>' + '<li>Longitude : ' + position.coords.longitude + '</li>' + '</ul></a>';
                    res += '</li>' + '<li>Name: ' + beacon.name + '</li>' + '<li>Address: ' + beacon.address + '</li>' + '<li>RSSI: ' + beacon.rssi + '</li>' + '</ul>';

                    if (beacon.isIBeacon) {
                        resIBeacon =
                            '<li>iBeacon' + '<ul>' + '<li>UUID : ' + beacon.uuid + '</li>' + '<li>Major :' + beacon.major + '</li>' + '<li>Minor : ' + beacon.minor + '</li>' + '<li>RSSI : ' + beacon.rssi + '</li>' + '<li>Distance : ' + beacon.accuracy + '</li>' + '</ul>' + '</li>';
                    }

                    if (beacon.type == 1) {
                        resEddystone =
                            '<li>Eddystone TLM' + '<ul>' + '<li>TxPower: ' + beacon.txPower + '</li>' + '<li>UUID: ' + beacon.uuid + '</li>' + '<li>Temperature : ' + beacon.temperature + '</li>' + '<li>PDU :' + beacon.adv_cnt + '</li>' + '<li>Battery : ' + beacon.battery + '</li>' + '<li>Time since power-on or reboot : ' + beacon.dsec_cnt + '</li>' + '</ul>' + '</li>';
                    }

                    if (beacon.type == 2) {
                        resEddystone =
                            '<li>Eddystone UID' + '<ul>' + '<li>UUID: ' + beacon.uuid + '</li>' + '<li>nid : ' + beacon.nid + '</li>' + '<li>bid :' + beacon.bid + '</li>' + '<li>TxPower : ' + beacon.TxPower + '</li>' + '</ul>' + '</li>';
                    }

                    if (beacon.type == 3) {
                        resEddystone =
                            '<dt>Eddystone URL' + '<ul>' + '<li>UUID: ' + beacon.uuid + '</li>' + '<li>Url : ' + beacon.url + '</li>' + '<li>TxPower : ' + beacon.TxPower + '</li>' + '</ul>' + '</li>';
                    }

                    html += res;
                    document.getElementById('deviceName').innerHTML = html;
                    if (beacon.isIBeacon) document.getElementById('iBeacon').innerHTML = resIBeacon;
                    if (beacon.type) document.getElementById('Eddystone').innerHTML = resEddystone;

                    document.getElementById("p1x").innerHTML = p1.x;
                    document.getElementById("p1y").innerHTML = p1.y;
                    // document.getElementById("p1d").innerHTML = p1.d;

                    document.getElementById("p2x").innerHTML = p2.x;
                    document.getElementById("p2y").innerHTML = p2.y;
                    // document.getElementById("p2d").innerHTML = p2.d;

                    document.getElementById("p3x").innerHTML = p3.x;
                    document.getElementById("p3y").innerHTML = p3.y;
                    // document.getElementById("p3d").innerHTML = p3.d;

                }



            }

        });


        // html += '<canvas id="myChart" ></canvas>';
        // dataChart.labels = data.time;
        // dataChart.datasets[0].data = data.rssi;

        // ctx = document.getElementById("myChart").getContext("2d");
        // myLineChart = new Chart(ctx).Line(dataChart, options);

        // console.log(beacon.uuid);

        // var html = '<canvas id="myChart" ></canvas>';
        // document.getElementById('chart').innerHTML = html;
        // ctx = document.getElementById("myChart").getContext("2d");
        // myLineChart = new Chart(ctx).Line(dataChart, options);

        // console.log("Time: " + data.time);
        // console.log("Time: " + dataChart.labels);
        // console.log("RSSI: " + data.rssi);
        // console.log("RSSI: " + dataChart.datasets[0].data);



    }, function(error) {
        console.log('code: ' + error.code + '\n' +
            'message: ' + error.message + '\n');
    });


}

var logOb;

function fail(e) {
    console.log("FileSystem Error");
    console.dir(e);
}

// create log file
function saveFile() {

    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir) {

        dir.getFile("data.csv", {
            create: true
        }, function(file) {
            logOb = file;
            logOb.createWriter(truncateFile, fail);
        });
    });

}

// clear log file
function truncateFile(writer) {
    // console.log("truncate file");
    writer.truncate(0);
};

// write log file
function writeLog(str) {
    if (!logOb)
        return;
    // var log = str + " \n";
    // console.log("going to log " + str);
    logOb.createWriter(function(fileWriter) {

        fileWriter.seek(fileWriter.length);

        var blob = new Blob([str], {
            type: 'text/plain'
        });
        fileWriter.write(blob);
    }, fail);
}

// read log file
function readLog() {
    logOb.file(function(file) {
        var reader = new FileReader();
        reader.onloadend = function(e) {
            // console.log(this.result);
        };

        reader.readAsText(file);
    }, fail);

}

// share log file
function shareFile() {
    // var saisie = prompt("File name :", "");
    // alert(saisie);
    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir) {
        // console.log("got main dir", dir);
        // logOb.copyTo(dir, saisie + ".txt", function (entry) {
        // console.log(logOb.nativeURL);
        // window.cordova.plugins.FileOpener.openFile(entry.nativeURL, success, error);

        cordova.plugins.email.addAlias('gmail', 'com.google.android.gm');

        // Specify app by name or alias

        cordova.plugins.email.open({
            app: 'gmail',
            attachments: [
                logOb.nativeURL
            ]
        });

        // }, fail);

    });

}

function success(data) {
    // console.log(data.message);
}

function error(code) {
    // console.log(code.message);
}

// share chart
function saveGraph() {
    var img = myLineChart.toBase64Image();
    var dataGraph = img.replace(/^data:image\/\w+;base64,/, "");

    window.resolveLocalFileSystemURL(cordova.file.externalDataDirectory, function(dir) {

        dir.getFile("graph.png", {
            create: true
        }, function(file) {
            file.createWriter(function(writer) {
                // console.log(file);
                writer.seek(0);
                var binary = fixBinary(atob(dataGraph));
                var blob = new Blob([binary], {
                    type: 'image/png'
                });
                writer.write(blob);
                // console.log("End creating image file. File created");
            }, fail);

            cordova.plugins.email.addAlias('gmail', 'com.google.android.gm');
            cordova.plugins.email.open({
                app: 'gmail',
                attachments: [
                    file.nativeURL
                ]
            });

        });

    });

}

function fixBinary(bin) {
    var length = bin.length;
    var buf = new ArrayBuffer(length);
    var arr = new Uint8Array(buf);
    for (var i = 0; i < length; i++) {
        arr[i] = bin.charCodeAt(i);
    }
    return buf;
}

// If device already has advertisementData, does nothing.
// If device instead has scanRecord, creates advertisementData.
function ensureAdvertisementData(device) {

    if (device.advertisementData) {
        return;
    }

    if (!device.scanRecord) {
        return;
    }
    // Bluetooth Specification, v4.0, Volume 3, Part C, Section 11
    // https://www.bluetooth.org/docman/handlers/downloaddoc.ashx?doc_id=229737
    var byteArray = evothings.util.base64DecToArr(device.scanRecord);
    var pos = 0;
    var advertisementData = {};
    var serviceUUIDs;
    var serviceData;
    // console.log(uint8ArrToHexString(base64DecToArr(device.scanRecord)));
    // console.log(byteArray);

    while (pos < byteArray.length) {
        // length :  Length field
        var length = byteArray[pos++];
        if (length == 0) {
            break;
        }
        length -= 1;
        // type: Flags AD type
        var type = byteArray[pos++];
        // console.log(type);
        // var BLUETOOTH_BASE_UUID = '-0000-1000-8000-00805f9b34fb'
        // console.log('pos: ' + pos + ' length: ' + length);


        function arrayToUUID(array, offset) {
            var k = 0;
            var string = '';
            var UUID_format = [4, 2, 2, 2, 6];
            for (var l = 0; l < UUID_format.length; l++) {
                if (l != 0) {
                    string += '-';
                }
                for (var j = 0; j < UUID_format[l]; j++, k++) {
                    string += evothings.util.toHexString(array[offset + k], 1);
                }
            }
            return string;
        }


        // Service UUIDs may be either 16-bit UUIDs, 32-bit UUIDs or 128-bit UUIDs

        // flag 16-bit Service UUIDs
        // 0x02 : More 16-bit UUIDs available
        // 0x03 : Complete list of 16-bit UUIDs available
        if (type == 0x02 || type == 0x03) {
            // the 16-bit Attribute UUID replaces the x’s in the following:
            // 0000xxxx-0000-1000-8000-00805F9B34FB
            // For example, the 16-bit Attribute UUID of 0x1234 is equivalent to the 128-bit UUID of
            // 00001234-0000-1000-8000-00805F9B34FB
            serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
            for (var i = 0; i < length; i += 2) {
                serviceUUIDs.push(
                    '0000' +
                    evothings.util.toHexString(
                        evothings.util.littleEndianToUint16(byteArray, pos + i),
                        2) +
                    BLUETOOTH_BASE_UUID);
            }

            // console.log('serviceUUIDs: ' + serviceUUIDs);
        }

        // 32-bit Service UUIDs
        // 0x04 : More 32-bit UUIDs available
        // 0x05 : Complete list of 32-bit UUIDs available
        if (type == 0x04 || type == 0x05) {
            serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
            for (var i = 0; i < length; i += 4) {
                serviceUUIDs.push(
                    evothings.util.toHexString(
                        evothings.util.littleEndianToUint32(byteArray, pos + i),
                        4) +
                    BLUETOOTH_BASE_UUID);
            }
            // console.log('serviceUUIDs: ' + serviceUUIDs);
        }


        // 128-bit Service UUIDs
        // 0x06 : More 128-bit UUIDs available
        // 0x07 : Complete list of 128-bit UUIDs available
        if (type == 0x06 || type == 0x07) {
            serviceUUIDs = serviceUUIDs ? serviceUUIDs : [];
            for (var i = 0; i < length; i += 16) {
                serviceUUIDs.push(arrayToUUID(byteArray, pos + i));
            }
            // console.log('serviceUUIDs:' + serviceUUIDs);
        }

        // The Local Name AD type contains the device name, either complete or shortened
        // 0x08 : Shortened local name
        // 0x09 : Complete local name
        if (type == 0x08 || type == 0x09) {
            advertisementData.kCBAdvDataLocalName = evothings.ble.fromUtf8(
                new Uint8Array(byteArray.buffer, pos, length));
            // console.log('kCBAdvDataLocalName: ' + advertisementData.kCBAdvDataLocalName);
        }

        // TX Power Level
        // when the TX Power Level tag is not present,
        // the TX power level of the packet is unknown.
        if (type == 0x0a) {
            advertisementData.kCBAdvDataTxPowerLevel =
                evothings.util.littleEndianToInt8(byteArray, pos);
            // console.log('kCBAdvDataTxPowerLevel: ' + advertisementData.kCBAdvDataTxPowerLevel);
        }

        // Service Data, 16-bit UUID
        // The first 2 octets contain the 16 bit Service UUID followed by additional service data
        if (type == 0x16) {
            serviceData = serviceData ? serviceData : {};
            var uuid =
                '0000' +
                evothings.util.toHexString(
                    evothings.util.littleEndianToUint16(byteArray, pos),
                    2) +
                BLUETOOTH_BASE_UUID;
            var data = new Uint8Array(byteArray.buffer, pos + 2, length - 2);
            serviceData[uuid] = base64.fromArrayBuffer(data);
            // console.log('serviceData: ' + uint8ArrToHexString(data));
        }

        // Service Data, 32-bit UUID
        if (type == 0x20) {
            serviceData = serviceData ? serviceData : {};
            var uuid =
                evothings.util.toHexString(
                    evothings.util.littleEndianToUint32(byteArray, pos),
                    4) +
                BLUETOOTH_BASE_UUID;
            var data = new Uint8Array(byteArray.buffer, pos + 4, length - 4);
            serviceData[uuid] = base64.fromArrayBuffer(data);
            // console.log('serviceData: ' + uint8ArrToHexString(data));
        }

        // Service Data, 128-bit UUID
        if (type == 0x21) {
            serviceData = serviceData ? serviceData : {};
            var uuid = arrayToUUID(byteArray, pos);
            var data = new Uint8Array(byteArray.buffer, pos + 16, length - 16);
            serviceData[uuid] = base64.fromArrayBuffer(data);
            // console.log('data: ' + serviceData);
        }

        // Manufacturer-specific Data
        // The first 2 octets contain the Company Identifier
        // Code followed by additional manufacturer specific data
        if (type == 0xff) {
            advertisementData.kCBAdvDataManufacturerData =
                base64.fromArrayBuffer(new Uint8Array(byteArray.buffer, pos, length));
            // console.log('kCBAdvDataManufacturerData: ' + advertisementData.kCBAdvDataManufacturerData);
        }

        pos += length;
    }
    advertisementData.kCBAdvDataServiceUUIDs = serviceUUIDs;
    advertisementData.kCBAdvDataServiceData = serviceData;
    device.advertisementData = advertisementData;

}

function mapBeaconRSSI(rssi) {
    if (rssi >= 0) return 1; // Unknown RSSI maps to 1.
    if (rssi < -100) return 0; // Max RSSI
    return 100 + rssi;
}

// sort beacon list
function getSortedBeaconList(beacons) {
    var beaconList = [];
    for (var key in beacons) {
        beaconList.push(beacons[key]);
    }
    beaconList.sort(function(beacon1, beacon2) {
        return mapBeaconRSSI(beacon1.rssi) < mapBeaconRSSI(beacon2.rssi);
    });
    return beaconList;
}

// https://github.com/google/eddystone/tree/master/eddystone-uid
// Return true on frame type recognition, false otherwise.
function parseFrameUID(device, data, win, fail) {

    // The specific type of Eddystone frame is encoded in the high-order four bits
    // of the first octet in the Service Data
    // 0x00 : UID
    if (data[0] != 0x00) return false;

    // The UID frame has 18 bytes + 2 bytes reserved for future use
    // https://github.com/google/eddystone/tree/master/eddystone-uid
    // Check that we got at least 18 bytes.
    if (data.byteLength < 18) {
        return true;
    }

    // byte offset 1 : Calibrated Tx power at 0 m
    device.txPower = evothings.util.littleEndianToInt8(data, 1);
    // byte offset 2-11 : Namespace ID
    device.nid = data.subarray(2, 12);
    // byte offset 12-17 : Beacon ID
    device.bid = data.subarray(12, 18);

    console.log('nid: ' + device.nid);
    console.log('bid: ' + device.bid);
    console.log('txPower: ' + device.txPower);

    return true;
}

// https://github.com/google/eddystone/tree/master/eddystone-url
function parseFrameURL(device, data, win, fail) {
    // The specific type of Eddystone frame is encoded in the high-order four bits
    // of the first octet in the Service Data
    // 0x10 : URL
    if (data[0] != 0x10) return false;

    if (data.byteLength < 4) {
        return true;
    }
    // byte offset 1 : Calibrated Tx power at 0 m
    device.txPower = evothings.util.littleEndianToInt8(data, 1);
    console.log('txPower: ' + device.txPower);
    // byte offset 2 : Encoded Scheme Prefix
    var url;
    switch (data[2]) {
        case 0:
            url = 'http://www.';
            break;
        case 1:
            url = 'https://www.';
            break;
        case 2:
            url = 'http://';
            break;
        case 3:
            url = 'https://';
            break;
        default:
            return true;
    }

    // byte offset 3+ : Encoded URL
    // Process each byte in sequence.
    var i = 3;
    while (i < data.byteLength) {
        var c = data[i];
        // A byte is either a top-domain shortcut, or a printable ascii character.
        if (c < 14) {
            switch (c) {
                case 0:
                    url += '.com/';
                    break;
                case 1:
                    url += '.org/';
                    break;
                case 2:
                    url += '.edu/';
                    break;
                case 3:
                    url += '.net/';
                    break;
                case 4:
                    url += '.info/';
                    break;
                case 5:
                    url += '.biz/';
                    break;
                case 6:
                    url += '.gov/';
                    break;
                case 7:
                    url += '.com';
                    break;
                case 8:
                    url += '.org';
                    break;
                case 9:
                    url += '.edu';
                    break;
                case 10:
                    url += '.net';
                    break;
                case 11:
                    url += '.info';
                    break;
                case 12:
                    url += '.biz';
                    break;
                case 13:
                    url += '.gov';
                    break;
            }
        } else if (c < 32 || c >= 127) {
            // Unprintables are not allowed.
            return true;
        } else {
            url += String.fromCharCode(c);
        }

        i += 1;
    }

    // Set URL field of the device.
    device.url = url;
    console.log('url: ' + device.url);

    return true;
}


function parseFrameTLM(device, data) {
    // https://github.com/google/eddystone/blob/master/eddystone-tlm/tlm-plain.md
    // The specific type of Eddystone frame is encoded in the high-order four bits
    // of the first octet in the Service Data
    // 0x20 : TLM
    // console.log('data[0] = ' + data[0]);
    if (data[0] != 0x20) return false;

    // byte offset 1 : TLM version, value = 0x00
    // TLM version allows for future development of this frame type.
    // At present the value must be 0x00
    // console.log('data[1] = ' + data[1]);
    if (data[1] != 0x00) {
        return true;
    }
    if (data.byteLength != 14) {
        return true;
    }

    // byte offset 2 : Battery voltage, 1 mV/bit
    device.voltage = evothings.util.bigEndianToUint16(data, 2);

    // byte offset 4 : Beacon temperature
    // Beacon temperature is the temperature in degrees Celsius sensed by the beacon
    // and expressed in a signed 8.8 fixed-point notation.
    // If not supported the value should be set to 0x8000, -128 °C
    // https://courses.cit.cornell.edu/ee476/Math/

    var temp = evothings.util.bigEndianToUint16(data, 4);

    // numbers are stored as 16-bit signed ints, with the binary-point between bit 7 and bit 8
    // There will be 8 bits of integer and 8 bits of fraction, so we will refer to this as 8:8 fixed point.
    // This representation allows a dynamic range of +/- 127, with a resolution of 1/256=0.00396
    if (temp == 0x8000) {
        // 0x8000 = 32768
        // temperature = 32768 / 256 = 128
        device.temperature = 0x8000;
    } else {
        device.temperature = evothings.util.bigEndianToInt16(data, 4) / 256.0;
    }

    // byte offset 6 : Advertising PDU count
    device.adv_cnt = evothings.util.bigEndianToUint32(data, 6);
    // device.dsec_cnt = new Date(evothings.util.bigEndianToUint32(data, 10));
    var now = new Date();

    // byte offset 10 : Time since power-on or reboot
    // SEC_CNT is a 0.1 second resolution counter that represents time since beacon power-up or reboot.
    device.dsec_cnt = new Date(now - evothings.util.bigEndianToUint32(data, 10));

    // console.log('temperature: ' + device.temperature);
    // console.log('pdu: ' + device.adv_cnt);
    // console.log('temperature: ' + device.voltage);
    // console.log('Time since power-on or reboot: ' + device.dsec_cnt.toString());
    return true;
}

// classify beacons
// isIBeacon = true : iBeacon
// type = 1: Eddystone TLM
// type = 2: Eddystone UID
//  type = 3: Eddystone URL

function classify(device) {
    var sr = base64DecToArr(device.scanRecord);
    device.isIBeacon = false;
    device.type = 0;

    // Check if it is an iBeacon
    if (parseScanRecord(device, sr)) {
        device.isIBeacon = true;
    }

    // Check if it is an Eddystone
    ensureAdvertisementData(device);
    var ad = device.advertisementData;
    if (!ad) return;
    var sd = ad.kCBAdvDataServiceData;
    if (!sd) return;
    // console.log(ad.kCBAdvDataServiceUUIDs);
    device.uuid = ad.kCBAdvDataServiceUUIDs;
    // console.log(ad.kCBAdvDataLocalName);
    var base64data = sd['0000feaa' + BLUETOOTH_BASE_UUID];
    if (!base64data) return;
    var byteArray = base64DecToArr(base64data);

    // Check if it is an Eddystone TLM
    if (parseFrameTLM(device, byteArray)) {
        device.type = 1;
        return;
    }

    // Check if it is an Eddystone UID
    if (parseFrameUID(device, byteArray)) {
        device.type = 2;
        return;
    }

    // Check if it is an Eddystone URL
    if (parseFrameURL(device, byteArray)) {
        device.type = 3;
        return;
    }

}

// Check if it is an iBeacon
function parseScanRecord(device, sr) {

    // The first 4 bytes of AD Data of iBeacon are 0x4C, 0x00, 0x02 and 0x15.
    // The first 2 bytes (0x4C, 0x00) mean "Apple, Inc."
    // and the next 2 bytes (0x02, 0x15) mean "iBeacon format".
    for (var pos = 2; pos < 6; pos++) {
        if (sr[pos + 0] == 0x4c &&
            sr[pos + 1] == 0x00 &&
            sr[pos + 2] == 0x02 &&
            sr[pos + 3] == 0x15) {
            // var b = device;

            // Proximity UUID (16 bytes)
            var uuid = new Uint8Array(sr.buffer, pos + 4, 16);
            // major number (2 bytes)
            var major = new Uint8Array(sr.buffer, pos + 20, 2);
            // minor number (2 bytes)
            var minor = new Uint8Array(sr.buffer, pos + 22, 2);
            // power (1 byte) follow the first 4 bytes
            var txPower = new Int8Array(sr.buffer, pos + 24, 1)[0];

            var accuracy = calculateAccuracy(device.rssi, txPower);
            device.uuid = uint8ArrToHexString(uuid);
            device.major = parseInt(uint8ArrToHexString(major), 16);
            device.minor = parseInt(uint8ArrToHexString(minor), 16);
            device.txPower = txPower;
            device.accuracy = accuracy;
            // console.log('UUID : ' + uint8ArrToHexString(uuid));
            // console.log('Major :' + parseInt(uint8ArrToHexString(major), 16));
            // console.log('Minor :' + parseInt(uint8ArrToHexString(minor), 16));
            // console.log('TxPower :' + txPower);
            // console.log('accuracy :' + accuracy);
            return device;
        }
    }
    return null;
}

function uint8ArrToHexString(arr) {
    return Array.prototype.map.call(arr, function(n) {
        var s = n.toString(16);
        if (s.length == 1) {
            s = '0' + s;
        }
        return s;
    }).join('');
}

function b64ToUint6(nChr) {

    return nChr > 64 && nChr < 91 ?
        nChr - 65 : nChr > 96 && nChr < 123 ?
        nChr - 71 : nChr > 47 && nChr < 58 ?
        nChr + 4 : nChr === 43 ?
        62 : nChr === 47 ?
        63 :
        0;
}

function base64DecToArr(sBase64, nBlocksSize) {

    var
        sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, ""),
        nInLen = sB64Enc.length,
        nOutLen = nBlocksSize ? Math.ceil((nInLen * 3 + 1 >> 2) / nBlocksSize) * nBlocksSize : nInLen * 3 + 1 >> 2,
        taBytes = new Uint8Array(nOutLen);

    for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
        nMod4 = nInIdx & 3;
        nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << 18 - 6 * nMod4;
        if (nMod4 === 3 || nInLen - nInIdx === 1) {
            for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
                taBytes[nOutIdx] = nUint24 >>> (16 >>> nMod3 & 24) & 255;
            }
            nUint24 = 0;

        }
    }

    return taBytes;
}

function calculateAccuracy(rssi, txPower) {
    var ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    } else {
        return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    }
}





function trilateration(p1, p2, p3) {
    var p4 = {};
    var d = distance(p1, p2);
    // console.log(d);
    var ex = {};
    var ey = {};
    ex.x = (p2.x - p1.x) / d;
    ex.y = (p2.y - p1.y) / d;
    var i;
    i = (ex.x * (p3.x - p1.x)) + (ex.y * (p3.y - p1.y));
    // console.log(i);
    ey.x = (p3.x - p1.x - i * ex.x) / Math.pow(Math.pow(p3.x - p1.x - i * ex.x, 2) + Math.pow(p3.y - p1.y - i * ex.y, 2), 0.5);
    ey.y = (p3.y - p1.y - i * ex.y) / Math.pow(Math.pow(p3.x - p1.x - i * ex.x, 2) + Math.pow(p3.y - p1.y - i * ex.y, 2), 0.5);
    var j;
    j = (ey.x * (p3.x - p1.x)) + (ey.y * (p3.y - p1.y));

    // console.log(j);
    var x;
    x = (Math.pow(p1.d, 2) - Math.pow(p2.d, 2) + Math.pow(d, 2)) / (2 * d);
    var y;
    y = (Math.pow(p1.d, 2) - Math.pow(p3.d, 2) + Math.pow(i, 2) + Math.pow(j, 2)) / (2 * j) - (i * x) / j;
    // console.log(x);
    // console.log(y);
    p4.x = p1.x + x * ex.x + y * ey.x;
    p4.y = p1.y + x * ex.y + y * ey.y;
    console.log('p1: ' + p1.x + ',' + p1.y + ',' + p1.d);
    console.log('p2: ' + p2.x + ',' + p2.y + ',' + p2.d);
    console.log('p3: ' + p3.x + ',' + p3.y + ',' + p3.d);
    console.log(p4.x);
    console.log(p4.y);
    return p4;
}

function distance(p1, p2) {
    return Math.pow(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2), 0.5);
}
