## Pluggy  [![Build Status](https://img.shields.io/github/issues/CikerDeveloper/Pluggy.svg)](https://travis-ci.org/CikerDeveloper/Pluggy.svg)

## About


A generic NodeJS API for creating plug.dj bots.

Originally by [Chris Vickery](https://github.com/chrisinajar), now maintained by [TAT](https://github.com/TATDK) and [The plug³ Team](https://github.com/plugCubed).

**NOTE:** Currently not supporting Facebook login.

## How to use
Run the following:

``` javascript
npm install pluggy
```

Example:

```javascript

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
```

Have a bot that uses the API? [**Let us know!**](https://github.com/CikerDeveloper/Pluggy/issues/new)

