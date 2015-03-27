"use strict";

var FRAME_ID = "#eyebrowse-frame";
var TEMPLATE_HTML = {};

Object.size = function(obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

// List of HTML entities for escaping.
var unescapeMap = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x60;": "`"
};

// Functions for escaping and unescaping strings to/from HTML interpolation.
var createEscaper = function(map) {
    var escaper = function(match) {
        return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = "(?:" + _.keys(map).join("|") + ")";
    var testRegexp = new RegExp(source);
    var replaceRegexp = new RegExp(source, "g");
    return function(string) {
        string = string === null ? "" : "" + string;
        return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
};
var _unescape = createEscaper(unescapeMap);

function initTemplates() {
    var url = chrome.extension.getURL("../html/prompt.html");
    var templates = $($.ajax({
        type: "GET",
        url: url,
        dataType: "html",
        async: false
    }).responseText);
    for (var i = 0; i < templates.length; i++) {
        var el = $(templates[i]);
        var id = el.attr("id");
        if (id !== undefined) {
            TEMPLATE_HTML["#" + id] = el;
        }
    }
}

function getTemplate(templateId, templateArgs) {
    templateArgs = templateArgs || {};
    if (!Object.size(TEMPLATE_HTML)) {
        initTemplates();
    }
    var template = _unescape(TEMPLATE_HTML[templateId].html());
    return $(_.template(template, templateArgs));
}

function truncate(str, length) {
    if (str.length > length) {
        return str.substring(0, length);
    } else {
        return str;
    }
}

function createTrackPrompt(url) {
    return getTemplate("#track-prompt", {
        "url": new URL(url).hostname,
    });
}

function createLoginPrompt() {
    return getTemplate("#login-prompt");
}

function createBubblePrompt(data, baseUrl) {

    if (data.active_users.length === 0 && data.message === "") {
        return null;
    }

    // no idea where this comes from...
    var msgContainerWidth = (data.active_users.length * 24) + 10;
    var userContainerTop;
    if (data.message === "") {
        if (msgContainerWidth === 34) {
            msgContainerWidth = 45;
        }
        userContainerTop = 0;
    } else {
        msgContainerWidth += 195;
        userContainerTop = -15;
    }

    msgContainerWidth = msgContainerWidth.toString() + "px !important";
    userContainerTop = userContainerTop.toString() + "px !important";

    var msg = truncate(data.message, 51);
    if (data.user_url === "") {
        msg = truncate(data.message, 78);
    }
    msg = createMentionTag(msg);

    var template = getTemplate("#bubble-prompt", {
        "msg": msg,
        "user_url": data.user_url,
        "username": data.username,
        "about_message": data.about_message,
        "users": data.active_users,
        "msgContainerWidth": msgContainerWidth,
        "userContainerTop": userContainerTop,
    });

    return template;
}
/*
    Call the eyebrowse server to get an iframe with a prompt
    Can either be a login or track type prompt.
*/
function setup(baseUrl, promptType, user, url, protocol) {
    if ($(FRAME_ID).length) {
        $(FRAME_ID).css("z-index", 999999999);
        return;
    }

    var frameHtml;

    if (promptType === "trackPrompt") {
        frameHtml = createTrackPrompt(url);
        addFrame(frameHtml);

        chrome.extension.sendMessage(JSON.stringify({
            "action": "nag",
            "url": window.document.URL
        }));

        $("#eyebrowse-allow-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "filterlist",
                "type": "whitelist",
                "url": url
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

        $("#eyebrowse-deny-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "filterlist",
                "type": "blacklist",
                "url": url
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

        $("#eyebrowse-close-btn").click(function() {
            $(FRAME_ID).remove();
        });

    } else if (promptType === "loginPrompt") {
        frameHtml = createLoginPrompt();
        addFrame(frameHtml);

        $("#eyebrowse-ignore-btn").click(function() {
            $(FRAME_ID).remove();
            var msg = {
                "action": "ignore"
            };
            chrome.extension.sendMessage(JSON.stringify(msg));
        });

    } else if (promptType === "getInfo" && protocol === "http:") { // TODO fix with ssl certs for eyebrowse
        $.ajax({
            url: baseUrl + "/ext/bubbleInfo/",
            type: "POST",
            data: {
                "url": url,
                "csrfmiddlewaretoken": user.csrf,
            },
            success: function(data) {
                frameHtml = createBubblePrompt(data, baseUrl);
                addFrame(frameHtml);
            }
        });
    }
}

function setFade() {

    var fadeTime = 3000; //8 seconds
    var $popup = $(FRAME_ID);

    var fadePopup = setTimeout(function() {
        fade($popup);
    }, fadeTime);

    $popup.hover(function() {
        clearInterval(fadePopup);
        $popup.stop();
        $popup.css("opacity", 1.0);
    });

    $popup.mouseleave(function() {
        fadePopup = setTimeout(function() {
            fade($popup);
        }, fadeTime);
    });
}

function fade(el) {
    var $popup = $(FRAME_ID);
    el.fadeOut(1000, function() {
        $popup.animate({
            "top": $(FRAME_ID).css("top") - 120
        }, 500);
        $(FRAME_ID).remove();
    });
}

/*
 * Add the prompt css to the main page
 */
function addStyle() {
    if (!$("#eyebrowse-frame-css").length) {
        var url = chrome.extension.getURL("../css/prompt.css");
        $("head").append("<link id='eyebrowse-frame-css' href='" + url + "' type='text/css' rel='stylesheet' />");
    }
}


/*
 * Helper function which adds a popup frame to the page
 */
function addFrame(frameHtml) {
    if (frameHtml === null) {
        return;
    }
    $("body").append(frameHtml);
    addStyle();
    $(FRAME_ID).css("visibility", "visible");
    setFade();
}

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    var protocol = window.location.protocol;
    var url = document.URL;
    var action = request.action;

    if (action === "prompt") {
        setup(request.baseUrl, request.type, request.user, url, protocol);
    }
});
