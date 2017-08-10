const express = require("express");
const pug = require('pug');
const path = require('path');
const config = require('./config');
const Twit = require('twit');
const parser = require('body-parser');
const app = express();
const server = require('http').createServer(app);
const http = require("http");
const io = require('socket.io')(server);
const multer = require('multer');
const upload = multer();
const reload = require('reload');
var T = new Twit(config);
var followerOptions = { screen_name: 'crazyghostafro', count: 5 };
var infoOptions = { screen_name: 'crazyghostafro', skip_status: true };
var info = [];
var banner = [];
var timeline = [];
var following = [];
var dms = [];
var errorArray = [];
var port = 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.use(parser.urlencoded({ extended: true }));

app.use(parser.json());

app.get("/", (req, res) => {
    res.render("home.pug", { info, banner, timeline, following, dms });
});

app.get("/error", (req, res) => {
    res.render("error.pug", { errorArray });
});

app.post('/', (req, res) => {
    T.post('statuses/update', { status: req.body.userTweet }, function(err, data, response) {
        let avatar = data.user.profile_image_url;
        let name = data.user.name;
        let handle = data.user.screen_name;
        let tweet = data.text;
        let timestamp = data.created_at.slice(4, 10);
        let retweets = data.retweet_count;
        let likes = data.favorite_count;
        timeline.pop(timeline[0]);
        timeline.push(new myTimeline(avatar, name, handle, tweet, timestamp, retweets, likes));
        res.redirect(req.get('referer'));
    });
});

let stream = T.stream('user');
stream.on('tweet', function (tweet) {
    let avatar = tweet.user.profile_image_url;
    let name = tweet.user.name;
    let handle = tweet.user.screen_name;
    let usrTweet = tweet.text;
    let timestamp = tweet.created_at.slice(4, 10);
    let retweets = tweet.retweet_count;
    let likes = tweet.favorite_count;
    console.log('New tweet has been posted');
    timeline.pop(timeline[0]);
    timeline.push(new myTimeline(avatar, name, handle, usrTweet, timestamp, retweets, likes));
});

app.use(express.static('public'));

console.log("App started on port " + port);

function myInfo(name, handle, following, avatar) {
    this.name = name;
    this.handle = handle;
    this.following = following;
    this.avatar = avatar;
}

function myBanner(url) {
    this.url = url;
}

function myTimeline(avatar, name, handle, tweet, timestamp, retweets, likes) {
    this.avatar = avatar;
    this.name = name;
    this.handle = handle;
    this.tweet = tweet;
    this.timestamp = timestamp;
    this.retweets = retweets;
    this.likes = likes;
}

function myFollowing(name, handle, avatar) {
    this.name = name;
    this.handle = handle;
    this.avatar = avatar;
}

function myDms(name, avatar, timestamp, content) {
    this.name = name;
    this.avatar = avatar;
    this.timestamp = timestamp;
    this.content = content;
}

T.get('account/verify_credentials', infoOptions)
    .catch(function (err) {
        console.log('Error--', err.stack);
        errorArray.push('Error message-- ' + err.message);
        errorArray.push('Error stack-- ' + err.stack);
        return res.redirect('/error');
    })
    .then(function (result) {
        let name = result.data.name;
        let handle = `@${result.data.screen_name}`;
        let following = parseInt(result.data.friends_count);
        let avatar = result.data.profile_image_url;
        info = new myInfo(name, handle, following, avatar);
    });

T.get('users/profile_banner', { screen_name: 'crazyghostafro' })
    .catch(function (err) {
        console.log('Error--', err.stack);
        errorArray.push('Error message-- ' + err.message);
        errorArray.push('Error stack-- ' + err.stack);
        return res.redirect('/error');
    })
    .then(function (result) {
        let url = result.data.sizes['1500x500'].url;
        banner = new myBanner(url);
    });

T.get('statuses/home_timeline', { count: 5 })
    .catch(function (err) {
        console.log('Error--', err.stack);
        errorArray.push('Error message-- ' + err.message);
        errorArray.push('Error stack-- ' + err.stack);
        return res.redirect('/error');
    })
    .then(function(result) {
        for (let i = 0; i < 5; i++) {
            let avatar = result.data[i].user.profile_image_url;
            let name = result.data[i].user.name;
            let handle = result.data[i].user.screen_name;
            let tweet = result.data[i].text;
            let timestamp = result.data[i].created_at.slice(11, 19);
            let retweets = result.data[i].retweet_count;
            let likes = result.data[i].favorite_count;
            timeline.unshift(new myTimeline(avatar, name, handle, tweet, timestamp, retweets, likes));
        }
    });

T.get('friends/list', followerOptions)
    .catch(function (err) {
        console.log('Error--', err.stack);
        errorArray.push('Error message-- ' + err.message);
        errorArray.push('Error stack-- ' + err.stack);
        return res.redirect('/error');
    })
    .then(function(result) {
        for (let i = 0; i < 5; i++) {
            let name = result.data.users[i].name;
            let handle = result.data.users[i].screen_name;
            let avatar = result.data.users[i].profile_image_url;
            following.unshift(new myFollowing(name, handle, avatar));
        }
    });

T.get('direct_messages', { count: 5 })
    .catch(function (err) {
        console.log('Error--', err.stack);
        errorArray.push('Error message-- ' + err.message);
        errorArray.push('Error stack-- ' + err.stack);
        return res.redirect('/error');
    })
    .then(function (result) {
        for (let i = 0; i < 5; i++) {
            let name = result.data[i].sender_screen_name;
            let avatar = 'https://twitter.com/' + result.data[i].sender_screen_name + '/profile_image?size=original';
            let timestamp = result.data[i].created_at.slice(4, 10);
            let content = result.data[i].text;
            dms.unshift(new myDms(name, avatar, timestamp, content));
        }
    });

io.on('connection', function (socket) {
    console.log('Client Connected');
    var news = [
        { title: 'The cure of the Sadness is to play Videogames', date: '04.10.2016' },
        { title: 'Batman saves Racoon City, the Joker is infected once again', date: '05.10.2016' },
        { title: "Deadpool doesn't want to do a third part of the franchise", date: '05.10.2016' },
        { title: 'Quicksilver demand Warner Bros. due to plagiarism with Speedy Gonzales', date: '04.10.2016' }
    ];
    socket.emit('news', news);
    socket.on('my other event', function (data) {
        console.log(data);
    });
});
 
server.listen(port);

