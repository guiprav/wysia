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
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var http = require('http');
var express = require('express');
var app = express();
var hbs = require('handlebars');
var args = require('../src/arguments');
var merge = require('../src/merge');
var state_machine = require('../src/state-machine');
var templates_dir = path.resolve(args['templates-dir']);
var wysia_subdir = path.resolve(templates_dir, args['wysia-subdir']);
var public_subdir = path.resolve(templates_dir, args['public-subdir']);
function get_handler(req, res) {
	state_machine ({
		load_data_files: function() {
			var data_files_param = req.params.data_files;
			var data_files;
			if(!data_files_param || data_files_param.length === 0) {
				data_files = [];
			}
			else {
				data_files = data_files_param.split(',');
			}
			if(data_files.indexOf(req.params.page) === -1 && fs.existsSync(req.params.page + '.json')) {
				data_files.unshift(req.params.page);
			}
			if(data_files.indexOf('global') && fs.existsSync('global.json')) {
				data_files.unshift('global');
			}
			this.data = data_files.map (
				function(data_file_name) {
					return JSON.parse (
						fs.readFileSync (
							path.resolve(wysia_subdir, data_file_name + '.json')
							, { encoding: 'utf8' }
						)
					);
				}
			);
			this.merge_data();
		}
		, merge_data: function() {
			if(this.data.length === 0) {
				this.data = {};
			}
			else {
				this.data = this.data.reduce(merge);
			}
			this.load_helpers();
		}
		, load_helpers: function() {
			var helpers = this.helpers = {};
			glob.sync(path.resolve(templates_dir, '*.helper.js')).forEach (
				function(file) {
					var name = path.basename(file, '.helper.js');
					var helper = new Function(fs.readFileSync(file, { encoding: 'utf8' }));
					helpers[name] = helper;
				}
			);
			this.load_partials();
		}
		, load_partials: function() {
			var partials = this.partials = {};
			glob.sync(path.resolve(templates_dir, '*.partial.hbs')).forEach (
				function(file) {
					var name = path.basename(file, '.partial.hbs');
					var partial = fs.readFileSync(file, { encoding: 'utf8' });
					partials[name] = partial;
				}
			);
			this.load_page_template();
		}
		, load_page_template: function() {
			this.page_template = fs.readFileSync (
				path.resolve(templates_dir, req.params.page + '.hbs')
				, { encoding: 'utf8' }
			);
			this.render_page();
		}
		, render_page: function() {
			var root = this.data;
			var helpers = this.helpers;
			var partials = this.partials;
			helpers.partial = function(name, options) {
				var partial = partials[name];
				var data = Object.create(options.hash);
				data.root = root;
				return new hbs.SafeString(hbs.compile(partial)(data));
			};
			Object.keys(helpers).forEach (
				function(helper_name) {
					hbs.registerHelper(helper_name, helpers[helper_name]);
				}
			);
			Object.keys(partials).forEach (
				function(partial_name) {
					hbs.registerPartial(partial_name, partials[partial_name]);
				}
			);
			this.page_html = hbs.compile(this.page_template)(root);
			Object.keys(helpers).forEach (
				function(helper_name) {
					hbs.unregisterHelper(helper_name);
				}
			);
			Object.keys(partials).forEach (
				function(partial_name) {
					hbs.unregisterPartial(partial_name);
				}
			);
			this.send_response();
		}
		, send_response: function() {
			res.send(this.page_html);
		}
	});
}
function post_handler(req, res) {
	res.redirect(req.url);
}
app.use(express.static(public_subdir));
app.get('/:page/:data_files', get_handler);
app.get('/:page', get_handler);
app.post('/:page/:data_files', post_handler);
app.post('/:page', post_handler);
app.listen(args.port);
console.log("Wysia started on port", args.port + ".");
