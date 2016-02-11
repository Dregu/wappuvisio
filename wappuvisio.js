var blessed = require('blessed');
var Irc = require('irc');
var moment = require('moment');
var request = require('request');

var config = require('./config');

var irc = new Irc.Client(config.irc_host, config.irc_nick, {
	channels: config.irc_channels
});

var irc2 = new Irc.Client(config.shoutbox_host, config.shoutbox_nick, {
	channels: config.shoutbox_channels
});

var screen = blessed.screen({
	smartCSR: true,
	dockBorders: true
});

var shoutbox = blessed.log({
	top: '0%',
	left: '0%',
	width: '60%',
	height: '50%+1',
	tags: true,
	border: {
		type: 'line'
	},
	style: {
		fg: 'white',
		bg: 'transparent',
		border: {
			fg: '#0000ff'
		}
	}
});

var toimitus = blessed.log({
	top: '50%',
	left: '0%',
	width: '60%',
	height: '50%+1',
	tags: true,
	border: {
		type: 'line'
	},
	style: {
		fg: 'white',
		bg: 'transparent',
		border: {
			fg: '#0000ff'
		}
	}
});

var ohjelmat = blessed.log({
	top: '0%',
	left: '60%-1',
	width: '40%+1',
	height: '50%+1',
	tags: true,
	border: {
		type: 'line'
	},
	style: {
		fg: 'white',
		bg: 'transparent',
		border: {
			fg: '#0000ff'
		}
	}
});

var color = function (str) {
	for (var i = 0, hash = 0; i < str.length; hash = str.charCodeAt(i++) + ((hash << 5) - hash));
	for (var i = 0, color = "#"; i < 3; color += ("00" + ((hash >> i++ * 8) & 0xFF).toString(16)).slice(-2));
	return color;
};

var ircMsg = function (from, to, msg) {
	var time = moment().format('HH:MM');
	var line;
	var nickColor = color(from) + '-fg';
	var chanColor = color(to) + '-fg';
	if (to === config.irc_channels[1] || to === config.irc_nick) {
		line = time + ' {' + nickColor + '}' + from + '{/' + nickColor + '}: ' + msg;
		toimitus.insertBottom(line);
	} else {
		line = time + ' {' + nickColor + '}' + from + '{/' + nickColor + '} @ {' + chanColor + '}' + to + '{/' + chanColor + '}: ' + msg;
		shoutbox.insertBottom(line);
	}
	screen.render();
};

screen.append(shoutbox);
screen.append(toimitus);
screen.append(ohjelmat);
screen.render();

irc.addListener('message', ircMsg);
irc2.addListener('message', ircMsg);

var ok = [];

var updatedb = function () {
	request({
		url: config.ok,
		json: true
	}, function (error, response, body) {
		if (!error && response.statusCode === 200) {
			body.sort(function (a, b) {
				if (moment(a.start) < moment(b.start)) return -1;
				if (moment(a.start) > moment(b.start)) return 1;
				return 0;
			});
			ok = body;
			updatelist();
		} else {
			ohjelmat.insertBottom(error);
		}
	});
};

var updatelist = function () {
	var now = +new Date();
	var n = 1;
	for (var i in ok) {
		if (n <= ohjelmat.height - 2 && moment(ok[i].end) > now) {
			ohjelmat.setLine(n, moment(ok[i].start).format('HH:mm') + ' - ' + moment(ok[i].end).format('HH:mm') + ': ' + ok[i].title);
			n++;
		}
	}
	ohjelmat.scrollTo(0);
};

setInterval(updatedb, 1000 * 60 * 15);
setInterval(updatelist, 1000 * 60);
updatedb();

/*setInterval(function () {
	toimitus.style.bg = color('' + Math.random());
	screen.render();
}, 100);*/

screen.key(['escape', 'q', 'C-c'], function (ch, key) {
	return process.exit(0);
});
