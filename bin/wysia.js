#!/usr/bin/env node
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
				text,
				{
					gfm: true,
					sanitize: true,
					breaks: true,
					tables: true
				}
			)
		);
	}
);
var app = express();
if(app.get('env') === 'development') {
	app.use(express.logger());
}
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
			if(err instanceof Error) {
				res.send(err.toString());
			}
			else {
				res.send(err);
			}
		};
		next();
	}
);
var shared_state = {};
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
function parse_meta(value, valid_metas) {
	switch(typeof(value)) {
		case 'object':
			var keys = Object.keys(value);
			if(valid_metas.indexOf(keys[0]) !== -1) {
				return {
					meta: keys[0],
					value: value[keys[0]]
				};
			}
			break;
		case 'string':
			if(valid_metas.indexOf(value) !== -1) {
				return {
					meta: value
				};
			}
			break;
	}
	return {
		value: value
	};
}
function post_handler(req, res) {
	try {
		if(typeof(req.body) === 'object' && req.body['$shared-state-updates']) {
			var updates = JSON.parse(req.body['$shared-state-updates']);
			for(var i = 0; i < updates.length; i += 2) {
				var path = updates[i];
				var value = updates[i + 1];
				if(value === undefined) {
					var err = new Error("Missing last update element.");
					err.bad_request = true;
					throw err;
				}
				var target_parent = (function() {
					var current_node = shared_state;
					var path_nodes = path.split('.');
					path_nodes.forEach (
						function(next_node_name, i) {
							var next_node = current_node[next_node_name];
							var is_last = (i === path_nodes.length - 1);
							if(next_node === undefined && !is_last) {
								next_node = current_node[next_node_name] = {};
							}
							if(!is_last) {
								current_node = next_node;
							}
						}
					);
					return current_node;
				})();
				var target_name = (function() {
					var last_dot_index = path.lastIndexOf('.');
					if(last_dot_index === -1) {
						return path;
					}
					return path.slice(last_dot_index + 1);
				})();
				var parsed = parse_meta (
					value,
					[
						'$set'
						, '$destroy'
						, '$add'
						, '$push'
						, '$unshift'
						, '$pop'
						, '$shift'
					]
				);
				parsed.meta = parsed.meta || '$set';
				switch(parsed.meta) {
					case '$set':
						target_parent[target_name] = parsed.value;
						break;
					case '$destroy':
						delete target_parent[target_name];
						break;
					case '$add':
						if(target_parent[target_name] === undefined) {
							target_parent[target_name] = 0;
						}
						if(typeof(target_parent[target_name]) !== 'number') {
							var err = new Error("'" + path + "' is not a number.");
							err.bad_request = true;
							throw err;
						}
						target_parent[target_name] += parsed.value;
						break;
					case '$push':
					case '$unshift':
						var fn = parsed.meta.slice(1);
						if(target_parent[target_name] === undefined) {
							target_parent[target_name] = [];
						}
						if(!Array.isArray(target_parent[target_name])) {
							var err = new Error("'" + path + "' is not an array.");
							err.bad_request = true;
							throw err;
						}
						target_parent[target_name][fn](parsed.value);
						break;
					case '$pop':
					case '$shift':
						if(!Array.isArray(target_parent[target_name])) {
							var err = new Error("'" + path + "' is not an array.");
							err.bad_request = true;
							throw err;
						}
						var fn = parsed.meta.slice(1);
						target_parent[target_name][fn]();
						break;
				}
			}
		}
	}
	catch(err) {
		res.send_error(err);
		return;
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
