#!/usr/bin/env node
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
var vm = require('vm');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var http = require('http');
var express = require('express');
var hbs = require('handlebars');
var marked = require('marked');
var args = require('../src/arguments');
var merge = require('../src/merge');
var templates_dir = path.resolve(args['templates-dir']);
var wysia_subdir = path.resolve(templates_dir, args['wysia-subdir']);
var public_subdir = path.resolve(templates_dir, args['public-subdir']);
hbs.registerHelper (
	'markdown', function(text) {
		if(!text) {
			return '';
		}
		return new hbs.SafeString (
			marked (
				text
				, {
					gfm: true
					, sanitize: true
					, breaks: true
					, tables: true
				}
			)
		);
	}
);
var user_helpers = {};
(function load_user_helpers() {
	var files = glob.sync(templates_dir + '/*.helper.js');
	files.forEach (
		function(file) {
			var name = path.basename(file, '.helper.js');
			var helper = require(path.resolve(file)).bind(null, hbs);
			hbs.registerHelper(name, helper);
			user_helpers[name] = fs.readFileSync(file, 'utf8');
		}
	);
})();
var user_partials = {};
var user_templates = {};
(function load_user_templates_and_partials() {
	var files = glob.sync(templates_dir + '/*.hbs');
	files.forEach (
		function(file) {
			var template_name = path.basename(file, '.hbs');
			var template = fs.readFileSync(file, 'utf8');
			if(path.extname(template_name) === '.partial') {
				var partial_name = path.basename(template_name, '.partial');
				hbs.registerPartial(partial_name, template);
				user_partials[partial_name] = template;
			}
			else {
				user_templates[template_name] = template;
			}
		}
	);
})();
var templates_js = (function() {
	var js = fs.readFileSync (
		__dirname + '/../node_modules/handlebars/dist/handlebars.runtime.js', 'utf8'
	);
	js += '\n// END OF HANDLEBARS SOURCE CODE, START OF USER CODE:'
			+ '\n(function() {'
			+ '\nvar helpers = {};';
	for(var name in user_helpers) {
		js += 'helpers[' + JSON.stringify(name) + '] = function() {'
				+ '\nvar exports = (function() {'
				+ '\nvar module = {};'
				+ '\nvar exports = module.exports = {};'
				+ '\n' + user_helpers[name]
				+ '\nreturn module.exports;'
				+ '\n})();'
				+ '\nhelpers[' + JSON.stringify(name) + '] = exports;'
				+ '\nreturn exports.apply(null, arguments);'
				+ '\n};'
				+ '\nHandlebars.registerHelper ('
				+ '\n' + JSON.stringify(name) + ', function() {'
				+ '\nreturn helpers[' + JSON.stringify(name) + '].apply(null, arguments);'
				+ '\n}'
				+ '\n);';
	}
	js += '\n}'
			+ '\n)();';
	js += '\nHandlebars.templates = {};'
	for(var name in user_partials) {
		var precompiled = hbs.precompile(user_partials[name]);
		js += '\nHandlebars.registerPartial ('
				+ '\n' + JSON.stringify(name)
				+ '\n, Handlebars.template ('
				+ '\n' + precompiled
				+ '\n)'
				+ '\n);'
				+ '\nHandlebars.templates[' + JSON.stringify(name + '.partial') + '] ='
				+ '\nHandlebars.template ('
				+ '\n' + precompiled
				+ '\n);';
	}
	for(var name in user_templates) {
		// TODO: Use JSON.stringify(name) here!
		js += '\nHandlebars.templates["' + name + '"] = Handlebars.template ('
				+ '\n' + hbs.precompile(user_templates[name])
				+ '\n);';
	}
	return js;
})();
var user_models = {};
(function load_user_models() {
	var files = glob.sync(wysia_subdir + '/*.json');
	files.forEach (
		function(file) {
			var name = path.basename(file, '.json');
			var model = JSON.parse(fs.readFileSync(file, 'utf8'));
			user_models[name] = model;
		}
	);
})();
var app = express();
if(app.get('env') === 'development') {
	app.use(express.logger());
}
app.use(express.static(__dirname + '/../public'));
app.use(express.static(public_subdir));
app.use(express.cookieParser());
app.use(express.bodyParser());
app.get (
	'/templates.js', function(req, res) {
		// TODO: Stream this data if it's too long?
		res.set('Content-Type', 'application/javascript');
		res.send(templates_js);
	}
);
app.use (
	function(req, res, next) {
		res.send_error = function(err) {
			if(err.bad_request) {
				res.status(400);
			}
			else
			if(err.not_found) {
				res.status(404);
			}
			else {
				res.status(500);
			}
			if(!err.stack) {
				res.send(err);
				console.error("Non-standard error thrown:", err);
			}
			else {
				res.set('Content-Type', 'text/plain');
				res.send(err.stack);
				console.error(err.stack);
			}
		};
		console.log('res.send_error set:', res.send_error);
		next();
	}
);
var shared_state = user_models['initial-shared-state'] || {};
function traverse_object(object, path, create) {
	return path.split('.').reduce (
		function(current_node, next_property) {
			var next_value = current_node[next_property];
			if(create && next_value === undefined) {
				next_value = current_node[next_property] = {};
			}
			return next_value;
		}
		, object
	);
}
function traverse_object_to_parent(object, path, create) {
	var last_dot_index = path.lastIndexOf('.');
	if(last_dot_index === -1) {
		return object;
	}
	else {
		return traverse_object(object, path.slice(0, last_dot_index), create);
	}
}
function get_path_tip(path_) {
	var tip = path.extname(path_).slice(1);
	if(tip !== '') {
		return tip;
	}
	else {
		return path_;
	}
}
function execute_copies(node, source) {
	if(typeof(node) !== 'object') {
		return node;
	}
	var keys = Object.keys(node);
	if(keys[0] === '$copy') {
		return traverse_object(source, node[keys[0]]);
	}
	else {
		for(var key in node) {
			node[key] = execute_copies(node[key], source);
		}
		return node;
	}
}
function render(shell, page, models, cookies, query, cb) {
	var model_data = {};
	(function merge_models() {
		var next = merge_shared_state;
		try {
			models.forEach (
				function(name) {
					var model = user_models[name];
					if(!model) {
						var err = new Error("Model '" + name + "' does not exist.");
						err.not_found = true;
						throw err;
					}
					model_data = merge(model_data, user_models[name]);
				}
			);
			next();
		}
		catch(err) {
			cb(err);
		}
	})();
	function merge_shared_state() {
		var next_step = merge_cookies;
		try {
			model_data = merge(model_data, shared_state);
			next_step();
		}
		catch(err) {
			cb(err);
		}
	}
	function merge_cookies() {
		var next_step = merge_query;
		if(!cookies) {
			next_step();
			return;
		}
		try {
			for(var key in cookies) {
				cookies[key] = execute_copies(cookies[key], model_data);
			}
			model_data = merge(model_data, cookies);
			next_step();
		}
		catch(err) {
			cb(err);
		}
	}
	function merge_query() {
		var next_step = render_;
		try {
			var query_ = {};
			for(var key in query) {
				var key_path_parent = traverse_object_to_parent(query_, key, true);
				var key_path_tip = get_path_tip(key);
				var value_path_value = (function() {
					try {
						return traverse_object(model_data, query[key]);
					}
					catch(err) {
						err.not_found = true;
						throw err;
					}
				})();
				key_path_parent[key_path_tip] = merge(key_path_parent[key_path_tip], value_path_value);
			}
			model_data = merge(model_data, query_);
			next_step();
		}
		catch(err) {
			cb(err);
		}
	}
	function render_() {
		try {
			model_data.is_wysia = true;
			var page_template = user_templates[page];
			if(!page_template) {
				var err = new Error("Template '" + page + "' does not exist.");
				err.not_found = true;
				throw err;
			}
			var html = hbs.compile(page_template)(model_data);
			if(shell) {
				var shell_template = user_templates[shell];
				if(!shell_template) {
					var err = new Error("Template '" + shell + "' does not exist.");
					err.not_found = true;
					throw err;
				}
				model_data.page_html = html;
				html = hbs.compile(shell_template)(model_data);
			}
			cb(null, html);
		}
		catch(err) {
			cb(err);
		}
	}
}
function get_handler(req, res) {
	var shell = req.params.shell || null;
	var page = req.params.page;
	var models = [];
	if(req.params.models) {
		models = req.params.models.split(',');
	}
	var cookies = {};
	if(req.headers.cookie) {
		try {
			cookies = JSON.parse(unescape(req.headers.cookie));
		}
		catch(err) {
			console.error("Failed to parse cookies:", req.headers.cookie + ".");
		}
	}
	render (
		shell, page, models, cookies, req.query, function(err, html) {
			if(err) {
				console.log(res.send_error);
				res.send_error(err);
				return;
			}
			res.send(html);
		}
	);
}
function post_handler(req, res) {
	if(req.body['$state-update-logic']) {
		var cookies = (function() {
			if(req.headers.cookie) {
				try {
					return JSON.parse(unescape(req.headers.cookie));
				}
				catch(err) {
					console.error("Failed to parse cookies:", req.headers.cookie + ".");
					return undefined;
				}
			}
			return {};
		})();
		var set_cookies_if_any = function() {
			if(cookies !== undefined) {
				res.set('Set-Cookie', escape(JSON.stringify(cookies)));
			}
		};
		try {
			vm.runInNewContext (
				req.body['$state-update-logic']
				, {
					state: shared_state
					, cookies: cookies
					, form_data: req.body
				}
			);
		}
		catch(err) {
			set_cookies_if_any();
			res.send_error(err);
			return;
		}
		set_cookies_if_any();
	}
	res.redirect(req.url);
}
app.get('/:shell,:page', get_handler);
app.post('/:shell,:page', post_handler);
app.get('/:shell,:page/:models', get_handler);
app.post('/:shell,:page/:models', post_handler);
app.get('/:page', get_handler);
app.post('/:page', post_handler);
app.get('/:page/:models', get_handler);
app.post('/:page/:models', post_handler);
app.listen(args.port);
console.log("Wysia started on port", args.port + ".");
