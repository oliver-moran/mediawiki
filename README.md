MediaWiki
=========

This [Node.js](http://nodejs.org/) module is a JavaScript framework for the [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page). An example use is to used to create a bot to edit Wikipedia. This bot could be run from your own computer or from a remote computer. To run a bot process in the cloud, you could consider using a service like [Cloud9](https://c9.io).

The framework provides generic methods to make calls to the MediaWiki API. The framework also includes a collection of pre-baked functions that build on the generic methods to perform specific tasks (e.g. logging in, editing a page, and logging out).

This collection is far from complete. So, if you can code, why not [fork this project](https://github.com/oliver-moran/mediawiki/fork) and work on implementing a [baked-in functions](https://github.com/oliver-moran/mediawiki/issues?labels=Functions&page=1&state=open) in the backlog? Or, if you have an idea for pre-baked function, why not [make a feature request](https://github.com/oliver-moran/mediawiki/issues)?

In any case, have fun!

Installation
------------

Install on Node.js using:

    npm install mediawiki

To create a bot, create a new instance of the Bot class from the module:

    var MediaWiki = require("mediawiki");
    var bot = new MediaWiki.Bot();

Now, you can use the generic wrapper method to make any API call, like this:

    bot.get({ action: "query", meta: "userinfo" }).complete(function (response) {
        console.log(response.query.userinfo);
    });
    
Or, you can use one of the pre-baked functions to make the same call like this:
    
    bot.userinfo().complete(function (userinfo) {
        console.log(userinfo);
    });
    
See the include example (`examples/example.js`) for further examples.
    
Settings
--------

A bot can have the following settings:

 - `endpoint` The location of the target MediaWiki API. Default: "http://en.wikipedia.org:80/w/api.php".
 - `rate` The number of miliseconds to wait between making API requests. Default: 6 seconds.
 - `userAgent`: The user agent to use with the bot. Default: "MediaWiki/x.y.z; Node/x.y.z; <https://github.com/oliver-moran/mediawiki>".
 - `byeline`: A string to append to every edit summary. Default: "(using the MediaWiki module for Node.js)".

These can be set like this:

    var bot = new WikiMedia.Bot();
    bot.settings.endpoint = "https://en.wiktionary.org/w/api.php";
    bot.settings.rate = 60e3 / 10;
    bot.settings.userAgent = "ExampleBot <https://en.wiktionary.org/wiki/User:Example>";
    bot.settings.byeline = "(example bot edit)";
        
These can also be set with the constructor, like this:
    
    var bot = new WikiMedia.Bot({
        endpoint: "https://en.wiktionary.org/w/api.php",
        rate: 60e3 / 10,
        userAgent: "ExampleBot <https://en.wiktionary.org/wiki/User:Example>",
        byeline: "(example bot edit)"
    });

If a settings isn't specified then the default setting will be used.

Methods
-------

The framework provides two generic wrapper methods. One for HTTP GET requests and another for HTTP POST requests. The signatures for these are identical:

    bot.get(Object args[, Boolean isPriority]);
    bot.post(Object args[, Boolean isPriority]);

 - `args` A JavaScript Object corresponding to the arguments to be passed to the [WikiMedia API](https://www.mediawiki.org/wiki/API:Main_page) call.
 - `isPriority` (optional) A Boolean. If true, the request will be added to the front of the request queue (i.e. will be executed before all other queued requests). Default: false.

Both of these methods return a [promise](https://en.wikipedia.org/wiki/Futures_and_promises). This promise is used to set complete and error callbacks, as follows:

    var request = bot.get({ action: "query", meta: "userinfo" });
    
    request.complete(function (response) {
        console.log(response.query.userinfo);
    });
    
    request.error(function (err) {
        console.log(err.toString());
    });

The complete and error callbacks can also be set succinctly like this:

    bot.get({ action: "query", meta: "userinfo" }).complete(function (response) {
        console.log(response.query.userinfo);
    }).error(function (err) {
        console.log(err.toString());
    });

The complete callback receives a single JavaScript Object containing the response from the API. The error callback receives a JavaScript Error object with basic information about what went wrong.

You do not have to set the complete or error callback for any request. The default complete callback will do nothing. The default error callback will throw an exception. In all cases, if the error callback is called, the complete callback is never called.

Pre-baked functions
--------------------

As well a providing a generic methods for interacting with the WikiMedia API, the module also provides a set of pre-baked functions that automate specific tasks (e.g. to log in, edit a page, and log out).

The pre-baked functions and their complete callbacks all take specific arguments. However, the error callback for each is identical and receives a single JavaScript Error object with basic information about what went wrong. As well as responding to HTTP errors and parsing problems, the error callback for pre-baked functions also fires for specific errors conditions that vary per function. For example, the error callback for the log in function will fire if the wrong user password is supplied.

The last argument in each method is an optional Boolean. As with the generic wrapper methods, if this argument is true then the method will be added to the top of the request queue. See the documentation for working with queued requests below for example usage of the `isPriority` argument.

The current list of pre-baked functions and the arugments they receive is as follows:

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
    bot.edit(String title, String text, String summary[, Boolean isPriority]).complete(function (String title, Number revision, Date date) {
        console.log(title);
        console.log(revision);
        console.log(date.toString());
    });
    
    // append a new section to a page
    bot.add(String title, String heading, String text[, Boolean isPriority]).complete(function (String title, Number revision, Date date) {
        console.log(title);
        console.log(revision);
        console.log(date.toString());
    });

    // list the members of a category
    bot.category(String category).complete(function (String category, Array<String> pages, Array<String> subcategories) {
        console.log(category);
        console.log(pages.length);
        console.log(subcategories.length);
    });
    
Queued requsts
--------------

All requests an queued and executed in order. By default, there is a 6-second pause between requests. However, note that some pre-baked functions are comprised of a number of seperate requests so may appear to take longer.

The following will execute in sequence:

    bot.login("example", "password");
    bot.edit("User:Example/sandbox", "Hello, World", "this is a test edit");
    bot.logout();
    
There are times, when you will want to make sure request inside a callback are priorities above request already on the queue. In that case, set the `isPriority` argument to `true` for the nested requests and they will be executed before other (already) queued requests.

The following will resore to the previous version of the page before logging out:

    bot.login("example", "password");

    bot.history("User:Example/sandbox", 2).complete(function (title, history) {
        var id = history[1].revid; // previous revision id
        bot.revision(id, true).complete(function (title, text, date) {
            bot.edit(title, text, "restore to previous revision", true);
        });
    });
    
    bot.logout();

Web-browser support
-------------------

The module is written so as to be also executable as a JavaScript library in a web browser. However, your are likely to encounter cross-domain security issues if the library is executed in a web browser from a different domain to the target MediaWiki installation.

See included example (`examples/browser.html`) for sample use in a web-browser.

License
-------

This module is licensed under the [General Public License](http://opensource.org/licenses/GPL-3.0).
