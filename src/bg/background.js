
var GoBackThere = {};
GoBackThere.urlMapping = {};

/**
 * Begin Listeners
 */
chrome.runtime.onStartup.addListener(function() {

    console.log("on startup event");
    loadMapping();
});

chrome.runtime.onInstalled.addListener(function() {

    console.log("on installed event");
    loadMapping();
});

chrome.runtime.onMessage.addListener(function(msg, messageSender, sendResponse) {

    if (msg.type === "query"){

        var processResults = function(suggestions, historyResults){

            suggestions.forEach(function(suggestion){
                suggestion.type = "pre-defined";
            });

            historyResults.forEach(function(historyResult){
                historyResult.type = "history";
            });

            sendResponse({suggestions: suggestions.concat(historyResults)});
        }

        querySuggestions(msg.query, function(suggestions){

            searchHistory(msg.query, function(historyResults){

                processResults(suggestions, historyResults);
            });
        });

    } else if (msg.type === "save-settings"){

        saveSettings(msg.mappingString, function(settings){

            sendResponse({settings: settings});
        });
    }  else if (msg.type === "get-active-tab-base-url"){

        onGetActiveTabBaseUrl(function(activeTabBaseUrl){
            sendResponse({activeTabBaseUrl: activeTabBaseUrl});
        });
    }

    // wait for async sendResponse
    return true;
});

chrome.omnibox.onInputStarted.addListener(function(){
	
	onGetActiveTabBaseUrl(function(activeTabBaseUrl){
		chrome.omnibox.setDefaultSuggestion({description: "type to navigate within " + activeTabBaseUrl});
	});
});


chrome.omnibox.onInputChanged.addListener(function(query, suggest) {

    var processResults = function(suggestions, historyResults){

        console.log("suggestions:" + suggestions.length);
        console.log("history:" + historyResults.length);

        suggestions.forEach(function(suggestion){
            suggestion.description = "> " + suggestion.description;
        });

        var all = suggestions.concat(historyResults);

        // clean up invalid XML characters or else chrome omnibox errors out while XML parsing.
        // Did not like CDATA block either!
        all.forEach(function(item){
            item.description = item.description.replace(/&/g, "and").replace(/</g,"");
        });

        suggest(all);
    }

    querySuggestions(query, function(suggestions){

        searchHistory(query, function(historyResults){

            processResults(suggestions, historyResults);
        });
    });
});


chrome.omnibox.onInputEntered.addListener(function(url) {

    chrome.tabs.query({active : true, currentWindow : true}, function(tabs) {

        chrome.tabs.update(tabs[0].id, {url : url});
    });
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    loadMapping();
});

/**
 * End Listeners
 */

function querySuggestions(query, callback) {

    // query should begin with m space for suggestions
    if (query.indexOf(">") !== 0){
        callback([]);
        return;
    }

    query = query.substring(1);

    var querySuggestions = function (activeTabBaseUrl) {

        if (!activeTabBaseUrl){
            callback([]);
            return;
        }

        if (!GoBackThere.urlMapping.keys) {

            callback([
                {content: chrome.extension.getURL('src/options/options.html'), description: "No pre-defined urls configured. Go to Options."}
            ]);
            return;
        }

        var suggestions = [];
        for (var i = 0; i < GoBackThere.urlMapping.keys.length; i++) {
            if (GoBackThere.urlMapping.keys[i].toLowerCase().indexOf(query.toLowerCase()) !== -1) {

                var suggestion = {};
                suggestion.content = activeTabBaseUrl + GoBackThere.urlMapping.map[GoBackThere.urlMapping.keys[i]];
                suggestion.description = GoBackThere.urlMapping.keys[i];
                suggestions.push(suggestion);
            }

            if (suggestions.length > 10){
                break;
            }
        }

        if (suggestions.length === 0) {
            callback([
                {content: "", description: "No Matches"}
            ]);
        } else {
            callback(suggestions);
        }
    };

    onGetActiveTabBaseUrl(querySuggestions);
}

function searchHistory (query, callback){

    if (query.indexOf(">") === 0){
        query = query.substring(1);
    }

    var queryHistory = function(activeTabBaseUrl){

        var microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
        var queryStartTime = new Date().getTime() - 4 * microsecondsPerWeek;

        chrome.history.search({
                'text': query,
                'startTime': queryStartTime,
                'maxResults': 500
            },
            function(historyItems) {

                var suggestions = [];
                for (var i = 0; i < historyItems.length; ++i) {

                    if (activeTabBaseUrl && !hasSameDomain(historyItems[i].url, activeTabBaseUrl)){

                         continue;
                    }

                    var suggestion = {};
                    suggestion.content = historyItems[i].url;
                    suggestion.description = historyItems[i].title ? historyItems[i].title : historyItems[i].url;
                    suggestions.push(suggestion);

                    if (suggestions.length > 10){
                        break;
                    }
                }

                callback(suggestions);
            });
    };

    onGetActiveTabBaseUrl(queryHistory);

}

function hasSameDomain(url, compareToUrl){

    return url.split("/")[2] === compareToUrl.split("/")[2];
}

function onGetActiveTabBaseUrl(callback){
	
    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tab){

    	var url = tab[0].url;
    	var activeTabBaseUrl = "";
    	if (url){
    		var parts = url.split("/");
    		activeTabBaseUrl = parts[0] + "//" + parts[2];
    	}

        callback(activeTabBaseUrl);
    });
	
	
}

function loadMapping(){

    chrome.storage.local.get('settings', function(items) {

        var settings = items.settings;
        if (settings && settings.mapping) {
            populateMapping(settings.mapping);
        }
    });
}

function populateMapping(mapping) {
    var keys = [];
    for (var key in mapping) {
        keys.push(key);
    }

    GoBackThere.urlMapping.map = mapping;
    GoBackThere.urlMapping.keys = keys;

    console.log("mappings populated. size: " + keys.length);
}

function saveSettings(mappingString, callback) {

    var mapping = {};
    if (mappingString !== "") {
        var lines = mappingString.split("\n");

        for (var i = 0; i < lines.length; i++) {
            var split = lines[i].split(":");
            mapping[split[0]] = split[1];
        }
    }

    var settings = {};
    settings.mappingString = mappingString;
    settings.mapping = mapping;

    console.log("mappings saved. size:" + settings.mapping.length);

    chrome.storage.local.set({'settings': settings}, function () {

        console.log("saved settings successfully!");
        callback(settings);
    });
}
