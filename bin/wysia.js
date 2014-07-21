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
var hbs = require('handlebars');
var marked = require('marked');
var args = require('../src/arguments');
var templates_dir = path.resolve(args['templates-dir']);
var wysia_subdir = path.resolve(templates_dir, args['wysia-subdir']);
var public_subdir = path.resolve(templates_dir, args['public-subdir']);
app.listen(args.port);
console.log("Wysia started on port", args.port + ".");
