MediaWiki
=========

This [Node.js](http://nodejs.org/) module is a JavaScript framework for the [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page). It can be used to create a bot to edit Wikipedia, for example.

The module is written so as to be also executable as a JavaScript library in a web browser. However, your are likely to encounter cross-domain security issues if the library is executed in a web browser on the different domain to the MediaWiki installation.

The framework provides wrapper frunctions for generic calls to the MediaWiki API. These wrappers can be used to write other functions that perform specific tasks (such as logging in, editing a page, getting back links, etc.). The framework already includes some of these.

Please feel free to fork this repository and add your own. Then, if you make a pull request, your new functions can be added in to the main branch.

Installation
------------

Install on Node using:

    npm install

Usage
-----

    var bot = new WikiMedia.Bot();
    
    // using the generic wrapper to get the current userinfo
    bot.get({ action: "query", meta: "userinfo" }).complete(function (response) {
        console.log(response.query.userinfo);
    });
    
    // using an in-built function to get the current userinfo
    bot.userinfo().complete(function (userinfo) {
        console.log(userinfo);
    });
    
    // use bot.post(...) for HTTP POST operations

To run a bot process in the cloud, you could consider using a service like [Cloud9](https://c9.io).

See included example (`browser.html`) for use in a web-browser.

Have fun!
