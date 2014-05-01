// uncomment in Node
var MediaWiki = require("./mediawiki");

var user = "example";
var password = "password";

// instantiate a bot
var bot = new MediaWiki.Bot();

// requests are queued and executed in order, throttled to 10/minute by default

bot.login(user, password).complete(function (user) {
    console.log("Logged in!");
});

bot.userinfo().complete(function (userinfo) {
    console.log(userinfo);
});

bot.logout().complete(function () {
    console.log("Logged out");
});

bot.whoami().complete(function (name) {
    console.log("User: " + name);
});

bot.page("Wikipedia").complete(function (title, text, date) {
    console.log(title);
    console.log(text.length);
    console.log(date);
});

bot.history("Wikipedia", 10).complete(function (title, history) {
    console.log(title);
    console.log(history.length);
    
    // 'true' at the end of any request means that the requst will be prioritised
    // i.e. it will be put to the top of the request queue
    bot.revision(history[1].revid).complete(function (title, text, date, true) {
        console.log(title);
        console.log(text.length);
        console.log(date);
    });
});

bot.edit("Wikipedia:Sandbox", (new Date()).toString(), "replaced the page contents with the current time").complete(function (title, revision, date) {
    console.log(title);
    console.log(revision);
    console.log(date.toString());
});
