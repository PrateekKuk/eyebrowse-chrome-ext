///////////Models//////////////

//User object holds the status of the user, the cookie from the server, preferences for eyebrowse, whitelist, blacklist, etc
var User = Backbone.Model.extend({
    defaults: {
        'loggedIn' : false,
        'whitelist' : new FilterSet({
            'type' : 'whitelist',
        }), 
        'blacklist' : new FilterSet({
            'type' : 'blacklist',
        }),
    },
    //when the user is logged in set the boolean to give logged in views.
    setLogin : function(status) {
        this.set({ 
            'loggedIn': status,
        });
    },
    //type is whitelist or blacklist which calls update method on FilterSet object
    updateSet : function(listType, item, action) {
         if (action == 'add') {
            this.get(listType).addItem(item);
        } else if (action == 'rm') {
            this.get(listType).rmItem(item);
        }
    }
});


//This object can represent either a whitelist or blacklist for a given user. On an update send results to server to update stored data. On intialization set is synced with server. Should allow offline syncing in the future.
var FilterSet = Backbone.Model.extend({
    
    defaults : {
        'set' : {},
        'type' : ''
    },

    initialize : function() {
        _.bindAll(this); //allow access to 'this' in callbacks with 'this' meaning the object not the context of the callback
    },

    getType : function() {
        return this.get('type')
    },

    getSet : function() {
        return this.get('set')
    },

    syncSet : function() {
        var payload = {
            'type' : this.getType(),
        };
        var url = this.urlSync();
        /* 
            we send the server the type of set we want to sync and reset our set to be what the server has. This allows access across computers/entensions
        */
        $.post(url, payload, function(res){
            if (res.success) {     
                this.set({
                    'set' : res.set,
                });
            }
        });
    },

    addItem : function(item) {
        var set = this.getSet();
        set[item] = item;

        var payload = {
            'type' : this.getType(),
            'action' : 'add',
            'item': item,
        }
        this.updateSet(payload);
    },

    rmItem : function(item) {
        var set = this.getSet();
        delete set[item];
        var payload = {
            'type' : this.getType(),
            'action' : 'rm',
            'item': item,
        }
        this.updateSet(payload);
    },

    updateSet : function(payload) {
        var url = urlUpdateSet();
        $.post(url, payload, function(res) {
            return this.res.success //return true or false maybe we have a gui update here.
        });
    },

    urlSync : function() {
        return baseUrl //+ todo 
    },

    urlUpdateSet : function() {
        return baseUrl // + todo
    },
});

/*
    inputs:
    tabId - indentifer of tab (unique to session only)
    url - url of the tab making the request
    title - title of the webpage the tab is displaying
    event_type - whether a tab is opening or closing/navigating to a new page etc
*/
function open_item(tabId, url, title, event_type) {

    //if event type is focus we need to close out the current tab
    if (event_type === "focus" && active_item != undefined) {
        close_item(active_item.tabId, 'blur');
    }
    
    //reassign the active item to be the current tab
    active_item = {
        'tabId' : tabId,
        'url' : url,
        'title' : title,
        'start_event' : event_type,
        'start_time' : new Date().getTime(), // milliseconds
    }

    open_items.push(active_item); // tmp for dev/testing
    update_badge();
}


local_storage = [] //tmp tmp tmp
function close_item(tabId, event_type) {
    /* 
        There is only ever one active_item at a time so only close out the active one. 
        This event will be fired when a tab is closed or unfocused but we would have already 'closed' the item so we don't want to do it again.
    */

    if (active_item.tabId === tabId) {
        //write to local storage
        var item = $.extend({}, active_item); //copy active_item
        item.end_event = event_type
        item.end_time = new Date().getTime()
        item.tot_time = item.start_time - item.end_time
        local_storage.push(item)
    }
}


//tmp for dev
function update_badge() {

    chrome.browserAction.setBadgeText(
        {
            text: String(open_items.length + 1)
        });
}


///////////Global vars/////////////
var baseUrl = "http://localhost:8000" // global website base, set to localhost for testing
//var baseUrl = "http://eyebrowse.herokuapp.com"

/////////init models///////
var user = new User();

// dictionary mapping all open items. Keyed on tabIds and containing all information to be written to the log. 
open_items = [];
var active_item;
open_items_dict = {};