/*
    Mediawiki API JavaScript
    Copyright (C) 2014 Oliver Moran <oliver.moran@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


/** NODE MODULES **/

var MediaWiki = {};

(function (MediaWiki) {
    
    // first, let's determine if we can use XMLHttpRequest
    var useXMLHttpRequest = (typeof XMLHttpRequest == "undefined") ? false : true;

    var Request = null;
    if (!useXMLHttpRequest) {
        // no? ok, assume we're in Node
        var Request = require('request');
    }


    /** GLOBAL VARIABLES **/

    // module version number (used in User-Agent)
    var version = "0.0.0";

    // module home page (used in User-Agent)
    var homepage = "https://github.com/oliver-moran/mediawiki";

    // the edit token
    var token = null;

    // min next time before making next request
    var future = 0;

    // the process queue
    var queue = [];

    // is a request in process
    var inProcess = false;

    /** CONSTRUCTOR AND SETTINGS **/

    /**
     * The Bot constructor
     * @param config an Object representing configuration settings
     */
    function Bot(config) {
        if (typeof config == "object") {
            var props = Object.getOwnPropertyNames(config);
            var _this = this;
            props.forEach(function(prop) {
                _this.settings[prop] = config[prop];
            });
        }

        future = (new Date()).getTime();
    }

    // default settings
    Bot.prototype.settings = {
        endpoint: "http://en.wikipedia.org:80/w/api.php",
        rate: 60e3 / 10,
        userAgent: (useXMLHttpRequest)
            ? "MediaWiki/" + version + "; " + window.navigator.userAgent + "; <" + homepage + ">"
            : "MediaWiki/" + version + "; Node/" + process.version + "; <" + homepage + ">",
        byeline: "(bot edit)"
    };

    /** GENERIC REQUEST FUNCTIONS **/

    /**
     * Makes a GET request
     * @param args the arguments to pass to the WikiMedia API
     * @param callback (optional) a function to call on response
     * @param isPriority (optional) a boolean, if true the request 
     * will be added to the front of the request queue
     */
    Bot.prototype.get = function (args, callback, isPriority) {
        if (typeof callback == "boolean") {
            isPriority = callback;
            callback = null;
        }
        _queueRequest.call(this, args, "GET", callback, isPriority)
    };

    /**
     * Makes a POST request
     * @param args the arguments to pass to the WikiMedia API
     * @param callback (optional) a function to call on response
     * @param isPriority (optional) a boolean, if true the request 
     * will be added to the front of the request queue
     */
    Bot.prototype.post = function (args, callback, isPriority) {
        if (typeof callback == "boolean") {
            isPriority = callback;
            callback = null;
        }
        _queueRequest.call(this, args, "POST", callback, isPriority)
    };

    // queues requests, throttled by Bot.prototype.settings.rate
    function _queueRequest(args, method, callback, isPriority){
        if (isPriority) {
            queue.unshift([args, method, callback])
        } else {
            queue.push([args, method, callback])
        }
        _processQueue.call(this);
    }

    // attempt to process queued requests
    function _processQueue() {
        if (queue.length == 0) return;
        if (inProcess) return;

        inProcess = true; // we are go

        var now = (new Date()).getTime()
        var delay = future - now;
        if (delay < 0) delay = 0;

        var _this = this;
        setTimeout(function(){
            _makeRequest.apply(_this, queue.shift());
        }, delay);
    }

    // makes a request, regardless of type under Node
    function _makeRequest(args, method, callback) {
        args.format = "json"; // we will always expect JSON

        if (useXMLHttpRequest) {
            _makeXMLHttpRequestRequest.call(this, args, method, callback);
            return;
        }

        var options = {
            uri: this.settings.endpoint,
            qs: args,
            method: method,
            form: args,
            jar: true,
            headers: {
                "User-Agent": this.settings.userAgent
            }
        }

        var _this = this;
        Request.get(options, function (error, response, body) {
            _processResponse.call(_this, error, response, body, callback);
        });

    }

    // makes a request, regardless of type using XMLHttpRequest
    function _makeXMLHttpRequestRequest(args, method, callback) {
        var params = _serialize(args);
        var uri = this.settings.endpoint + "?" + params;
        
        var _this = this;

        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                //console.log(request.responseText);
                _processResponse.call(_this, (request.status != 200), { statusCode: request.status }, request.responseText, callback);
            }
        }
        request.open(method.toUpperCase(), uri);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.send(params);
    }

    function _serialize(obj) {
        var query = [];
        var props = Object.getOwnPropertyNames(obj);
        props.forEach(function (prop) {
            query.push(encodeURIComponent(prop) + "=" + encodeURIComponent(obj[prop]));
        });
        return query.join("&");
    }



    // process an API response
    function _processResponse(error, response, body, callback) {
        if (!error && response.statusCode == 200) {
            var data = {};
            try {
                data = JSON.parse(body);
            } catch (err) {
                console.error("Err:" + err);
            }
            _callback.call(this, callback, [data]);

            future = (new Date()).getTime() + this.settings.rate;
            inProcess = false;
            _processQueue.call(this);
        }
    }

    // performs a (safe) scoped callback
    function _callback(callback, arguments){
        if (typeof callback == "function") {
            callback.apply(this, arguments);
        }
    }


    /** SPECIFIC REQUEST FUNCTIONS **/


    /**
     * Log in to the Wiki
     * @param username the user to log in as
     * @param password the password to use
     * @param callback a function to call on completion
     */
    Bot.prototype.login = function (username, password, callback) {
        this.post({ action: "login", lgname: username, lgpassword: password }, function (body) {
            if (body.login.result == "Success") {
                _callback.call(this, callback, [body.login.result, body.login.lgusername]);
            } else if (body.login.result == "NeedToken") {
                this.post({ action: "login", lgname: username, lgpassword: password, lgtoken: body.login.token }, function (body) {
                    if (body.login.result == "Success") {
                        _callback.call(this, callback, [body.login.result, body.login.lgusername]);
                    } else {
                        _callback.call(this, callback, [body.login.result]);
                    }
                }, true);
            } else {
                _callback.call(this, callback, [body.login.result]);
            }
        });
    };

    /**
     * Logs out of the Wiki
     * @param callback a function to call on completion
     */
    Bot.prototype.logout = function (callback) {
        // post to MAKE SURE it always happens
        this.get({ action: "logout" }, function (body) {
            _callback.call(this, callback);
        });
    };

    /**
     * Requests the current user name
     * @param callback a function to call, passes the user name (or IP) if successful
     */
    Bot.prototype.name = function (callback) {
        this.userinfo(function (userinfo) {
            _callback.call(this, callback, [userinfo.name]);
        });
    }

    // a duplicate reference for tradition's sake
    Bot.prototype.whoami = Bot.prototype.name;

    /**
     * Requests the current userinfo
     * @param callback a function to call, passes a userinfo object if successful
     */
    Bot.prototype.userinfo = function (callback) {
        this.get({ action: "query", meta: "userinfo" }, function (body) {
            _callback.call(this, callback, [body.query.userinfo]);
        });
    }


    /** MODULE EXPORTS **/

    if (!useXMLHttpRequest) {
        exports.version = version;
        exports.Bot = Bot;
    } else {
        MediaWiki.version = version;
        MediaWiki.Bot = Bot;
    }

})(MediaWiki);