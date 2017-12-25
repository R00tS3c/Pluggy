var WebSocket = require("ws");
var request = require("request");
var EventEmitter = require("events").EventEmitter;
var Waterfall = require("promise-waterfall");
//var Promise = require("promise");
var util = require("util");

var that, credentials, csrf, cookies, socketURL, authToken, resumeConnectionData = {};

/**
 * @private
 */
var packageInfo = require("../package");

/**
 * @private
 */
var Endpoints = require("./endpoints");

/**
 * @private
 */
var Mapper = require("./mapper");

var saveData = () => {
	if (!resumeConnectionData.hasOwnProperty("cookies"))
		return;

	var fs = require("fs");

	fs.writeFile(__dirname + "/.rcD.json", JSON.stringify(resumeConnectionData), "utf8", (err) => {
		if (err)
			throw new Error(err);
	});
};

var getCookies = (headers) => {
	if (!headers || !headers.hasOwnProperty("set-cookie")) return null;

	var cookies = [];

	var _cookies = headers["set-cookie"];

	if (Array.isArray(_cookies))
		_cookies = _cookies.join(";");

	_cookies.split(";").forEach(function(c) {
		if (c.toLowerCase().match(/^(awselb=|session=)/))
			cookies.push(c);
	});

	return cookies.join(";") || null;
};

var EventHandler = (data) => {
	console.log(data);
	switch (data.a) {
		case "ack":
			if (data.p == 1) {
				that.getSelf(true).then(
					self => that.emit("pluggy:events:connected", null, self),
					err => that.emit("pluggy:events:connected", err, null)
				);

				that.getFriends();
			}
			break;
		case "advance":
			that.room.state.booth.waitlist = data.p.d;

			data = Mapper.map(data);

			var obj = {
				previous: {
					historyID: that.room.state.playback.historyID,
					media: that.room.state.playback.media,
					dj: that.room.state.booth.currentDJ,
					score: {
						woots: 0,
						mehs: 0,
						grabs: Object.keys(that.room.state.grabs).length
					}
				},
				current: data
			};

			for (var i in that.room.state.votes) {
				if (that.room.state.votes[i] > 0)
					obj.previous.score.woots++;
				else
					obj.previous.score.mehs++;
			}

			that.room.state.booth.currentDJ = data.djID;
			that.room.state.grabs = {};
			that.room.state.playback.media = data.media;
			that.room.state.playback.historyID = data.historyID;
			that.room.state.playback.startTime = data.startTime;

			that.emit("pluggy:events:advance", obj);
			break;
		case "ban":
			that.emit("pluggy:events:banned", Mapper.map(data));
			break;
		case "chat":
			data = Mapper.map(data);

			that.emit("pluggy:events:chat", data);

			that._chatMessages.push(data);
			
			if (that._chatMessages.length > 512)
				that._chatMessages.shift();
			break;
		case "chatDelete":
			data = Mapper.map(data);

			that.emit("pluggy:events:chatDelete", data);

			for (var i = 0; i < that._chatMessages.length; i++)
				if (that._chatMessages[i].cid == data.cid)
					that._chatMessages.splice(0, i);
			break;
		case "djListCycle":
			data = Mapper.map(data);

			that.room.state.booth.shouldCycle = data.shouldCycle;

			that.emit("pluggy:events:djCycleChange", data);
		case "djListLocked":
			data = Mapper.map(data);

			that.room.state.booth.isLocked = data.isLocked;

			that.emit("pluggy:events:djListLockChange", data);
			break;
		case "djListUpdate":
			that.emit("pluggy:events:waitlistUpdate", that.room.state.booth.waitingDJs, data.p);

			that.room.state.booth.waitingDJs = data.p;
			break;
		case "earn":
			data = Mapper.map(data);

			if (data.hasOwnProperty("xp"))
				that.self.xp += data.xp;

			that.self.pp += data.pp;

			that.emit("pluggy:events:earn", data);
			break;
		case "friendAccept":
			that.emit("pluggy:events:friendAccept", data.p);
			break;
		case "friendRequest":
			that.emit("pluggy:events:friendRequest", data.p);
			break;
		case "gift":
			data = Mapper.map(data);

			that.self.pp += data;

			that.emit("pluggy:events:giftReceived", data);
		case "gifted":
			data = Mapper.map(data);

			that.emit("pluggy:events:gift", data);
			break;
		case "grab":
			data = Mapper.map(data);

			that.emit("pluggy:events:grab", data);
			break;
		case "killSession":
			that.emit("pluggy:events:killSession");
			break;
		case "levelUp":
			that.emit("pluggy:events:levelUp", data.p);
			break;
		case "modAddDJ":
			data = Mapper.map(data);

			that.emit("pluggy:events:modAddDJ", data);
			break;
		case "modBan":
			data = Mapper.map(data);

			that.emit("pluggy:events:modBan", data);
			break;
		case "modMute":
			data = Mapper.map(data);

			if (data.duration == "o")
				for (var i = 0; i < that.room.mutes.length; i++)
					if (that.room.mutes[i].id == data.userID)
						that.room.mutes.splice(i, 1);
			else {
				that.room.mutes.push({
					id: data.userID,
					moderator: data.moderatorUsername,
					username: data.username
				});
			}

			that.emit("pluggy:events:modMute", data);
			break;
		case "modMoveDJ":
			data = Mapper.map(data);

			that.emit("pluggy:events:modMoveDJ", data);
			break;
		case "modRemoveDJ":
			data = Mapper.map(data);

			that.emit("pluggy:events:modRemoveDJ", data);
			break;
		case "modSkip":
			data = Mapper.map(data);

			that.emit("pluggy:events:modSkip", data);
			break;
		case "modStaff":
			data = Mapper.map(data);

			for (var i = 0; i < data.users.length; i++) {
				if (data.users[i].role == 5000) {
					that.room.state.meta.hostID = data.users[i].userID;
					that.room.state.meta.hostName = data.users[i].username;
				}

				if (that.room.users.online[data.users[i].userID])
					that.room.users.online[data.users[i].userID].role = data.users[i].role;
				else if (that.room.users.cached[data.users[i].userID])
					that.room.users.cached[data.user[i].userID].role = data.users[i].role;
			}

			that.emit("pluggy:events:modStaff", data);
			break;
		case "nameChanged":
			that.emit("pluggy:events:nameChanged");
			break;
		case "notify":
			that.emit("pluggy:events:plugNotification", data.p);
			break;
		case "playlistCycle":
			that.emit("pluggy:events:playlistCycle", data.p);
			break;
		case "plugMaintenance":
			that.emit("pluggy:events:plugMaintenance");
			break;
		case "plugMaintenanceAlert":
			that.emit("pluggy:events:plugMaintenanceAlert", data.p);
			break;
		case "plugMessage":
			that.emit("pluggy:events:plugMessage", data.p);
			break;
		case "rateLimit":
			that.emit("pluggy:events:rateLimit");
			break;
		case "roomDescriptionUpdate":
			data = Mapper.map(data);

			that.room.state.meta.description = data.description;

			that.emit("pluggy:events:roomDescriptionUpdate", data);
			break;
		case "roomMinChatLevel":
			data = Mapper.map(data);

			that.room.state.meta.minChatLevel = data.level;

			that.emit("pluggy:events:roomMinChatLevelUpdate", data);
			break;
		case "roomNameUpdate":
			data = Mapper.map(data);

			that.room.state.meta.name = data.name;

			that.emit("pluggy:events:roomNameUpdate", data);
			break;
		case "roomWelcomeUpdate":
			data = Mapper.map(data);

			that.room.state.meta.welcome = data.welcome;

			that.emit("pluggy:events:roomWelcomeUpdate", data);
			break;
		case "skip":
			that.emit("pluggy:events:userSkip", data.p);
		case "userJoin":
			data = Mapper.map(data);

			if (data.hasOwnProperty("guest")) {
				that.room.users.cached.guests.push(data);
				that.room.state.meta.guests++;

				if (that.options.separateEvents)
					return that.emit("pluggy:events:guestJoin", data);
			} else {
				that.room.users.online[data.id] = data;

				var guestIDs = that.room.users.cached.guests.map((g) => {
					return g.id;
				});

				if (guestIDs.indexOf(data.id) != -1)
					that.room.users.cached.guests.splice(guestIDs.indexOf(data.id), 1);
				if (that.room.users.cached.users[data.id])
					delete that.room.users.cached.users[data.id];

				that.room.state.meta.population++;
			}

			that.emit("pluggy:events:userJoin", data);
			break;
		case "userLeave":
			data = Mapper.map(data);

			if (data.p === 0) {
				if (that.options.separateEvents)
					return that.emit("pluggy:events.guestLeave");

				that.room.state.meta.guests--;

				return;
			} else if (typeof data == "number") return;
			else {
				if (that.room.users.online[data.id]) {
					that.room.users.cached.users[data.id] = data;
					delete that.room.users.online[data.id];
				}

				that.room.state.meta.population--;

				that.emit("pluggy:events:userLeave", data);
			}
			break;
		case "userUpdate":
			data = Mapper.map(data);

			if (data.hasOwnProperty("level"))
				that.room.users.online[data.userID].level = data.level;
			if (data.hasOwnProperty("avatarID"))
				that.room.users.online[data.userID].avatarID = data.avatarID;
			if (data.hasOwnProperty("username"))
				that.room.users.online[data.userID].username = data.username;
			if (data.hasOwnProperty("badge"))
				that.room.users.online[data.userID].badge = data.badge;
			if (data.hasOwnProperty("guest"))
				that.room.users.online[data.userID].guest = data.guest;

			that.emit("pluggy:events:userUpdate", data);
			break;
		case "vote":
			data = Mapper.map(data);

			if (that.room.state.votes[data.userID] != data.vote)
				that.emit("pluggy:events:vote", data);

			that.room.state.votes[data.userID] = data.vote;
			break;
	}
};

function pluggy (options) {
	options = options || {};

	this.options = {
		keepAliveTimer: (options.keepAliveTimer > 15 ? options.keepAliveTimer : 15) || 15,
		separateEvents: options.separateEvents || false,
		splitMessages: options.splitMessages || false,
		multilineMessages: options.multilineMessages || false,
		returnUserObjects: options.returnUserObjects || false,
		resumeConnection: options.resumeConnection || false
	};

	this.session = {};

	this.room = {
		users: {
			online: {},
			friends: {},
			cached: {
				users: {},
				guests: []
			}
		},
		bans: [],
		mutes: []
	};

	credentials = options.credentials || undefined;
	authToken = options.authToken || undefined;

	this._socketQueue = [];
	this._requestQueue = [];
	this._chatMessages = [];

	that = this;
	if (options.resumeConnection) {
		try {
			resumeConnectionData = require(__dirname + "/.rcD.json");

			if (typeof resumeConnectionData == "object" && !Array.isArray(resumeConnectionData)) {
				if (!resumeConnectionData.hasOwnProperty("cookies")) {
					options.resumeConnection = false;
					return;
				} else {
					cookies = resumeConnectionData.cookies;
					that._getAuthToken().then(
						res => {
							this._initSocket();
						}
					);
				}
			}
		} catch (e) {
			options.resumeConnection = false;
		}
	}

	if (!options.resumeConnection) {
		if (typeof credentials == "object" && !Array.isArray(credentials)) {
			if (!credentials.hasOwnProperty("email")) {
				credentials = undefined;
				throw new Error("Malformed Credentials Object! Missing Email");
			} else if (!credentials.hasOwnProperty("password")) {
				credentials = undefined;
				throw new Error("Malformed Credentials Object! Missing Password");
			}
		}
	
		if (typeof authToken == "string")
			if (authToken.length != 152) {
				authToken = undefined;
				throw new Error("Invalid Auth Token provided.");
			}
	
		if (authToken)
			this._initSocket();
		else if (credentials)
			Waterfall([this.getCRSF, this.sendCredentials, this._getAuthToken]).then(
				res => {
					this._initSocket();
				}
			).catch(
				err => {
					throw new Error(err);
				}
			);
	}
		
	Mapper = new Mapper(that);
}

util.inherits(pluggy, EventEmitter);

pluggy.prototype._getPluggyData = () => {
	return that;
};

pluggy.prototype._initSocket = () => {
	if (this.socket && this.socket.readyState == 1)
		return new Error("Socket already initialized!");
	this.socket	= new WebSocket(socketURL || "wss://godj.plug.dj:443/socket", {
		origin: Endpoints.plug
	});
	
	this.socket.on("open", () => {
		that._send({
			type: "auth",
			message: authToken,
			timestamp: Date.now()
		});
		that.emit("pluggy:socket:opened");
	});
	
	this.socket.on("message", (data) => {
		clearTimeout(that.session.keepAliveTimeout);
		if (data == "h") {
			that.emit("pluggy:socket:keepalive:packet", data);
			that.session.keepAliveTimeout = setTimeout(() => {
				that.emit("pluggy:socket:keepalive:warning");
			}, that.options.keepAliveTimer);
		}

		try {
			EventHandler(JSON.parse(data)[0]);
		} catch (e) {
			that.emit("pluggy:socket:invalidData", data);
		}
	});
	
	this.socket.on("close", () => {
		that.emit("pluggy:socket:closed");
	});
	
	this.socket.on("error", (err) => {
		that.emit("pluggy:socket:error", err);
	});
};

/**
 * @param {Object} data - Data you're sending to the socket
 */
pluggy.prototype._send = (data) => {
	if (!this.socket || this.socket.readyState != 1) return !1;

	if (!data.type || typeof data.type != "string") return !1;
	if (!data.message || (typeof data.message != "string" && typeof data.message != "number")) return !1;
	if (!data.timestamp || typeof data.timestamp != "number") return !1;

	this.socket.send(JSON.stringify({
		a: data.type,
		p: data.message,
		t: data.timestamp
	}));

	return !0;
};

pluggy.prototype._triggerSocketQueue = (multiline) => {
	if (!that._socketQueue.length) return;

	var data = that._socketQueue.shift();

	that._send(data);

	if (typeof data.timeout == "number") {
		that._selfDeleteQueue.push(data);
		setTimeout(that._selfDelete, data.timeout, data.message);
	}

	setTimeout(that._triggerSocketQueue, multiline ? 0 : 200);
};

pluggy.prototype._selfDelete = (message) => {
	for (var i = 0; i < that._chatMessages.length; i++)
		if (that._chatMessages[i].username.toLowerCase().trim() == that.self.username.toLowerCase().trim())
			if (that._chatMessages[i].message.toLowerCase().trim() == message.toLowerCase().trim()) {
				that.emit("pluggy:events:selfDelete", message);
				return that.delChat(that._chatMessages[i].cid);
			}
};

pluggy.prototype.sendChat = (message, timeout) => {
	var split, _message = [], words = [];

	if (that.options.splitMessages && that.session.alternateSplit && (message.substr(0, 4) != "/em " || message.substr(0, 4) != "/me "))
		message = "/em " + message;

	split = message.trim().split(" ");

	if (that.options.multilineMessages)
		while (split.length) {
			if (Buffer.byteLength(split[1], "utf8") + Buffer.byteLength(words.join(" ") + " ", "utf8") > 250)
				_message.push(words.splice(0, words.length).join(" "));
				
			words.push(split.splice(0, 1)[0]);
			
			if (!split.length) _message.push(words.splice(0, words.length).join(" "));
		}

	if (!_message.length) _message.push(message);

	for (var i = 0; i < _message.length; i++)
		that._socketQueue.push({
			type: "chat",
			message: ((message.substr(0, 4) == "/em " || message.substr(0, 4) == "/me ") && (_message[i].substr(0, 4) != "/me " && _message[i].substr(0, 4) != "/em ")  ? "/em " + _message[i] : _message[i]),
			timestamp: Date.now(),
			timeout: (i == _message[i].length - 1 ? timeout : undefined)
		});

	if (that.options.splitMessages)
		that.session.alternateSplit = !that.session.alternateSplit;

	return that._triggerSocketQueue(_message.length > 1 ? true : false);
};

pluggy.prototype.request = (data) => {
	var options = {
		gzip: true,
		method: data.method || "GET",
		url: Endpoints.plug + (data.endpoint || ""),
		headers: {
			"User-Agent": "pluggy v" + packageInfo.version
		}
	};
	
	if (data.content_type)
		options.headers["Content-Type"] = data.content_type;
		
	if (cookies)
		options.headers.Cookie = cookies;
		
	var body = typeof data.body == "object" ? JSON.stringify(data.body) : undefined;
	
	if (body) {
		options.headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
		options.body = body;
	}

	return new Promise ((resolve, reject) => {
		request(options, (err, res, body) => {
			if (err) return reject(err);
			var data;
			try {
				data = {
					err: err, 
					parsedBody: options.rawResponse === true ? body : JSON.parse(body),
					response: res, 
					rawBody: body
				};

				if (res.statusCode != 200) reject(data);
				else resolve(data);
			} catch (e) {
				data = {
					err: e || err, 
					response: res, 
					rawBody: body
				};

				reject(data);
			}
		});
	});
};

pluggy.prototype.getCRSF = () => {
	return new Promise((resolve, reject) => {
		that.request({
			endpoint: Endpoints.csrf
		}).then(
			data => {
				socketURL = data.parsedBody.data[0].s;
				csrf = data.parsedBody.data[0].c;

				that.emit("pluggy:auth:csrfRetrieved");

				cookies = getCookies(data.response.headers);
				resumeConnectionData.cookies = cookies;
				saveData();

				resolve(csrf);
			},
			err => {
				reject({
					err: err.err,
					response: err.response,
					rawBody: err.rawBody
				});
			}
		);
	});
};

pluggy.prototype.sendCredentials = () => {
	return new Promise((resolve, reject) => {
		if (typeof credentials != "object" || typeof credentials.email != "string" || typeof credentials.password != "string")
			return reject("Invalid Credentials Object.");
		that.request({
			method: "POST",
			endpoint: Endpoints.auth.login,
			content_type: "application/json",
			body: {
				csrf: csrf,
				email: credentials.email,
				password: credentials.password
			}
		}).then(
			res => {
				that.loggedIn = true;
				that.emit("pluggy:auth:success");
				return resolve(res);
			},
			err => {
				that.loggedIn = false;
				that.emit("pluggy:auth:failed");
				return reject(err);
			}
		);
	});
};

pluggy.prototype._getAuthToken = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.auth.token
		}).then(
			res => {
				authToken = res.parsedBody.data[0];

				that.emit("pluggy:auth:tokenRetrieved");

				return resolve(res.parsedBody.data[0]);
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.login = (_credentials, _authToken) => {
	if (typeof _credentials == "object" && !Array.isArray(_credentials)) {
		if (!_credentials.hasOwnProperty("email")) {
			_credentials = undefined;
			throw new Error("Malformed Credentials Object! Missing Email");
		} else if (!_credentials.hasOwnProperty("password")) {
			_credentials = undefined;
			throw new Error("Malformed Credentials Object! Missing Password");
		}
	}

	if (typeof _authToken == "string")
		if (_authToken.length != 152) {
			_authToken = undefined;
			throw new Error("Invalid Auth Token provided.");
		}

	authToken = _authToken;

	credentials = _credentials;

	if (authToken)
		that._initSocket();
	else if (credentials)
		Waterfall([that.getCRSF, that.sendCredentials, that._getAuthToken]).then(
			res => {
				that._initSocket();
			}
		).catch(
			err => {
				throw new Error(err);
			}
		);
};

pluggy.prototype.getSelf = (boolean) => {
	if (!boolean)
		return this.self;
	else return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.users.default.replace(":id", "me")
		}).then(
			res => {
				that.self = res.parsedBody.data[0];
				return resolve(that.self);
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.getFriends = (boolean) => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.friends.default
		}).then(
			res => resolve(res.parsedBody.data.map((friend) => {
					that.room.users.friends[friend.id] = Mapper.mapUser(friend);
					return that.room.users.friends[friend.id];
				})),
			err => reject(err)
		);
	});
};

pluggy.prototype._joinRoom = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.join,
			content_type: "application/json",
			body: {
				slug: that.connectingTo
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.connect = (slug) => {
	return new Promise ((resolve, reject) => {
		if (typeof slug != "string")
			return reject("Room Slug MUST be a string!");
		else that.connectingTo = slug;
		Waterfall([that._joinRoom, that.getRoomState]).then(
			res => {
				that.emit("pluggy:events:roomJoined");
				return resolve(res);
			}
		).catch(
			err => {
				throw new Error(err);
			}
		);
	});
};

pluggy.prototype.getRoomState = () => {
	return new Promise((resolve, reject) => {
		that.request({
			endpoint: Endpoints.rooms.state
		}).then(
			res => {
				if (that.slug) {
					for (var i in that.room.users.online)
						that.room.users.cached[that.room.users.online[i].id] = that.room.users.online;
					that.room.users.online = {};
				}
				that.room.state = res.parsedBody.data[0];
				that.slug = that.room.state.meta.slug;
				that.room.mutes = [];
				that.room.bans = [];
				that.room.state.users.forEach((user, index) => {
					var _user = Mapper.mapUser(user);

					if (!_user) return;

					that.room.users.online[_user.id] = _user;

					if (that.room.users.cached[_user.id])
						delete that.room.users.cached[_user.id];

					if (index == that.room.state.users.length -1) {
						delete that.room.state.users;
						return resolve(that.room.state);
					}
				});
			},
			err => reject(err)
		);
	});
};


pluggy.prototype.getAuthToken = () => {
	return authToken;
};

pluggy.prototype.getCookies = () => {
	return cookies;
};

pluggy.prototype.setCookies = (_cookies) => {
	cookies = _cookies;
};

pluggy.prototype.getUsers = () => {
	var users = [];

	for (var i in that.room.users.online)
		users.push(that.room.users.online[i]);

	return users;
};

pluggy.prototype.getCachedUsers = () => {
	var users = [];

	for (var i in that.room.users.cached.users)
		users.push(that.room.users.cached.users[i]);

	return users;
};

pluggy.prototype.getRoomMeta = () => {
	return that.room.state.meta;
};

pluggy.prototype.getRoomSlug = () => {
	return that.room.state.meta.slug;
};

pluggy.prototype.getRoomDescription = () => {
	return that.room.state.meta.description;
};

pluggy.prototype.getWelcomeMessage = () => {
	return that.room.state.meta.welcome;
};

pluggy.prototype.getRoomName = () => {
	return that.room.state.meta.names;
};

pluggy.prototype.getRoomPopulation = () => {
	return that.room.state.meta.population;
};

pluggy.prototype.getMinChatLevel = () => {
	return that.room.state.meta.minChatLevel;
};

pluggy.prototype.getHostID = () => {
	return that.room.state.meta.hostID;
};

pluggy.prototype.getHostUsername = () => {
	return that.room.state.meta.hostName;
};

pluggy.prototype.getGrabIDs = () => {
	return Object.keys(that.room.state.grabs);
};

pluggy.prototype.getGrabs = () => {
	return that.getGrabIDs().map((id) => {
		return that.getUserByID(id, true);
	});
};

pluggy.prototype.getCurrentMedia = () => {
	return that.room.state.playback.media;
};

pluggy.prototype.getCurrentDJID = () => {
	return that.room.state.booth.currentDJ;
};

pluggy.prototype.getCurrentDJ = () => {
	return that.getUserByID(that.room.state.booth.currentDJ, true);
};

pluggy.prototype.isWaitlistLocked = () => {
	return that.room.state.booth.isLocked;
};

pluggy.prototype.shouldWaitListCycle = () => {
	return that.room.state.booth.shouldCycle;
};

pluggy.prototype.getWaitlistIDs = () => {
	return that.room.state.booth.waitingDJs;
};

pluggy.prototype.getWaitlist = () => {
	return that.room.state.booth.waitingDJs((id) => {
		return that.getUserByID(id, true);
	});
};

pluggy.prototype.getMediaStartTime = () => {
	return that.room.state.playback.startTime;
};

pluggy.prototype.getElapsedTime = () => {
	return Math.ceil((Date.now() - Date.parse(that.room.state.playback.startTime)) / 1e3);
};

pluggy.prototype.getRemainingTime = () => {
	return that.room.state.playback.media.duration - that.getElapsedTime();
};

pluggy.prototype.getChat = () => {
	return that._chatMessages;
};

pluggy.prototype.getChatByID = (id) => {
	return that._chatMessages.filter((data) => {
		if (data.id != id) return false;
		return true;
	});
};

pluggy.prototype.getChatByName = (username) => {
	return that._chatMessages.filter((data) => {
		if (data.username == username) return true;
		if (data.username == username.trim()) return true;
		if (data.username == username.toLowerCase()) return true;
		if (data.username == username.toLowerCase().trim()) return true;
		return false;
	});
};

pluggy.prototype.getStaffOnline = () => {
	return that.getUsers().filter(user => {
		return user.role;
	});
};

pluggy.prototype.getGlobalStaffOnline = () => {
	return that.getUsers().filter(user => {
		return user.gRole;
	});
};

pluggy.prototype.getStaffOnlineByRole = (role) => {
	return that.getUsers().filter(user => {
		return user.role == role;
	});
};

pluggy.prototype.getGlobalStaffOnlineByRole = (gRole) => {
	return that.getUsers().filter(user => {
		return user.gRole == gRole;
	});
};

pluggy.prototype.getUserByName = (username, cache) => {
	var users = that.getUsers(),
		cached = that.getCachedUsers(),
		filter = function (user) {
			if (typeof user.username != "string" || typeof username != "string") return false;
			else if (user.username == username) return true;
			else if (user.username.toLowerCase() == username.toLowerCase()) return true;
			else if (user.username.trim() == username.trim()) return true;
			else if (user.username.trim().toLowerCase() == username.trim().toLowerCase()) return true;
			else return false;
		};
	
	return users.filter(filter)[0] || (cache ? cached.filter(filter)[0] : undefined) || undefined;
};

pluggy.prototype.getUserByID = (id, cache) => {
	var users = that.getUsers(),
		cached = that.getCachedUsers(),
		_id = parseInt(id),
		filter = function (user) {
			if (typeof user.id != "number" || (typeof id != "number" && typeof id != "string")) return false;
			else if (user.id == id) return true;
			else if (user.id == _id) return true;
			else return false;
		};
	
	return users.filter(filter)[0] || (cache ? cached.filter(filter)[0] : undefined) || undefined;
};

pluggy.prototype.getUser = (id) => {
	if (typeof id != "number") return;
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.users.default.replace(":id", id)
		}).then(
			res => {
				if (!that.room.users.cached.users[res.parsedBody.data[0].id])
					that.room.users.cached.users[res.parsedBody.data[0].id] = res.parsedBody.data[0];
				
				resolve(Mapper.mapUser(res.parsedBody.data[0]));
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.getStaff = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.staff.default
		}).then(
			res => {
				var staff = res.parsedBody.data.map(user => {
					user = Mapper.mapUser(user);

					if (!that.room.users.online[user.id])
						that.room.users.cached[user.id] = user;

					return user;
				});

				resolve(staff);
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.setRole = (userID, role) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: role ? "POST" : "DELETE",
			endpoint: role ? Endpoints.staff.update : Endpoints.staff.default + "/" + userID,
			content_type: role ? "application/json" : undefined,
			body: role ? {
				userID: userID,
				role: role
			} : undefined
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.getHistory = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.rooms.history
		}).then(
			res => resolve(res.parsedBody.data.map(entry => {
				return Mapper.mapHistory(entry);
			})),
			err => reject(err)
		);
	});
};

pluggy.prototype.getMutes = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.mutes
		}).then(
			res => {
				that.room.mutes = res.parsedBody.data;

				resolve(res.parsedBody.data);
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.getBans = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.ban.default
		}).then(
			res => {
				that.room.bans = res.parsedBody.data;

				resolve(res.parsedBody.data);
			},
			err => reject(err)
		);
	});
};

pluggy.prototype.lockWaitlist = (lock, clear) => {
	return new Promise ((resolve, reject) => {
		if (that.isWaitListLocked() == lock) return reject("Booth is already in that state!");
		that.request({
			method: "PUT",
			endpoint: Endpoints.booth.lock,
			content_type: "application/json",
			body: {
				isLocked: lock,
				removeAllDJs: clear
			}
		}).then (
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.updateDJCycle = (cycle) => {
	return new Promise ((resolve, reject) => {
		if (that.shouldWaitListCycle() == cycle) return reject("DJ Cycle is already in that state!");
		that.request({
			method: "PUT",
			endpoint: Endpoints.booth.cycle,
			content_type: "application/json",
			body: {
				shouldCycle: cycle
			}
		}).then (
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.getUsersInBulk = (ids) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.users.bulk,
			content_type: "application/json",
			body: {
				ids: ids
			}
		}).then(
			res => 	resolve(res.parsedBody.data.map((user) => {
				var _user = Mapper.mapUser(user);

				if (!that.room.users.online[_user.id])
					that.room.users.cached[_user.id] = _user;

				return _user;
			})),
			err => reject(err)
		);	
	});
};

pluggy.prototype.joinWaitlist = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.booth.default
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.leaveWaitlist = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "DELETE",
			endpoint: Endpoints.booth.default
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.addDJ = (id) => {
	return new Promise ((resolve, reject) => {
		if (id == that.room.state.booth.currentDJ || that.room.state.booth.waitingDJs.indexOf(id) != -1)
			return reject("User already in booth or waitlist.");
		that.request({
			method: "POST",
			endpoint: Endpoints.booth.add,
			content_type: "application/json",
			body: {
				id: id
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.removeDJ = (id) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "DELETE",
			endpoint: Endpoints.booth.remove.replace(":id", id)
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.moveDJ = (id, position) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.booth.move,
			content_type: "application/json",
			body: {
				userID: id,
				position: position
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.forceSkip = (id) => {
	return new Promise ((resolve, reject ) => {
		that.request({
			method: "POST",
			endpoint: that.self.id == id ? Endpoints.booth.skip : Endpoints.booth.skipSelf,
			content_type: "application/json",
			body: that.self.id == id ? {
				userID: id,
				historyID: that.room.state.playlistID.historyID
			} : undefined
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.woot = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.votes,
			content_type: "application/json",
			body: {
				direction: 1,
				historyID: that.room.state.playlistID.historyID
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.meh = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.votes,
			content_type: "application/json",
			body: {
				direction: -1,
				historyID: that.room.state.playlistID.historyID
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.grab = (playlistID) => {
	return new Promise ((resolve, reject) => {
		if (that.getGrabIDs().indexOf(that.self.id) != -1) return reject("You've already grabbed!");
		that.request({
			method: "POST",
			endpoint: Endpoints.grabs,
			content_type: "application/json",
			body: {
				playlistID: playlistID,
				historyID: that.room.state.playlistID.historyID
			}
		});
	});
};

pluggy.prototype.editRoomInfo = (options) => {
	return new Promise ((resolve, reject) => {
		if (typeof options != "object" || Array.isArray(options)) return reject("Options must be an Object!");
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.update,
			content_type: "application/json",
			body: {
				name: options.name,
				description: options.description,
				welcome: options.welcome,
				minChatLevel: options.level
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.editRoomName = (name) => {
	return new Promise ((resolve, reject) => {
		if (typeof name != "string") return reject("Name must be a String!");
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.update,
			content_type: "application/json",
			body: {
				name: name,
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.editRoomDescription = (description) => {
	return new Promise ((resolve, reject) => {
		if (typeof description != "string") return reject("Description must be a String!");
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.update,
			content_type: "application/json",
			body: {
				description: description,
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.editRoomWelcomeMessage = (welcome) => {
	return new Promise ((resolve, reject) => {
		if (typeof welcome != "string") return reject("Welcome must be a String!");
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.update,
			content_type: "application/json",
			body: {
				welcome: welcome,
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.setChatLevel = (level) => {
	return new Promise ((resolve, reject) => {
		if (typeof level != "number") return reject("Welcome must be a Number!");
		that.request({
			method: "POST",
			endpoint: Endpoints.rooms.update,
			content_type: "application/json",
			body: {
				minChatLevel: level,
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.createPlaylist = (name, media) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.playlists.default,
			content_type: "application/json",
			body: {
				name: name,
				media: media
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.shufflePlaylist = (playlistID) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "PUT",
			endpoint: Endpoints.playlists.shuffle.replace(":id", playlistID)
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.activatePlaylist = (playlistID) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "PUT",
			endpoint: Endpoints.playlists.activate.replace(":id", playlistID)
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.renamePlaylist = (playlistID, name) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "PUT",
			endpoint: Endpoints.playlists.rename.replace(":id", playlistID),
			content_type: "application/json",
			body: {
				name: name
			}
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.deletePlaylist = (playlistID) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "DELETE",
			endpoint: Endpoints.playlists.default + "/" + playlistID
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.getPlaylists = () => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.playlists.default
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};


pluggy.prototype.getPlaylist = (playlistID) => {
	return new Promise ((resolve, reject) => {
		that.request({
			endpoint: Endpoints.playlists.media.replace(":id", playlistID)
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};

pluggy.prototype.addMedia = (playlistID, media, append) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.playlists.media.insert.replace(":id", playlistID),
			content_type: "application/json",
			body: {
				media: media,
				append: append
			}
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};

pluggy.prototype.deleteMedia  = (playlistID, ids) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "POST",
			endpoint: Endpoints.playlists.media.delete.replace(":id", playlistID),
			content_type: "application/json",
			body: {
				ids: ids
			}
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};

pluggy.prototype.updateMedia  = (playlistID, id, author, title) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "PUT",
			endpoint: Endpoints.playlists.media.update.replace(":id", playlistID),
			content_type: "application/json",
			body: {
				id: id,
				author: author,
				title: title
			}
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};

pluggy.prototype.moveMedia  = (playlistID, ids, before) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "PUT",
			endpoint: Endpoints.playlists.media.update.replace(":id", playlistID),
			content_type: "application/json",
			body: {
				ids: ids,
				beforeID: before
			}
		}).then(
			res => resolve(res.parsedBody.data),
			err => reject(err)
		);
	});
};

pluggy.prototype.deleteMessage = (cid) => {
	return new Promise ((resolve, reject) => {
		that.request({
			method: "DELETE",
			endpoint: Endpoints.chatDelete.replace(":cid", cid)
		}).then(
			res => resolve(),
			err => reject(err)
		);
	});
};

pluggy.prototype.delChat = pluggy.deleteMessage;
pluggy.prototype.lockWaitList = pluggy.lockWaitlist;
pluggy.prototype.joinWaitList = pluggy.joinWaitlist;
pluggy.prototype.leaveWaitList = pluggy.leaveWaitlist;
pluggy.prototype.getWaitListIDs = pluggy.getWaitListIDs;
pluggy.prototype.getWaitList = pluggy.getWaitList;
pluggy.prototype.isWaitListLocked = pluggy.isWaitlistLocked;

module.exports = pluggy;
