var Botkit = require('botkit');
var http = require('http');
var _ = require('lodash');
var dateformat = require("dateformat");
var convertTime = require("convert-time");

var getColourStatus = (givenValue) => {
    if (givenValue < 50) {
        return "danger";
    }
    else if (givenValue < 100 && givenValue > 50) {
        return "warning";
    }
    else if (givenValue = 100) {
        return "good";
    }
}

var formattedTime = (givenTime) => {
    var formattedTime = givenTime.replace('.', ':')
                                .replace('.', ':')
                                .replace('chrome', 'Chrome')
                                .replace('firefox', 'Firefox')
                                .replace('internet explorer', 'Internet Explorer')
                                .replace('safari', 'Safari');

    if (/\s/.test(formattedTime)) {
        // It has any kind of whitespace
        var time = formattedTime.substr(0, formattedTime.indexOf(' '));
        var browser = formattedTime.substr(formattedTime.indexOf('on'));
        if (convertTime(time, "HH:mm A")) {
            return `at ${convertTime(time, "HH:mm A")} UK time ${browser}`;
        }
        else {
           return `named ${formattedTime}`;
        }
    }
    else
        return `named ${formattedTime}`;
}

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.VERIFICATION_TOKEN) {
    console.log('Error: Specify CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(1336, (err, webserver) => {
    controller.createWebhookEndpoints(controller.webserver);

    controller.createOauthEndpoints(controller.webserver, (err, req, res) => {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


controller.on('slash_command', (slashCommand, message) => {

    switch (message.command) {
        case "/regressiontestresults":

        // try {
        //     const environmentName = message.text.match(/on(.*)for/)[1].trim();
        //     const featureName = message.text.match(/for(.*)/);
        // }
        // catch (e) {
        //     return slashCommand.replyPrivate(message, "*command not recognised*");
        // }
        
            if (message.text.includes('/')) {

                var environment = message.text.substr(0, message.text.indexOf('/'));
                var feature = message.text.substr(message.text.indexOf('/')+1);

                http.get({
                    hostname: 'localhost',
                    port: 1337,
                    path: '/environments'
                }, function (response) {
                    var body = '';
                    response.on('data', (d) => {
                        body += d;
                    });
                    response.on('end', () => {
                        var environmentsResponse = JSON.parse(body);

                        if (_.includes(environmentsResponse.environments, environment)) {
                            
                            http.get({
                                hostname: 'localhost',
                                port: 1337,
                                path: `/environments/${environment}/features`
                            }, function (response) {
                                var body = '';
                                response.on('data', (d) => {
                                    body += d;
                                });
                                response.on('end', () => {
                                    var featureResponse = JSON.parse(body);
                                    var featureArray = [];
                                    _.each(featureResponse.features, (individualFeature) => {
                                        if (individualFeature.name === feature) {
                                            featureArray.push(individualFeature);
                                        }
                                    });

                                    if (featureArray.length > 0 && _.includes(featureArray[0].name, feature)) {

                                        http.get({
                                            hostname: 'localhost',
                                            port: 1337,
                                            path: `/summary/${environment}/${feature}`
                                        }, function (response) {
                                            var body = '';
                                            response.on('data', (d) => {
                                                body += d;
                                            });
                                            response.on('end', () => {
                                                var summaryResponse = JSON.parse(body);

                                                var outputObject = {
                                                    attachments: []
                                                };

                                                _.each(summaryResponse.result, (individualFeature) => {
                                                    //var latestReportLink = `http://regression-dashboard.domain.com:1337/${individualFeature.latestReportLink}`;
                                                    var latestReportLink = `http://localhost:1337/${individualFeature.latestReportLink}`;
                                                    var text;
                                                    var colour;
                                                    
                                                    if (individualFeature.latestResult!=undefined)
                                                    {
                                                        text = `Result for test ran on ${dateformat(individualFeature.latestDay, "dddd, dS mmm yyyy")}, ${formattedTime(individualFeature.latestHour)}. ${individualFeature.latestResult}% passed.`;
                                                        colour = getColourStatus(individualFeature.latestResult);
                                                        
                                                    }
                                                    else
                                                    {
                                                        text = `Unable to fetch result data for tests initiated ${formattedTime(individualFeature.latestHour)}.\nA report can be viewed by clicking the hyperlink.`;
                                                        colour = `warning`;
                                                    }

                                                    outputObject.attachments.push({
                                                        title: individualFeature.featureName,
                                                        title_link: latestReportLink, 
                                                        color: colour,
                                                        text: text,
                                                    });

                                                });

                                                if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.

                                                slashCommand.replyPublic(message, outputObject);
                                                return;
                                            });
                                        });
                                    }
                                    else {
                                        slashCommand.replyPrivate(message,
                                        "*" + feature + "* is not a valid feature name.\nPlease type in a valid feature name. *These features are case sensitive*.\n");
                                    }
                                });
                            });
                        }
                        else {
                            slashCommand.replyPrivate(message,
                                        "*" + environment + "* is not a valid environment name.\nPlease type in a valid environment name. *These environments are case sensitive*. \nFor a full list of environments, type `/regressiontestresults listEnvironments`\nIf unsure, use `/regressiontestresults help`");
                        }
                    });
                });
                return;
            }
            else {
                switch (message.text) {
                    case "help":
                    case "":
                        slashCommand.replyPrivate(message,
                            "I give you test results.\n"
                            + "Type `/regressiontestresults Dev` to see the all of the latest test results for the features listed in the Development environment.\n"
                            + "Type `/regressiontestresults Dev/Feature1` to get the result for Feature1 on the Development environment.\n" 
                            + "Type `/regressiontestresults listEnvironments` to view all of the available environments.\n"
                            + "Type `/regressiontestresults test` to test the Slack application's availability.");
                        break;
                    case "listEnvironments":
                        var outputMessage = "Current valid environments include:\n";

                        http.get({
                            hostname: 'localhost',
                            port: 1337,
                            path: '/environments'
                        }, function (response) {
                            var body = '';
                            response.on('data', (d) => {
                                body += d;
                            });
                            response.on('end', () => {
                                var environmentsResponse = JSON.parse(body);
                                _.each(environmentsResponse.environments, (individualEnvironment) => {

                                    outputMessage += `${individualEnvironment}\n`;
                                });

                                slashCommand.replyPrivate(message, outputMessage);
                                return;
                            });
                        });
                        break;
                    case "test":
                        slashCommand.replyPrivate(message, "*Alive*");
                        break;
                    default: 
                        http.get({
                            hostname: 'localhost',
                            port: 1337,
                            path: '/environments'
                        }, function (response) {
                            var body = '';
                            response.on('data', (d) => {
                                body += d;
                            });
                            response.on('end', () => {
                                var environmentsResponse = JSON.parse(body);

                                if (_.includes(environmentsResponse.environments, message.text)) {
                                    return http.get({
                                        hostname: 'localhost',
                                        port: 1337,
                                        path: `/summary/${message.text}`
                                    }, (response) => {
                                        // Continuously update stream with data
                                        var body = '';
                                        response.on('data', (d) => {
                                            body += d;
                                        });
                                        response.on('end', () => {
                                            // Data reception is done, do whatever with it!
                                            var serverResponse = JSON.parse(body);
                                            var outputObject = {
                                                attachments: []
                                            };

                                            _.each(serverResponse.results, (individualFeature) => {
                                                    //var latestReportLink = `http://regression-dashboard.domain.com:1337/${individualFeature.latestReportLink}`;
                                                    var latestReportLink = `http://localhost:1337/${individualFeature.latestReportLink}`;
                                                    var text;
                                                    var colour;
                                                    
                                                    if (individualFeature.latestResult!=undefined)
                                                    {
                                                        text = `Result for test ran on ${dateformat(individualFeature.latestDay, "dddd, dS mmm yyyy")}, ${formattedTime(individualFeature.latestHour)}. ${individualFeature.latestResult}% passed.`;
                                                        colour = getColourStatus(individualFeature.latestResult);
                                                        
                                                    }
                                                    else
                                                    {
                                                        text = `Unable to fetch result data for tests initiated ${formattedTime(individualFeature.latestHour)}.\nA report can be viewed by clicking the hyperlink.`;
                                                        colour = `warning`;
                                                    }

                                                    outputObject.attachments.push({
                                                        title: individualFeature.featureName,
                                                        title_link: latestReportLink, 
                                                        color: colour,
                                                        text: text,
                                                    });

                                            });

                                            // but first, let's make sure the token matches!
                                            if (message.token !== process.env.VERIFICATION_TOKEN) return; //just ignore it.

                                            slashCommand.replyPublic(message, outputObject);
                                            return;
                                        });
                                    });
                                }
                                else {
                                    slashCommand.replyPrivate(message,
                                        "*" + message.text + "* is not a valid environment name.\nPlease type in a valid environment name. *These environments are case sensitive*. \nFor a full list of environments, type `/regressiontestresults listEnvironments`\nIf unsure, use `/regressiontestresults help`");
                                }
                            })
                        });
                        break;
                }
                break;
            }
        default:
            slashCommand.replyPublic(message, "I'm afraid I don't know how to " + message.command + " yet.");
            break;
    }

});