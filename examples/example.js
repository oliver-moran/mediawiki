// Run using: node example.js

var MediaWiki = require("../mediawiki");

var user = "example";
var password = "password";

// instantiate a bot
var bot = new MediaWiki.Bot();

// requests are queued and executed in order, throttled to 10 per minute by default

bot.login(user, password).complete(function (user) {
    console.log("Logged in as '" + user + "'");
});

bot.userinfo().complete(function (userinfo) {
    console.log(userinfo);
});

bot.page("Wikipedia").complete(function (title, text, date) {
    console.log("The current revision of '" + title + "' has " + text.length + " characters");
});

bot.history("Wikipedia", 1250).complete(function (title, history) {
    console.log("Received the history of last " + history.length + " revisions of '" + title + "'");
    
    // 'true' at the end of any request means that the requst will be prioritised
    // i.e. it will be put to the top of the request queue
    bot.revision(history[1].revid, true).complete(function (title, text, date) {
        console.log("The previous revision of '" + title + "' had " + text.length + " characters");
    });
});

bot.edit("Wikipedia:Sandbox", (new Date()).toString(), "replaced the page contents with the current time").complete(function (title, revision, date) {
    console.log("Replaced the content of '" + title + "' with the current date");
});

bot.add("Wikipedia_talk:Sandbox", "Current Date", (new Date()).toString() + " --~~~~").complete(function (title, revision, date) {
    console.log("Added the the current date to '" + title + "'");
});

bot.category("Category:20th-century American novels").complete(function (category, pages, subcategories) {
    console.log("'" + category + "' has " + pages.length + " members and " + subcategories.length + " subcategories.");
});

bot.logout().complete(function () {
    console.log("Logged out");
});

bot.whoami().complete(function (name) {
    console.log("Editing as '" + name + "'");
});
