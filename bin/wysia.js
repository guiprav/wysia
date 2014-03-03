#!/usr/bin/env node
var fs = require('fs');
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
function render(shell, page, models, cookies, cb) {
	var shell_template;
	var page_template;
	var model_data = {};
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
				merge_cookies();
			}
		})();
	}
	function merge_cookies() {
		if(!cookies) {
			render_();
			return;
		}
		try {
			model_data = merge(model_data, cookies);
		}
		catch(err) {
			cb(err);
			return;
		}
		render_();
	}
	function render_() {
		var html = hbs.compile(page_template)(model_data);
		if(shell_template) {
			model_data.page_html = html;
			html = hbs.compile(shell_template)(model_data);
		}
		cb(null, html);
	}
}
function handler(req, res) {
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
				if(err.not_found) {
					res.status(404);
				}
				else {
					res.status(500);
				}
				res.send(err);
				return;
			}
			res.send(html);
		}
	);
}
function post_redirect(req, res) {
	res.redirect(req.url);
}
app.get('/:shell,:page', handler);
app.post('/:shell,:page', post_redirect);
app.get('/:shell,:page/:models', handler);
app.post('/:shell,:page/:models', post_redirect);
app.get('/:page', handler);
app.post('/:page', post_redirect);
app.get('/:page/:models', handler);
app.post('/:page/:models', post_redirect);
app.listen(args.port);
console.log("Wysia started on port", args.port + ".");
