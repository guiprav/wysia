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
require('pkginfo')(module, 'version');
var args = require('../src/arguments');
var merge = require('../src/merge');
var state_machine = require('../src/state-machine');
var templates_dir = path.resolve(args['templates-dir']);
var wysia_subdir = path.resolve(templates_dir, args['wysia-subdir']);
var public_subdir = path.resolve(templates_dir, args['public-subdir']);
if(args.version) {
	console.log(module.exports.version);
	process.exit(0);
}
function get_index_handler(req, res) {
	req.params.page = 'index';
	get_handler(req, res);
}
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
			(function include_implicit_data_files() {
				var page_data_file_path = path.resolve(wysia_subdir, req.params.page + '.json');
				var global_data_file_path = path.resolve(wysia_subdir, 'global.json');
				if(data_files.indexOf(req.params.page) === -1 && fs.existsSync(page_data_file_path)) {
					data_files.unshift(req.params.page);
				}
				if(data_files.indexOf('global') && fs.existsSync(global_data_file_path)) {
					data_files.unshift('global');
				}
			})();
			this.data = data_files.map (
				function(data_file_name) {
					var datagen_module_path = path.resolve(wysia_subdir, data_file_name + '.datagen.js');
					var data_file_path = path.resolve(wysia_subdir, data_file_name + '.json');
					if(fs.existsSync(datagen_module_path)) {
						delete require.cache[datagen_module_path];
						return require(datagen_module_path);
					}
					else
					if(fs.existsSync(data_file_path)) {
						return JSON.parse(fs.readFileSync(data_file_path, { encoding: 'utf8' }));
					}
					else {
						throw new Error (
							"Data file / datagen module '" + data_file_name + "' could not be found."
						);
					}
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
					delete require.cache[file];
					helpers[name] = require(file);
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
			helpers.partial = function(name) {
				var partial = partials[name];
				var options = arguments[arguments.length - 1];
				var data;
				var args = [];
				if(arguments.length > 2) {
					args = [].slice.call(arguments, 1, -1);
				}
				data = Object.create(options.hash);
				data.root = root;
				data.arguments = args;
				return new hbs.SafeString(hbs.compile(partial)(data));
			};
			helpers.expand = function(array) {
				[].slice.call(arguments, 1, -1).forEach (
					function(name, i) {
						if(this[name] !== undefined && this[name] !== null) {
							throw new Error (
								"Cannot expand '" + name + "': Variable already exists in this scope."
							);
						}
						this[name] = array[i];
					}
					, this
				);
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
app.get('/', get_index_handler);
app.get('/:page/:data_files', get_handler);
app.get('/:page', get_handler);
app.post('/:page/:data_files', post_handler);
app.post('/:page', post_handler);
app.listen(args.port);
console.log("Wysia started on port", args.port + ".");
