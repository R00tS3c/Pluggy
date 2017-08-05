module.exports = function (pluggy) {
	var that = this;
	this.map = (data) => {
		var obj, user, moderator, _obj;
		switch (data.a) {
			case "advance":
				obj = {
					djID: data.p.c,
					historyID: data.p.h,
					media: data.p.m,
					startTime: data.p.t
				};

				user = pluggy.getUserByID(data.p.c, true);

				if (typeof user != "undefined")
					obj.dj = user;

				return obj;
			case "ban":
				return {
					duration: data.p.d,
					reason: data.p.r
				};
			case "chat":
				obj = {
					cid: data.p.cid,
					message: data.p.message,
					sub: data.p.sub,
					id: data.p.uid,
					username: data.p.un
				};

				user = pluggy.getUserByID(data.p.uid, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "chatDelete":
				obj = {
					cid: data.p.c,
					moderatorID: data.p.mi
				};

				user = pluggy.getUserByID(data.p.mi, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "djListCycle":
				obj = {
					shouldCycle: data.p.f,
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi
				};

				user = pluggy.getUserByID(data.p.uid, true);

				if (typeof user != "undefined")
					obj.moderator = user;

				return obj;
			case "djListLocked":
				obj = {
					clear: data.p.c,
					isLocked: data.p.f,
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi
				};

				user = pluggy.getUserByID(data.p.uid, true);

				if (typeof user != "undefined")
					obj.moderator = user;

				return obj;
			case "earn":
				obj = {
					level: data.p.level,
					pp: pluggy.self.pp - data.p.pp
				};

				if ((pluggy.self.xp - data.p.xp) > 0)
					obj.xp = pluggy.self.xp - data.p.xp;

				return obj;
			case "gift":
				return data.p - pluggy.self.pp;
			case "gifted":
				return {
					sender: data.p.s,
					recipient: data.p.r
				};
			case "modAddDJ":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi,
					username: data.p.t
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
				user = pluggy.getUserByName(data.p.t, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;
				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "modBan":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi,
					username: data.p.t,
					duration: data.p.d
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
				user = pluggy.getUserByName(data.p.t, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;
				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "modMoveDJ":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi,
					username: data.p.u,
					oldPosition: data.p.o,
					newPosition: data.p.n
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
				user = pluggy.getUserByName(data.p.u, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;
				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "modMute":
				obj = {
					moderatorUsername: data.p.m,
					username: data.p.u,
					userID: data.p.i,
					reason: data.p.r,
					duration: data.p.d
				};

				moderator = pluggy.getUserByName(data.p.m, true);
				user = pluggy.getUserByID(data.p.i, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;
				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "modMoveDJ":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi,
					username: data.p.t
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
				user = pluggy.getUserByName(data.p.u, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;
				if (typeof user != "undefined")
					obj.user = user;
				if (data.p.d)
					obj.fromBooth = data.p.d;

				return obj;
			case "modSkip":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;

				return obj;
			case "modStaff":
				obj = {
					moderatorUsername: data.p.m,
					moderatorID: data.p.mi,
					users: []
				};

				moderator = pluggy.getUserByID(data.p.mi, true);
	
				if (typeof moderator != "undefined")
					obj.moderator = moderator;

				for (var i = 0; i < data.p.u.length; i++) {
					_obj = {
						username: data.p.u[i].n,
						userID: data.p.u[i].i,
						role: data.p.u[i].p
					};

					user = pluggy.getUserByID(data.p.u[i].i, true);

					if (typeof user != "undefined")
						_obj.user = user;
	
					obj.users.push(_obj);
				}

				return obj;
			case "roomDescriptionUpdate":
				obj = {
					description: data.p.d,
					userID: data.p.u
				};

				user = pluggy.getUserByID(data.p.u, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "roomMinChatLevel":
				obj = {
					level: data.p.m,
					userID: data.p.u
				};

				user = pluggy.getUserByID(data.p.u, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "roomNameUpdate":
				obj = {
					name: data.p.n,
					userID: data.p.u
				};

				user = pluggy.getUserByID(data.p.u, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "roomWelcomeUpdate":
				obj = {
					welcome: data.p.w,
					userID: data.p.u
				};

				user = pluggy.getUserByID(data.p.u, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
			case "userJoin":
				return this.mapUser(data.p);
			case "userLeave":
				return pluggy.getUserByID(data.p, true) || data.p;
			case "userUpdate":
				obj = {
					userID: data.p.i
				};

				user = pluggy.getUserByID(data.p.u, true);

				if (typeof user != "undefined")
					obj.user = user;

				if (data.p.hasOwnProperty("level") && typeof data.p.level == "number")
					obj.level = data.p.level;
				if (data.p.hasOwnProperty("avatarID") && typeof data.p.avatarID == "string")
					obj.avatarID = data.p.avatarID;
				if (data.p.hasOwnProperty("username") && typeof data.p.username == "string")
					obj.username = data.p.username;
				if (data.p.hasOwnProperty("badge") && typeof data.p.badge == "string")
					obj.badge = data.p.badge;
				if (data.p.hasOwnProperty("guest"))
					obj.guest = data.p.guest;

				return obj;
			case "vote":
				obj = {
					userID: data.p.i,
					vote: data.p.v
				};

				user = pluggy.getUserByID(data.p.i, true);

				if (typeof user != "undefined")
					obj.user = user;

				return obj;
		}
	};
	
	this.mapUser = (user) => {
		if (typeof user != "object" || !user.hasOwnProperty("id")) return undefined;
		var _user = {
			id: user.id,
			avatarID: user.avatarID,
			role: 0
		};

		if (user.hasOwnProperty("guest") && user.guest === true) {
			_user.guest = true;
		} else {
			_user.badge = user.badge;
			_user.gRole = user.gRole || 0;
			_user.role = user.role || 0;
			_user.joined = user.joined;
			_user.level = user.level;
			_user.sub = user.sub;
			_user.silver = user.silver;
			_user.username = user.username || "";

			if (user.hasOwnProperty("slug") && typeof user.slug == "string")
				_user.slug = user.slug;

			if (user.hasOwnProperty("language") && typeof user.language == "string")
				_user.language = user.language;

			if (user.hasOwnProperty("status") && typeof user.status == "number")
				_user.status = user.status;

			if (user.hasOwnProperty("room") && typeof user.room == "object")
				_user.room = user.room;
		}

		return _user;
	};
	
	this.mapHistory = (entry) => {
		return {
			id: entry.id,
			media: entry.media,
			timestamp: entry.timestamp,
			user: entry.user,
			score: {
				woots: entry.score.positive,
				mehs: entry.score.negative,
				grabs: entry.score.grabs,
				listeners: entry.score.listeners
			}
		};
	};
};