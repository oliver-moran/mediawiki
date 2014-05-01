MediaWiki
=========

This package is a [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) JavaScript framework. It can be used to create a bot to edit Wikipedia, for example.

The package is compatible with [Node.js](http://nodejs.org/) and web browsers. Although, on a web broswer, if the JavaScript is not executed on the same domain as the MediaWiki installation, your may encounter cross-domain security issues.

This is a re-working of the very first JavaScript framework for MediaWiki. Although, a number of others have sprung up since.

The framework provides wrapper frunctions for generic calls to the MediaWiki API. These wrappers can be used to write other functions that perform specific tasks (such as logging in, editing a page, getting back links, etc.). The framework already includes some of these.

Please feel free to fork this repository and add your own. The, if you make a pull request, your new functions can be added in to the main branch.

Installation
------------

Install on Node using:

    npm install
    node example.js

To run a bot process in the could, you could consider using a service like [Cloud9](https://c9.io).

See included example for use in a web-browser.

Have fun!
