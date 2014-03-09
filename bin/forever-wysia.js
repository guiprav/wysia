#!/usr/bin/env node
var spawn = require('child_process').spawn;
var args = require('../src/arguments');
var server = spawn (
	__dirname + '/../node_modules/forever/bin/forever'
	, [
		'-w',
		'--watchDirectory', args['templates-dir']
		, __dirname + '/wysia.js'
	]
	.concat(process.argv.slice(2))
);
server.stderr.pipe(process.stderr);
server.stdout.pipe(process.stdout);
server.on('close', process.exit);
