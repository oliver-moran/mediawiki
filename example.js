// uncomment in Node
var MediaWiki = require("./mediawiki");

var user = "example";
var password = "password";

// instantiate a bot
var bot = new MediaWiki.Bot();

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
    
    bot.revision(history[1].revid).complete(function (title, text, date) {
        console.log(title);
        console.log(text.length);
        console.log(date);
    });
});
