$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    var items = backpage.local_storage;
    $.each(items, function(key, value) {
        $('.visited-items').append(sprintf('<li>%s, %s, %s, %s</li>', value.tabId, value.url, value.title, value.start_event));
        });

    $('#reset').click(function (e) {
        $('#main').html("Pages Visited:");
        backpage.local_storage = [];
    });
});