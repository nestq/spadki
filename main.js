const express = require('express');
const path = require('path');
const jsdom = require('jsdom');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const { JSDOM } = jsdom;
const { window } = new JSDOM();
const { document } = (new JSDOM('')).window;
global.document = document;

var $ = jQuery = require('jquery')(window);

const app = express();
app.use('/static', express.static('public'));

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/casual', function(req, res) {
    res.send(casualText);
    res.end();
});

app.get('/monitored', function(req, res) {
    res.send(monitoredText);
    res.end();
});

// app.get('/', function(req, res) {
//     res.render('contact', {qs: req.query});
// });

app.use(bodyParser.json());

// END OF CONFIGURATION


// GETTING PARAMETERS

percentage = 30;
threshold_OU = 0.4;
threshold_1X2 = 0.4;
threshold_handi = 0.4;
line_monitoring = false;

app.post('/', function(req, res) {
    console.log(req.body);
    percentage = req.body.percentage;
    threshold_OU = req.body.threshold_OU;
    threshold_1X2 = req.body.threshold_1X2;
    // threshold_handi = req.body.threshold_handi;
    line_monitoring = req.body.line_monitoring;

    console.log("saved values: ");
    console.log("percentage: " + percentage);
    console.log("threshold_OU: " + threshold_OU);
    console.log("threshold_1X2: " + threshold_1X2);
    // console.log("threshold_handi: " + threshold_handi);
    // res.render('contact', {qs: req.query});
    res.end();
});

app.listen(process.env.PORT || 8000);

// END OF PARAMETERS

var casualText = "";
var monitoredText = "";

void (async() => {
    try {

        const TIMEOUT_TIME = 5 * 1000;
        const PARSING_INTERVAL = 2 * 1000;

        console.log("started puppeteer");   
        const browser = await puppeteer.launch({ headless: true, args:['--no-sandbox', '--disable-setuid-sandbox'] })
        const pageOU = await browser.newPage();
        const page1X2 = await browser.newPage();
        const urlOU = "http://www.nowgoal.com/OU.htm";
        const url1X2 = "http://www.nowgoal.com/Comp.htm?type=2";
        await pageOU.goto(urlOU);
        await pageOU.waitFor(TIMEOUT_TIME);
        await page1X2.goto(url1X2);
        await page1X2.waitFor(TIMEOUT_TIME);

        console.log("loaded");
        text = "Page loaded.";
        timestamp = Date.now();

        info = {
            text,
            timestamp,
        };

        casualText = [info];

        await pageOU.waitFor(TIMEOUT_TIME / 2);
        await page1X2.waitFor(TIMEOUT_TIME / 2);

        var dict = {};
        var dict1X2 = {};
        var monitoredMessages = [];

        async function parse() {
            console.log("parsing...");
            
            // const used = process.memoryUsage().heapUsed / 1024 / 1024;
            // const total = process.memoryUsage().heapTotal / 1024 / 1024;
            // const rss = process.memoryUsage().rss / 1024 / 1024;
            // console.log(`Heap used: ${Math.round(used * 100) / 100} MB`);
            // console.log(`Heap total: ${Math.round(total * 100) / 100} MB`);
            // console.log(`Rss: ${Math.round(rss * 100) / 100} MB`);

            casualText = null;

            // monitoredMessages = null;
            // monitoredMessages = [];

            // monitoredText = null;
            // monitoredText = [];

            // dict = {};
            // dict1X2 = {};

            // clean monitoredMessages at midnight
            var now = new Date();
            if (now.getHours() == 0 && now.getMinutes() == 0 && now.getSeconds() <= 30) {
                monitoredMessages = null;
                monitoredMessages = [];

                casualText = null;
                casualText = [];

                monitoredText = null;
                monitoredText = [];

                dict = null;
                dict = {};

                dict1X2 = null;
                dict1X2 = {};
            }

            var parameters = {
                percentage, 
                threshold_OU,
                threshold_1X2,
                threshold_handi,
                line_monitoring,
            };
            
            // OVER/UNDER PART

            dataOU = await pageOU.evaluate(({dict, parameters, monitoredMessages}) => {

                let matches = document.querySelectorAll('div[id="odds"] tr[align="center"]');
                let matchesNumber = matches.length;

                let matchesInfo = [];

                const MONITORED_BOOKS = ["Crown", "Sbobet", "12BET", "Bet365"];

                casualMessages = [];
                
                matches.forEach((match) => {
                    teamAName = match.querySelector('td[style="text-align:left;"] div[id^="home"]').textContent;
                    teamBName = match.querySelector('td[style="text-align:left;"] div[id^="away"]').textContent;
                    matchID = teamAName + ' vs ' + teamBName;

                    scoreA = match.querySelector('span[id^="hs"]').textContent;
                    scoreB = match.querySelector('span[id^="gs"]').textContent;
                    scoreInfo = scoreA + ' - ' + scoreB;
                    
                    matchTime = match.querySelector('span[id^="ms"]').textContent;

                    if (!matchTime) {
                        matchTime = "PRE";
                    }

                    oddsInfo = [];

                    if (!(matchID in dict)) {
                        dict[matchID] = {};
                    }

                    MONITORED_BOOKS.forEach((book) => {
                        oddsBox = match.querySelector('td[title="' + book + '"]');
                        
                        overValue = oddsBox.querySelector('a[class="sb"]');
                        if (overValue) {
                            overValue = oddsBox.querySelector('a[class="sb"]').textContent;
                        }
                    
                        lineValue = oddsBox.querySelector('a[class="pk"]');
                        if (lineValue) {
                            lineValue = oddsBox.querySelector('a[class="pk"]').textContent;
                        }
                        
                        underValue = oddsBox.textContent;

                        if (overValue && lineValue && underValue) {

                            underValue = underValue.replace(overValue, '').replace(lineValue, '');

                            if (!(book in dict[matchID])) {
                                dict[matchID][book] = {} ;
                            }

                            if (!("scoreInfo" in dict[matchID][book])) {
                                dict[matchID][book]["scoreInfo"] = scoreInfo;
                            }

                            if (!("currentLine" in dict[matchID][book])) {
                                dict[matchID][book]["currentLine"] = lineValue;
                                dict[matchID][book][lineValue] = { overValue, underValue };
                                dict[matchID][book]["scoreInfo"] = scoreInfo;
                            }
                            else {
                                if (dict[matchID][book]["currentLine"] == lineValue) {
                                    // the line is the same

                                    oldOverValue = dict[matchID][book][lineValue].overValue;
                                    oldUnderValue = dict[matchID][book][lineValue].underValue;


                                    // over casual change
                                    if (Math.abs(oldOverValue - overValue) > 0) {
                                        casualMessages.push({
                                            text: matchTime + " | " + matchID + " | " + book +  " | <b>Over</b> | O: " + 
                                            lineValue + " | " + oldOverValue + " -> " + overValue,
                                            timestamp: Date.now(), 
                                        });
                                        dict[matchID][book][lineValue].overValue = overValue;
                                        dict[matchID][book]["scoreInfo"] = scoreInfo;
                                    }

                                    // under casual change
                                    // if (Math.abs(oldUnderValue - underValue) > 0) {
                                    //     casualMessages.push({
                                    //         text: matchID + " | " + book +  " | Under | U: " + lineValue + " | " + oldUnderValue + " -> " + underValue,
                                    //         timestamp: Date.now(), 
                                    //     });
                                    //     dict[matchID][book][lineValue].underValue = underValue;
                                    //     dict[matchID][book]["scoreInfo"] = scoreInfo;
                                    // }

                                    // over percentage change
                                    if (((oldOverValue - overValue) / oldOverValue) >= (parameters.percentage / 100)) {
                                        monitoredMessages.push({
                                            text: matchTime + " | " + matchID + " | " + book +  " | <b>Over</b> | O: " + 
                                            lineValue + " | " + oldOverValue + " -> " + overValue,
                                            timestamp: Date.now(), 
                                        });
                                        dict[matchID][book][lineValue].overValue = overValue;
                                        dict[matchID][book]["scoreInfo"] = scoreInfo;
                                    } 

                                    // over threshold change
                                    if (overValue <= parameters.threshold_OU && oldOverValue > parameters.threshold_OU) {
                                        monitoredMessages.push({
                                            text: matchTime + " | " + matchID + " | " + book +  " | <b>Over</b> | O: " + 
                                            lineValue + " | " + oldOverValue + " -> " + overValue,
                                            timestamp: Date.now(), 
                                        });
                                        dict[matchID][book][lineValue].overValue = overValue;
                                        dict[matchID][book]["scoreInfo"] = scoreInfo;
                                    }

                                    // under threshold change
                                    // if (underValue < parameters.threshold_OU && oldUnderValue > parameters.threshold_OU) {
                                    //     monitoredMessages.push({
                                    //         text: matchID + " | " + book +  " | Under | O: " + lineValue + " | " + oldUnderValue + " -> " + underValue,
                                    //         timestamp: Date.now(), 
                                    //     });
                                    //     dict[matchID][book][lineValue   ].underValue = underValue;
                                    //     dict[matchID][book]["scoreInfo"] = scoreInfo;
                                    // }
                                }
                                else {
                                    // there is a change of line
                                    
                                    if (parameters.line_monitoring) {
                                        if (dict[matchID][book]["scoreInfo"] == scoreInfo) { 
                                            // no goal
                                            oldLine = dict[matchID][book]["currentLine"];
                                            newLine = lineValue;

                                            if (oldLine.includes('/')) {
                                                oldLine = oldLine.split('/')[1];
                                            }

                                            if (newLine.includes('/')) {
                                                newLine = newLine.split('/')[0];
                                            }

                                            if (newLine > oldLine)
                                            {
                                                monitoredMessages.push({
                                                    text: matchTime + " | " + matchID + " | " + book + " | O/U | <b>zmiana linii:</b> " + 
                                                    dict[matchID][book]["currentLine"] + " -> " + lineValue,
                                                    timestamp: Date.now(),
                                                });
                                            }
                                            else {
                                                casualMessages.push({
                                                    text: matchTime + " | " + matchID + " | " + book + " | O/U | <b>zmiana linii:</b> " + 
                                                    dict[matchID][book]["currentLine"] + " -> " + lineValue,
                                                    timestamp: Date.now(),
                                                });
                                            }

                                            dict[matchID][book]["currentLine"] = lineValue;
                                            dict[matchID][book][lineValue] = { overValue, underValue };
                                            dict[matchID][book]["scoreInfo"] = scoreInfo;
                                        }
                                        else {
                                            // goal
                                            casualMessages.push({
                                                text: matchTime + " | " + matchID + " | " + book + " | O/U | <b>zmiana linii:</b> " + 
                                                dict[matchID][book]["currentLine"] + " -> " + lineValue,
                                                timestamp: Date.now(),
                                            });
                                            dict[matchID][book]["currentLine"] = lineValue;
                                            dict[matchID][book][lineValue] = { overValue, underValue };
                                            dict[matchID][book]["scoreInfo"] = scoreInfo;
                                        }
                                    }

                                    // at last delete info about last lineValue
                                    oldLine = dict[matchID][book]["currentLine"];
                                    dict[matchID][book][oldLine] = {};
                                }
                            }
                            
                            oddsObject = {
                                book,
                                overValue,
                                lineValue,
                                underValue,
                                matchID,
                            }

                            oddsInfo.push(oddsObject);
                        }
                    });

                    matchesInfo.push([matchID, scoreInfo, oddsInfo]);
                });
                
                let timestamp = Date.now();

                return {
                    matchesNumber,
                    matchesInfo,
                    dict,
                    casualMessages,
                    monitoredMessages,
                    timestamp,    
                };
            }, {dict, parameters, monitoredMessages} );
            dict = dataOU.dict;
            monitoredMessages = dataOU.monitoredMessages;
            console.log("parameters: ");
            console.log(parameters);
            console.log(dataOU.casualMessages[0]);
            console.log(dataOU.monitoredMessages[0]);
            console.log(dataOU.matchesNumber);
            console.log(dataOU.matchesInfo[0]);
            casualText = dataOU.casualMessages;
            monitoredText = dataOU.monitoredMessages;

            // END OF OVER/UNDER PART

            // BEGINNING OF 1X2 PART
            
            // data1X2 = await page1X2.evaluate(({dict1X2, parameters, monitoredMessages}) => {

            //     let matches = document.querySelectorAll('div[id="odds"] tr[align="center"][height="15"]');
            //     let matchesNumber = matches.length;

            //     let matchesInfo = [];

            //     const MONITORED_BOOKS = ["Crown", "Sbobet", "12BET", "Bet365"];

            //     casualMessages = [];
                
            //     matches.forEach((match) => {
            //         teamAName = match.querySelector('td[style="text-align:left;"] div[id^="home"]').textContent;
            //         teamBName = match.querySelector('td[style="text-align:left;"] div[id^="away"]').textContent;
            //         matchID = teamAName + ' vs ' + teamBName;

            //         scoreA = match.querySelector('span[id^="hs"]').textContent;
            //         scoreB = match.querySelector('span[id^="gs"]').textContent;
            //         scoreInfo = scoreA + ' - ' + scoreB;
                    
            //         matchTime = match.querySelector('span[id^="ms"]').textContent;

            //         if (!matchTime) {
            //             matchTime = "PRE";
            //         }

            //         oddsInfo = [];

            //         if (!(matchID in dict1X2)) {
            //             dict1X2[matchID] = {};
            //         }

            //         MONITORED_BOOKS.forEach((book) => {
            //             oddsBox = match.querySelector('td[title="' + book + '"]');
                        
            //             homeValue = oddsBox.querySelector('td[id^="Homewin"]').textContent;
            //             standoffValue = oddsBox.querySelector('td[id^="Standoff"]').textContent;
            //             guestValue = oddsBox.querySelector('td[id^="Guestwin"]').textContent;
                        
            //             currentValues = {
            //                 homeValue,
            //                 standoffValue,
            //                 guestValue,
            //             };

            //             if (homeValue && standoffValue && guestValue) {
                            
            //                 oldValues = {};

            //                 if (!(book in dict1X2[matchID])) {
            //                     dict1X2[matchID][book] = {};
            //                 }
            //                 else {
            //                     if (!("values" in dict1X2[matchID][book])) {
            //                         dict1X2[matchID][book]["values"] = {};
            //                     }
            //                     else {
            //                         oldValues = dict1X2[matchID][book]["values"];
            //                     }
            //                 }

            //                 if (!("scoreInfo" in dict1X2[matchID][book])) {
            //                     dict1X2[matchID][book]["scoreInfo"] = scoreInfo;
            //                 }
                            
            //                 if (oldValues) {

            //                     // homeValue

            //                     if (Math.abs(oldValues.homeValue - currentValues.homeValue) > 0) {

            //                         casualMessages.push({
            //                             text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Gospodarz (1)</b> " + 
            //                             oldValues.homeValue + " -> " + currentValues.homeValue,
            //                             timestamp: Date.now(),
            //                         });

            //                     }

            //                     // standoffValue

            //                     if (Math.abs(oldValues.standoffValue - currentValues.standoffValue) > 0) {

            //                         casualMessages.push({
            //                             text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Remis (X)</b> " + 
            //                             oldValues.standoffValue + " -> " + currentValues.standoffValue,
            //                             timestamp: Date.now(),
            //                         });

            //                     }

            //                     // guestValue

            //                     if (Math.abs(oldValues.guestValue - currentValues.guestValue) > 0) {

            //                         casualMessages.push({
            //                             text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Gość (2)</b> " + 
            //                             oldValues.guestValue + " -> " + currentValues.guestValue,
            //                             timestamp: Date.now(),
            //                         });

            //                     }

            //                     if (dict1X2[matchID][book]["scoreInfo"] == scoreInfo) { 
            //                         // no goal

            //                         // homeValue

            //                         if (oldValues.homeValue >= parameters.threshold_1X2 && currentValues.homeValue < parameters.threshold_1X2) {
            //                             monitoredMessages.push({
            //                                 text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Gospodarz (1)</b> " + 
            //                                 oldValues.homeValue + " -> " + currentValues.homeValue,
            //                                 timestamp: Date.now(),
            //                             });
            //                         }

            //                         // standoffValue

            //                         if (oldValues.standoffValue >= parameters.threshold_1X2 && currentValues.standoffValue < parameters.threshold_1X2) {
            //                             monitoredMessages.push({
            //                                 text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Remis (X)</b> " + 
            //                                 oldValues.standoffValue + " -> " + currentValues.standoffValue,
            //                                 timestamp: Date.now(),
            //                             });
            //                         }

            //                         // guestValue

            //                         if (oldValues.guestValue >= parameters.threshold_1X2 && currentValues.guestValue < parameters.threshold_1X2) {
            //                             monitoredMessages.push({
            //                                 text: matchTime + " | " + matchID + " | " + book + " | 1X2 | <b>Gość (2)</b> " + 
            //                                 oldValues.guestValue + " -> " + currentValues.guestValue,
            //                                 timestamp: Date.now(),
            //                             });
            //                         }

            //                     }
            //                 }
                            
            //                 dict1X2[matchID][book]["scoreInfo"] = scoreInfo;
            //                 dict1X2[matchID][book]["values"] = currentValues;
                            
            //                 homeValue = currentValues.homeValue;
            //                 standoffValue = currentValues.standoffValue;
            //                 guestValue = currentValues.guestValue;

            //                 oddsObject = {
            //                     book,
            //                     homeValue,
            //                     standoffValue,
            //                     guestValue,
            //                     matchID,
            //                 }

            //                 oddsInfo.push(oddsObject);
            //             }
            //         });

            //         matchesInfo.push([matchID, scoreInfo, oddsInfo]);
            //     });
                
            //     let timestamp = Date.now();

            //     return {
            //         matchesNumber,
            //         matchesInfo,
            //         dict1X2,
            //         casualMessages,
            //         monitoredMessages,
            //         timestamp,    
            //     };
            // }, {dict1X2, parameters, monitoredMessages} );
            // dict1X2 = data1X2.dict1X2;
            // monitoredMessages = dataOU.monitoredMessages.concat(data1X2.monitoredMessages);
            // console.log("parameters: ");
            // console.log(parameters);
            // console.log(data1X2.casualMessages[0]);
            // console.log(data1X2.monitoredMessages[0]);
            // console.log(data1X2.matchesNumber);
            // console.log(data1X2.matchesInfo[0]);
            // casualText = dataOU.casualMessages.concat(data1X2.casualMessages);
            // monitoredText = dataOU.monitoredMessages.concat(data1X2.monitoredMessages);
            

            dataOU = null;
            data1X2 = null;
            // END OF 1X2 PART

        }

        setInterval(parse, PARSING_INTERVAL);
    }
    catch(error) {
        console.log(error);
    }
})();
