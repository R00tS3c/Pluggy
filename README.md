## Pluggy  [![Issues](https://img.shields.io/github/issues/CikerDeveloper/Pluggy.svg)](https://img.shields.io/github/issues/CikerDeveloper/Pluggy.svg) [![Build Status](https://travis-ci.org/CikerDeveloper/Pluggy.svg)](https://travis-ci.org/CikerDeveloper/Pluggy.svg) [![License](https://img.shields.io/badge/license-AGPL-blue.svg)](https://img.shields.io/badge/license-AGPL-blue.svg) [![Stars](https://img.shields.io/github/stars/CikerDeveloper/Pluggy.svg)](https://img.shields.io/github/stars/CikerDeveloper/Pluggy.svg) [![Forks](https://img.shields.io/github/forks/CikerDeveloper/Pluggy.svg)](https://img.shields.io/github/forks/CikerDeveloper/Pluggy.svg) [![Coverage Status](https://coveralls.io/repos/github/CikerDeveloper/Pluggy/badge.svg?branch=master)](https://coveralls.io/github/CikerDeveloper/Pluggy?branch=master)

## About


A generic NodeJS API for creating plug.dj bots.

Originally created by [Ciker](https://github.com/CikerDeveloper)

**NOTE:** Currently not supporting Facebook login.

## How to use
Run the following:

``` javascript
npm install pluggy
```

Example:

```javascript

var Pluggy = require('pluggy');
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

