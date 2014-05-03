MediaWiki
=========

This [Node.js](http://nodejs.org/) module is a JavaScript framework for the [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page). It can be used to create a bot to edit Wikipedia, for example.

To run a bot process in the cloud, you could consider using a service like [Cloud9](https://c9.io).

The framework provides wrapper frunctions for generic calls to the MediaWiki API. These wrappers can be used to write other functions that perform specific tasks (such as logging in, editing a page, getting back links, etc.). The framework already includes some of these.

But let's grow the framework! Why not fork this repository and add your functions. Then, if you make a pull request, your new functions can be added in to the main branch.

Have fun!

Installation
------------

Install on Node using:

    npm install mediawiki

To create a bot, create a new instance of the Bot class from the module:

    var MediaWiki = require("mediawiki");
    var bot = new MediaWiki.Bot();

Now, you can use the generic wrapper method to make any API call, like this:

    bot.get({ action: "query", meta: "userinfo" }).complete(function (response) {
        console.log(response.query.userinfo);
    });
    
Or you can use one of the in-built functions to make a call like this:
    
    bot.userinfo().complete(function (userinfo) {
        console.log(userinfo);
    });
    
Multiple requests will be queued and executed in order.
    
Settings
--------

A bot can have the following settings:

 - `endpoint` The location of the MediaWiki API. Default: http://en.wikipedia.org:80/w/api.php
 - `rate` The number of miliseconds to wait between making API requests. Default: 6 seconds.
 - `userAgent`: The user agent to use for the bot. Default: "MediaWiki/x.y.z; Node/x.y.z; <https://github.com/oliver-moran/mediawiki>"
 - `byeline`: A string to append to every edit summary. Default: "(using the MediaWiki module for Node.js)"

These can be set like this:

    var bot = new WikiMedia.Bot();
    bot.settings.endpoint = "https://en.wiktionary.org/w/api.php";
    bot.settings.rate = 60e3 / 10;
    bot.settings.userAgent = "ExampleBot <https://en.wiktionary.org/wiki/User:Example>";
    bot.settings.byeline = "(bot edit)";
        
Or with the constructor, like this:
    
    var bot = new WikiMedia.Bot({
        endpoint: "https://en.wiktionary.org/w/api.php",
        rate: 60e3 / 10,
        userAgent: "ExampleBot <https://en.wiktionary.org/wiki/User:Example>",
        byeline: "(bot edit)"
    });

If a settings isn't specified then the default setting will be used.

Methods
-------

The framework provides to generic wrapper methods. One for HTTP GET requests and another for HTTP POST requests. The signatures for these are identical:

    bot.get(Object args[, Boolean isPriority]);
    bot.post(Object args[, Boolean isPriority]);

 - `args` A JavaScript Object corresponding to the arguments passed to a call in the [WikiMedia API](https://www.mediawiki.org/wiki/API:Main_page)
 - `isPriority` A Boolean (optional). If true, the request will be added to the front of the request queue (i.e. will be executed before all other queued requests). Default: false.

Each of these methods return a [promise](https://en.wikipedia.org/wiki/Futures_and_promises). This promise is used to catch complete or error states, as follows:

    var request = bot.get({ action: "query", meta: "userinfo" });
    
    request.complete(function (response) {
        console.log(response.query.userinfo);
    });
    
    request.error(function (err) {
        console.log(err.toString());
    });

For a generic wrapper method, the complete callback receives a single JavaScript Object containing the response from the API. The error callback receives a JavaScript Error object with basic information about what went wrong.

You do not have to provide a complete or error callback for any request. The default behavior for the error callback is to throw an exception. The default behavior for the complete callback is to do nothing. In any case, if the error callback is made, the complete callback is never called.

The complete and error callbacks can be set more succinctly like this:

    bot.get({ action: "query", meta: "userinfo" }).complete(function (response) {
        console.log(response.query.userinfo);
    }).error(function (err) {
        console.log(err.toString());
    });

NB: For generic requests, the error callback is not called for application-level errors (e.g. if a user could not log in). It will only fire if the server could not be contacted or if the framework could not parse the response.

Pre-baked methods
-----------------

As well a providing a generic wrapper for the WikiMedia API, the module also provides a set of pre-baked calls (e.g. to log in, read a page, modify it, and log out).

These methods and their complete callbacks takes specific arguments. The error callback for each is identical and receives a JavaScript Error object with basic information about what went wrong.

The last argument in each method is an optional Boolean. As with the generic wrapper methods, if this argument is true then the method will be added to the top of the request queue.

The current list of pre-baked methods and the arugments the receive is as follows:

    // log in to the wiki
    bot.login(String user, String password[, Boolean isPriority]).complete(function (String username) {
        console.log("Logged in as " + username);
    });

    // log out of the wiki
    bot.logout([Boolean isPriority]).complete(function () {
        console.log("Logged out!");
    });

    // get the user name of the current user
    bot.whoami([Boolean isPriority]).complete(function (String username) {
        console.log("You are " + username);
    });

    // get information about the current user
    bot.userinfo([Boolean isPriority]).complete(function (Object userinfo) {
        console.log(userinfo);
    });

    // get the text and last revision date of a page
    bot.page(String title[, Boolean isPriority]).complete(function (String title, String text, Date date) {
        console.log(title);
        console.log(text.length);
        console.log(date);
    });

    // get information on the last n number of edits to a page
    bot.history(String title, Number count[, Boolean isPriority]).complete(function (String title, Array<Object> history) {
        console.log(title);
        console.log(history.length);
    });

    // get the text and revision date of a specific revision to a page
    bot.revision(Number id[, Boolean isPriority]).complete(function (String title, String text, Date date) {
        console.log(title);
        console.log(text.length);
        console.log(date);
    });

    // replace the contents of a page with text
    bot.edit(String title, String text, summary[, Boolean isPriority]).complete(function (String title, Number revision, Date date) {
        console.log(title);
        console.log(revision);
        console.log(date.toString());
    });
    
Queued requsts
--------------

All requests an queued and executed in order. By default, there is a 6 second pause between requests. However, not that some pre-baked requests are comprised of a number of seperate request so may appear to take longer.

The following will execute in sequence:

    bot.login("example", "password");
    bot.edit("User:Example/sandbox", "Hello, World", "this is a test edit");
    bot.logout();
    
There are times, when you will want to make sure that request inside a callback are priorities above request already on the queue. In that case, set `isPriority` to true for the nested requests and they will be executed before the already queued requests.

The following will resore to the previous version of the page before logging out:

    bot.login("example", "password");
    bot.history("User:Example/sandbox", 2).complete(function (title, history) {
        var id = history[1].revid;
        bot.revision(id, true).complete(function (title, text, date) {
            bot.edit(title, text, "restore to previous content", true);
        });
    });
    bot.logout();

Web-browser support
-------------------

The module is written so as to be also executable as a JavaScript library in a web browser. However, your are likely to encounter cross-domain security issues if the library is executed in a web browser on the different domain to the target MediaWiki installation.

See included example (`browser.html`) for sample use in a web-browser.

License
-------

This module is licensed under the [General Public License](http://opensource.org/licenses/GPL-3.0).