function setup(baseUrl, host) {
    if ($("#eyebrowse-frame").length) {
        $("#eyebrowse-frame").css("z-index", 999999999);
        return;
    }
    var size = 350;
    var height = 200;
    var settings =  {
        "z-index": 999999999,
        "border-style": "none",
        "width": size,
        "height": height,
        "position": "fixed",
        "right": "0px",
        "top": "0px",
    };
    var eyebrowseFrame = $("<iframe>").css(settings).attr("id", "eyebrowse-frame").attr("src", baseUrl + "/ext/prompt?site=" + host);

    $("body").append(eyebrowseFrame);
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    host = window.location.host;
    var action = request.action;
    if (action == "prompt") {
        setup(request.baseUrl, host);
    
        window.addEventListener("message", function(e){
                if (e.origin === request.baseUrl){
                    var message = JSON.parse(e.data);
                    message.action = "filterlist";
                    message.url = host;
                    chrome.extension.sendMessage(JSON.stringify(message));
                }
        }, false);
    }
});