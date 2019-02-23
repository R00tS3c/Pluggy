## Pluggy  [![Issues](https://img.shields.io/github/issues/R00tS3c/Pluggy.svg)](https://img.shields.io/github/issues/R00tS3c/Pluggy.svg) [![Build Status](https://travis-ci.org/CikerDeveloper/Pluggy.svg)](https://travis-ci.org/R00tS3c/Pluggy.svg) [![License](https://img.shields.io/badge/license-AGPL-blue.svg)](https://img.shields.io/badge/license-AGPL-blue.svg) [![Stars](https://img.shields.io/github/stars/CikerDeveloper/Pluggy.svg)](https://img.shields.io/github/stars/R00tS3c/Pluggy.svg) [![Forks](https://img.shields.io/github/forks/CikerDeveloper/Pluggy.svg)](https://img.shields.io/github/forks/R00tS3c/Pluggy.svg) [![Coverage Status](https://coveralls.io/repos/github/R00tS3c/Pluggy/badge.svg?branch=master)](https://coveralls.io/github/R00tS3c/Pluggy?branch=master)

## About


A generic NodeJS API for creating plug.dj bots.

Originally created by [Ciker](https://github.com/R00tS3c)

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
	pluggy.connect("R00tS3c").then(
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

Have a bot that uses the API? [**Let us know!**](https://github.com/R00tS3c/Pluggy/issues/new)

