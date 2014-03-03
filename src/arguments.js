var defaults = {};
defaults['templates-dir'] = '.';
defaults['wysia-subdir'] = 'wysia';
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
	log("    -w, --wysia-subdir");
	log("        Default:", defaults['wysia-subdir'] + '/');
	log("    -p, --port: Listening port to serve from.");
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
		case 'port':
			ensure_not_boolean('-p / --port', value);
			args.port = value;
			break;
	}
}
module.exports = args;
