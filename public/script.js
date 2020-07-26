const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function addTextToField(field, text) {
    document.getElementById(field).innerHTML += text + "<br>";
}

function addTextToFrame(frameId, text) {
    document.getElementById(frameId).contentDocument.write(text + "<br><br>");
}

function addMonitored(text) {
    addTextToFrame('monitoredFrame', text);
}

function clearMonitored() {
    document.getElementById('monitoredFrame').contentDocument.open();
    document.getElementById('monitoredFrame').contentDocument.close();
}

function addCasual(text) {
    addTextToFrame('casualFrame', text);
}

function printInfo() {
    var x = document.getElementById("settingsForm");
    var text = "";
    var i;
    for (i = 0; i < x.length; i++) {
        text += x.elements[i].value + "<br>"
    }
    addCasual(text);
}

window.onload = function() {
    addCasual("Program starting...");

    var oldCasualTimestamp = 0;
    var oldMonitoredTimestamp = 0;

    var dict = {};

    window.setInterval(function(){

        var now = new Date();
        if (now.getHours() == 0 && now.getMinutes() == 0 && now.getSeconds() == 0) {
            clearMonitored();
            for (var key in dict) {
                if (dict.hasOwnProperty(key)) {
                    delete dict[key];
                }
            }
            dict = {};
            oldCasualTimestamp = 0;
        }

        $(document).ready(() => {

            $.ajax({
                url: 'casual/',
                type: 'GET',
                dataType: 'json',
                success: (dataList) => {
                    if (dataList) {
                        saveTimestamp = 0;
                        dataList.forEach((data) => {
                            if (oldCasualTimestamp != data.timestamp) {
                                saveTimestamp = data.timestamp;
                                addCasual(data.text);
                            }
                        });
                        if (saveTimestamp != 0) {
                            oldCasualTimestamp = saveTimestamp;
                        }
                    }
                }
            });

            $.ajax({
                url: 'monitored/',
                type: 'GET',
                dataType: 'json',
                success: (dataList) => {
                    if (dataList) {
                        saveTimestamp = 0;

                        dataList.forEach((data) => {
                            if (oldMonitoredTimestamp < data.timestamp) {
                                if (!(data.text in dict)) {
                                    dict[data.text] = 1;
                                    saveTimestamp = data.timestamp;
                                    addMonitored(data.text);
                                }
                            }
                        })
                        if (saveTimestamp != 0) {
                            oldMonitoredTimestamp = saveTimestamp;
                        }
                    }
                }
            });
        });
    }, 500);

    $(document).ready(() => {

        $("#submit").click(() => {
            console.log("clicked");

            postData = {
                percentage: $("#percentage").val(),
                threshold_OU: $("#threshold_OU").val(),
                threshold_1X2: $("#threshold_1X2").val(),
                line_monitoring: $("#line_monitoring").is(":checked"),
            };

            var requestMedia = $.ajax({
                url: "/",
                type: "POST",
                data: JSON.stringify(postData),
                dataType: "json",
                cache: false, 
                contentType: "application/json",
            });
        });

    });

}