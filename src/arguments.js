/*
	Copyright (c) 2014 Guilherme Prá Vieira

	This file is part of Wysia.

	Wysia is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as
	published by the Free Software Foundation, either version 3 of
	the License, or (at your option) any later version.

	Wysia is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public
	License along with Wysia. If not, see <http://www.gnu.org/licenses/>.
*/
var defaults = {};
defaults['templates-dir'] = '.';
defaults['wysia-subdir'] = '.';
defaults['public-subdir'] = '.';
defaults.port = 3000;
var parsed = require('minimist')(process.argv.slice(2));
var log = console.log;
function print_usage() {
	log("Usage: wysia [templates-dir] [options]");
	log();
	log("templates-dir: Serve templates from this directory.");
	log("    Default:", defaults['templates-dir'] + '/');
	log();
	log("Options:");
	log("    -w, --wysia-subdir: Subdirectory where JSON models are stored.");
	log("        Default: none (models loaded from templates-dir)");
	log("    -p, --public-subdir: Subdirectory where static assets (images, scripts, stylesheets, etc.) are stored.");
	log("        Default: none (assets served from templates-dir)");
	log("    --port: Listening port to serve from.");
	log("        Default:", defaults.port);
	log();
	process.exit(0);
}
if(parsed.h !== undefined || parsed.help !== undefined) {
	print_usage();
}
var args = {};
for(var name in defaults) {
	args[name] = defaults[name];
}
function bad_args() {
	log("Type wysia -h or --help for usage.");
	log();
	process.exit(-1);
}
function ensure_not_boolean(name, value) {
	if(typeof(value) === 'boolean') {
		console.error("Error:", name, "is not a flag.");
		bad_args();
	}
}
for(var name in parsed) {
	var value = parsed[name];
	switch(name) {
		case '_':
			if(value.length > 1) {
				console.error("More than one path supplied for templates-dir.");
				bad_args();
				break;
			}
			if(value.length === 1) {
				args['templates-dir'] = value[0];
			}
			break;
		case 'w':
		case 'wysia-subdir':
			ensure_not_boolean('-w / --wysia-subdir', value);
			args['wysia-subdir'] = value;
			break;
		case 'p':
		case 'public-subdir':
			ensure_not_boolean('-p / --public-subdir', value);
			args['public-subdir'] = value;
			break;
		case 'port':
			ensure_not_boolean('--port', value);
			args.port = value;
			break;
	}
}
module.exports = args;
