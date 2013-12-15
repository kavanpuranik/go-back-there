$(function(){

    var storage = chrome.storage.local;

    storage.get('settings', function(items) {

         $('textarea').val(items.settings.mappingString);
    });

    $('button.submit').click(function saveSettings() {

        var mappingString = $('textarea').val();

        if (!mappingString) {
            message('Error: Cannot be empty');

            storage.get('settings', function(items) {
                $('textarea').val(items.settings.mappingString);
            });

            return;
        }

        chrome.runtime.sendMessage({type: "save-settings", mappingString: mappingString}, function(result) {
            message('Settings saved');
        });
    });

    function message(msg) {
        var message = document.querySelector('.submit-message');
        message.innerText = msg;
        setTimeout(function() {
            message.innerText = '';
        }, 3000);
    }
});

