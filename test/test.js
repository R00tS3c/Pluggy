var Pluggy = require("../src/main");
var pluggy = new Pluggy({
	credentials: {
		email: "email",
		password: "pass"
	},
	resumeConnection: true,
	splitMessages: true,
	multilineMessages: true
});

pluggy.on("pluggy:events:connected", (err, self) => {
	console.log("SOCKET OPENED!", err);
	pluggy.connect("ciker").then(
		state => {
			pluggy.sendChat("Pluggy works!");
			setTimeout(() => {
				pluggy.sendChat("Pluggy works!");
			}, 5e3);
		},
		err => console.log(err)
	);
});