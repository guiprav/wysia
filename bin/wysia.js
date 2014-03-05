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
var app = express();
if(app.get('env') === 'development') {
	app.use(express.logger());
}
app.use(express.static(__dirname + '/../public'));
app.use (
	express.static (
		path.resolve(process.cwd(), args['templates-dir'])
	)
);
app.use(express.cookieParser());
app.use(express.bodyParser());
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
			if(err.constructor === Object) {
				res.send(err);
			}
			else {
				res.send(err.toString());
			}
		};
		next();
	}
);
var shared_state = (function() {
	try {
		var path = args['templates-dir']
				+ '/' + args['wysia-subdir']
				+ '/initial-shared-state.json';
		return JSON.parse(fs.readFileSync(path, 'utf8'));
	}
	catch(err) {
		if(err.code !== 'ENOENT') {
			console.error("Error loading initial shared state:", err);
			console.log("Starting with empty shared_state.");
		}
	}
})();
function render(shell, page, models, cookies, cb) {
	var shell_template;
	var page_template;
	var model_data = {};
	var partials = {};
	(function load_shell() {
		if(!shell) {
			load_page();
		}
		else {
			var file_name = shell + '.hbs';
			var path = args['templates-dir'] + '/' + file_name;
			fs.readFile (
				path, 'utf8', function(err, template) {
					if(err) {
						cb(err);
						return;
					}
					shell_template = template;
					load_page();
				}
			);
		}
	})();
	function load_page() {
		var file_name = page + '.hbs';
		var path = args['templates-dir'] + '/' + file_name;
		fs.readFile (
			path, 'utf8', function(err, template) {
				if(err) {
					cb(err);
					return;
				}
				page_template = template;
				load_models();
			}
		);
	}
	function load_models() {
		var load_count = 0;
		(function load_model(err, model) {
			if(err) {
				cb(err);
				return;
			}
			if(model) {
				try {
					var loaded_model = JSON.parse(model);
					model_data = merge(model_data, loaded_model);
				}
				catch(err) {
					cb(err);
					return;
				}
			}
			if(load_count < models.length) {
				var file_name = models[load_count++] + '.json';
				var path = args['templates-dir']
						+ '/' + args['wysia-subdir']
						+ '/' + file_name;
				fs.readFile(path, 'utf8', load_model);
			}
			else {
				merge_shared_state();
			}
		})();
	}
	function merge_shared_state() {
		try {
			model_data = merge(model_data, shared_state);
		}
		catch(err) {
			cb(err);
			return;
		}
		merge_cookies();
	}
	function merge_cookies() {
		if(!cookies) {
			load_partials();
			return;
		}
		try {
			model_data = merge(model_data, cookies);
		}
		catch(err) {
			cb(err);
			return;
		}
		load_partials();
	}
	function load_partials() {
		var glob_ = args['templates-dir'] + '/*.partial.hbs';
		var partial_files;
		glob (
			glob_, function(err, files) {
				if(err) {
					cb(err);
					return;
				}
				partial_files = files;
				load_partial();
			}
		);
		var load_count = 0;
		function load_partial(err, name, partial) {
			if(err) {
				cb(err);
				return;
			}
			if(partial) {
				partials[name] = partial;
			}
			if(load_count < partial_files.length) {
				var path_ = partial_files[load_count++];
				var name = path.basename(path_, '.partial.hbs');
				fs.readFile (
					path_, 'utf8', function(err, partial) {
						load_partial(err, name, partial);
					}
				);
			}
			else {
				render_();
			}
		}
	}
	function render_() {
		try {
			model_data.is_wysia = true;
			hbs.partials = {};
			for(var name in partials) {
				var partial = partials[name];
				hbs.registerPartial(name, partial);
			}
			var html = hbs.compile(page_template)(model_data);
			if(shell_template) {
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
		shell, page, models, cookies, function(err, html) {
			if(err) {
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
