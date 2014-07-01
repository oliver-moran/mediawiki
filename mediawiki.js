/*
    A Mediawiki API JavaScript framework
    Copyright (C) 2014 Oliver Moran <oliver.moran@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

var MediaWiki = {};

(function (MediaWiki) {

    /** NODE MODULES **/

    // first, let's determine if we can use XMLHttpRequest
    var useXMLHttpRequest = (typeof XMLHttpRequest == "undefined") ? false : true;

    var Request = null;
    if (!useXMLHttpRequest) {
        // no? ok, assume we're in Node
        var Request = require('request');
    }


    /** GLOBAL VARIABLES **/

    // module version number (used in User-Agent)
    var version = "0.0.11";

    // module home page (used in User-Agent)
    var homepage = "https://github.com/oliver-moran/mediawiki";
    
    
    /** THE PROMISE PROTOTYPE **/
    
    function Promise(){ /* Constructor */ }
    
    // default complete and error callbacks (intended to be over-ridden)
    Promise.prototype._onComplete = function () { /* All is good */ };
    Promise.prototype._onError = function (err) { throw err; };

    /**
     * Sets the complete callback
     * @param callback a Function to call on complete
     */
    Promise.prototype.complete = function(callback){
        this._onComplete = callback;
        return this;
    };
    
    /**
     * Sets the error callback
     * @param callback a Function to call on error
     */
    Promise.prototype.error = function(callback){
        this._onError = callback;
        return this;
    };

    
    /** THE BOT CONSTRUCTOR AND SETTINGS **/
    
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

        this._future = (new Date()).getTime();
        this._queue = [];
        this._inProcess = false;
    }

    // default settings
    Bot.prototype.settings = {
        endpoint: "http://en.wikipedia.org:80/w/api.php",
        rate: 60e3 / 10,
        userAgent: (useXMLHttpRequest)
            ? "MediaWiki/" + version + "; " + window.navigator.userAgent + "; <" + homepage + ">"
            : "MediaWiki/" + version + "; Node/" + process.version + "; <" + homepage + ">",
        byeline: "(using the MediaWiki module for Node.js)"
    };

    
    /** GENERIC REQUEST METHODS **/

    /**
     * Makes a GET request
     * @param args the arguments to pass to the WikiMedia API
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.get = function (args, isPriority) {
        return _request.call(this, args, isPriority, "GET");
    };

    /**
     * Makes a POST request
     * @param args the arguments to pass to the WikiMedia API
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.post = function (args, isPriority) {
        return _request.call(this, args, isPriority, "POST");
    };
    
    // does the work of Bot.prototype.get and Bot.prototype.post
    function _request(args, isPriority, method) {
        var promise = new Promise();
        _queueRequest.call(this, args, method, isPriority, promise);
        return promise;
    }

    // queues requests, throttled by Bot.prototype.settings.rate
    function _queueRequest(args, method, isPriority, promise){
        if (isPriority === true) {
            this._queue.unshift([args, method, promise])
        } else {
            this._queue.push([args, method, promise])
        }
        _processQueue.call(this);
    }

    // attempt to process queued requests
    function _processQueue() {
        if (this._queue.length == 0) return;
        if (this._inProcess) return;

        this._inProcess = true; // we are go

        var now = (new Date()).getTime()
        var delay = this._future - now;
        if (delay < 0) delay = 0;

        var _this = this;
        setTimeout(function(){
            _makeRequest.apply(_this, _this._queue.shift());
        }, delay);
    }

    // makes a request, regardless of type under Node
    function _makeRequest(args, method, promise) {
        args.format = "json"; // we will always expect JSON

        if (useXMLHttpRequest) {
            _makeXMLHttpRequestRequest.call(this, args, method, promise);
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
            if (!error && response.statusCode == 200) {
                _processResponse.call(_this, body, promise);
            } else {
                promise._onError.call(_this, new Error(response.statusCode));
            }
        });

    }

    // makes a request, regardless of type using XMLHttpRequest
    function _makeXMLHttpRequestRequest(args, method, promise) {
        var params = _serialize(args);
        var uri = this.settings.endpoint + "?" + params;
        
        var _this = this;

        var request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    _processResponse.call(_this, request.responseText, promise);
                } else {
                    promise._onError.call(_this, new Error(request.status));
                }
            }
        }
        request.open(method.toUpperCase(), uri);
        request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        request.send(params);
    }

    // make a key-value string from a JavaScript Object
    function _serialize(obj) {
        var query = [];
        var props = Object.getOwnPropertyNames(obj);
        props.forEach(function (prop) {
            query.push(encodeURIComponent(prop) + "=" + encodeURIComponent(obj[prop]));
        });
        return query.join("&");
    }

    // process an API response
    function _processResponse(body, promise) {
        var data = {};
        try {
            data = JSON.parse(body);
        } catch (err) {
            promise._onError.call(this, err);
        }
        promise._onComplete.call(this, data);

        this._future = (new Date()).getTime() + this.settings.rate;
        this._inProcess = false;
        _processQueue.call(this);
    }

    
    /** PRE-BAKED FUNCTIONS **/

    /**
     * Log in to the Wiki
     * @param username the user to log in as
     * @param password the password to use
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.login = function (username, password, isPriority) {
        var promise = new Promise();
        
        this.post({ action: "login", lgname: username, lgpassword: password }, isPriority).complete(function (data) {
            switch (data.login.result) {
                case "Success":
                    promise._onComplete.call(this, data.login.lgusername);
                    break;
                case "NeedToken":
                    this.post({ action: "login", lgname: username, lgpassword: password, lgtoken: data.login.token }, true).complete(function (data) {
                        if (data.login.result == "Success") {
                            promise._onComplete.call(this, data.login.lgusername);
                        } else {
                            promise._onError.call(this, new Error(data.login.result));
                        }
                    }).error(function (err) {
                        promise._onError.call(this, err);
                    });
                    break;
                default:
                    promise._onError.call(this, new Error(data.login.result));
                    break;
            }
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    };

    /**
     * Logs out of the Wiki
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.logout = function (isPriority) {
        var promise = new Promise();
        
        // post to MAKE SURE it always happens
        this.post({ action: "logout" }, isPriority).complete(function () {
            promise._onComplete.call(this);
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    };

    /**
     * Requests the current user name
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.name = function (isPriority) {
        var promise = new Promise();
        
        this.userinfo(isPriority).complete(function (userinfo) {
            promise._onComplete.call(this, userinfo.name);
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    };

    // a duplicate reference for tradition's sake
    Bot.prototype.whoami = Bot.prototype.name;

    /**
     * Requests the current userinfo
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.userinfo = function (isPriority) {
        var promise = new Promise();
        
        this.get({ action: "query", meta: "userinfo" }, isPriority).complete(function (data) {
            promise._onComplete.call(this, data.query.userinfo);
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    };
    
    /**
     * Request the content of page by title
     * @param title the title of the page
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.page = function (title, isPriority) {
        return _page.call(this, { titles: title }, isPriority);
    };

    /**
     * Request the content of page by revision ID
     * @param the revision ID of the page
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.revision = function (id, isPriority) {
        return _page.call(this, { revids: id }, isPriority);
    };
    
    // does the work of Bot.prototype.page and Bot.prototype.revision
    // and ensures both functions return the same things
    function _page(query, isPriority) {
        var promise = new Promise();
        
        query.action = "query";
        query.prop = "revisions";
        query.rvprop = "timestamp|content";
        
        this.get(query, isPriority).complete(function (data) {
            var pages = Object.getOwnPropertyNames(data.query.pages);
            var _this = this;
            pages.forEach(function (id) {
                var page = data.query.pages[id];
                promise._onComplete.call(_this, page.title, page.revisions[0]["*"], new Date(page.revisions[0].timestamp));
            });
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    }

    /**
     * Request the history of page by title
     * @param title the title of the page
     * @param count how many revisions back to return
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.history = function (title, count, isPriority) {
        var promise = new Promise();
        
        var c = "";
        var rvc = "";
        var history = [];
        (function next(isPriority){
            var args = { action: "query", prop: "revisions", titles: title, rvprop: "timestamp|user|ids|comment|size|tags", rvlimit: count, continue:c};
            if (c != "") args.rvcontinue = rvc;
            var _this = this;
            this.get(args, isPriority).complete(function (data) {
                var pages = Object.getOwnPropertyNames(data.query.pages);
                var page = data.query.pages[pages[0]];
                page.revisions.forEach(function (revision) {
                    revision.timestamp = new Date(revision.timestamp);
                    if (history.length < count) history.push(revision);
                });
                if (data.continue && history.length < count) {
                    c = data.continue.continue;
                    rvc = data.continue.rvcontinue;
                    next.call(_this, true);
                } else {
                    promise._onComplete.call(this, page.title, history);
                }
            }).error(function (err) {
                promise._onError.call(this, err);
            });
        }).call(this, isPriority);
        
        return promise;
    };

    /**
     * Request the members of a category by category title
     * @param category the title of the category
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.category = function (category, isPriority) {
        var promise = new Promise();
        
        var c = "";
        var cmc = "";
        var pages = [];
        var subcategories = [];
        (function next(isPriority){
            var args = { action: "query", list: "categorymembers", cmtitle: category, cmlimit:"max", cmsort: "sortkey", cmdir: "desc", continue:c};
            if (c != "") args.cmcontinue = cmc;
            var _this = this;
            this.get(args, isPriority).complete(function (data) {
                var members = data.query.categorymembers;
                members.forEach(function (member) {
                    if (member.ns == 14) {
                        subcategories.push(member.title);
                   } else {
                        pages.push(member.title);
                    }
                });
                if (data.continue) {
                    c = data.continue.continue;
                    cmc = data.continue.cmcontinue;
                    next.call(_this, true);
                } else {
                    promise._onComplete.call(this, category, pages, subcategories);
                }
            }).error(function (err) {
                promise._onError.call(this, err);
            });
        }).call(this, isPriority);
        
        return promise;
    };

    
    /**
     * Edits a page on the wiki
     * @param title the title of the page to edit
     * @param text the text to replace the current content with
     * @param summary an edit summary to leave (the bot's byeline will be appended after a space)
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.edit = function (title, text, summary, isPriority) {
        summary += " " + this.settings.byeline;
        return _edit.call(this, title, null, text, summary, isPriority);
    };
    
    /**
     * Adds a section to a page on the wiki
     * @param title the title of the page to edit
     * @param heading the heading text for the new section
     * @param body the body text of the new section
     * @param isPriority (optional) should the request be added to the top of the request queue (defualt: false)
     */
    Bot.prototype.add = function (title, heading, body, isPriority) {
        return _edit.call(this, title, "new", body, heading, isPriority);
    };
    
    // does the work of Bot.prototype.edit and Bot.prototype.add
    // section should be null to replace the entire page or "new" to add a new section
    function _edit(title, section, text, summary, isPriority) {
        var promise = new Promise();
        
        this.get({ action: "query", prop: "info|revisions", intoken: "edit", titles: title }, isPriority).complete(function (data) {
            //data.tokens.edittoken
            var props = Object.getOwnPropertyNames(data.query.pages);
            var _this = this;
            props.forEach(function (prop) {
                var token = data.query.pages[prop].edittoken;
                var starttimestamp = data.query.pages[prop].starttimestamp;
                var basetimestamp = data.query.pages[prop].revisions[0].timestamp;
                var args = { action: "edit", title: title, text: text, summary: summary, token: token, bot: true, basetimestamp: basetimestamp, starttimestamp: starttimestamp };
                if (section != null) args.section = section;
                _this.post(args, true).complete(function (data) {
                    if (data.edit.result == "Success") {
                        promise._onComplete.call(this, data.edit.title, data.edit.newrevid, new Date(data.edit.newtimestamp));
                    } else {
                        promise._onError.call(this, new Error(data.edit.result));
                    }
                }).error(function (err) {
                    promise._onError.call(_this, err);
                });
            });
        }).error(function (err) {
            promise._onError.call(this, err);
        });
        
        return promise;
    }

    // TODO: get thes pages and categories in a category

    /** MODULE EXPORTS **/

    MediaWiki.version = version;
    MediaWiki.Bot = Bot;

    if (typeof exports == "object") {
        // assume we are using Require.js or similar
        var props = Object.getOwnPropertyNames(MediaWiki);
        props.forEach(function (prop) {
            exports[prop] = MediaWiki[prop];
        });
    }
    
})(MediaWiki);