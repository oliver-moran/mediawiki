// uncomment in Node
// var MediaWiki = require("./mediawiki");

var user = "example";
var password = "password";

// instantiate a bot
var bot = new MediaWiki.Bot();

// log in
bot.login(user, password, function (result, user) {
    switch (result) {
        case "Success":
            console.log("Login Successful: " + user);
            break;
        case "WrongPass":
        case "NotExists":
        default:
            console.log("Login Failed: " + result);
            break;
    }
});

// get the name (or IP) of the current in user
bot.whoami(function (name) {
    console.log("User: " + name);
});

// log out
bot.logout(function (name) {
    console.log("Logged out");
});

// get the info of the current user
bot.userinfo(function (userinfo) {
    console.log(userinfo);
});
