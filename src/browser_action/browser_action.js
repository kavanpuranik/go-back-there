
function initOptions() {
    $("#options-url").attr("href", chrome.extension.getURL('src/options/options.html'));

    chrome.runtime.sendMessage({type: "get-active-tab-base-url"}, function(result) {

        if (result.activeTabBaseUrl){
            $("#search").attr("placeholder", "Search history for " + result.activeTabBaseUrl + ". Start with > for pre-defined urls");
        }
    });


    chrome.tabs.query({active: true, windowId: chrome.windows.WINDOW_ID_CURRENT}, function (tab) {

        var url = tab[0].url;
        var activeTabBaseUrl = "";
        if (url) {
            var parts = url.split("/");
            activeTabBaseUrl = parts[0] + "//" + parts[2];
        }
    });
}

function initSearchInput() {

    $("#search").autocomplete({
        minLength: 0,
        select: function (event, ui) {

            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {

                chrome.tabs.update(tabs[0].id, {url: ui.item.url});
            });

            window.close();
            return true;
        },
        source: function (request, response) {

            chrome.runtime.sendMessage({type: "query", query: request.term}, function (result) {

                response($.map(result.suggestions, function (item) {
                    return {
                        title: item.description,
                        url: item.content
                    }
                }));

            });
        },
        focus: function (event, ui) {
            return false;
        }

    }).data("ui-autocomplete")._renderItem = function (ul, item) {
        return $("<li>")
            .append("<a><span>" + item.title + "</span><br><span>" + item.url + "</span></a>")
            .appendTo(ul);
    };

    // need a timeout to make this work
    setTimeout(function () {
        $("#search").autocomplete("search", "");
    }, 500);
}

var _s;

$(function() {
    initSearchInput();
    initOptions();
});



