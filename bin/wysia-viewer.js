#!/usr/bin/env node
var fs = require('fs');
var http = require('http');
var express = require('express');
var hbs = require('handlebars');
var marked = require('marked');
var merge = require('../src/merge');
hbs.registerHelper
(
	'markdown', function(text)
	{
		if (!text)
		{
			return '';
		}
		return new hbs.SafeString
		(
			marked
			(
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
app.use(express.logger());
app.use(express.static(process.cwd()));
app.get('/:template', no_models_handler);
app.post('/:template', no_models_handler);
app.get('/:template/:models', handler);
app.post('/:template/:models', handler);
function no_models_handler(req, res)
{
	req.params.models = '';
	handler(req, res);
}
function handler(req, res)
{
	req.params.models = req.params.models.split('+');
	if (req.params.models.length === 1 && req.params.models[0] === '')
	{
		req.params.models = [];
	}
	var shell_template;
	fs.readFile
	(
		'shell.hbs', 'utf8', function(err, template)
		{
			shell_template = template;
			fs.readFile(req.params.template + '.hbs', 'utf8', template_loaded);
		}
	);
	function template_loaded(err, template)
	{
		if (err)
		{
			res.status(500);
			res.send(err);
			return;
		}
		var final_model = {};
		var models_loaded = 0;
		(
			function load_model(err, model)
			{
				if (err)
				{
					res.status(500);
					res.send(err);
					return;
				}
				if (model !== undefined)
				{
					++models_loaded;
					model = JSON.parse(model);
					for (var key in model)
					{
						final_model[key] = merge(final_model[key], model[key]);
					}
				}
				if (models_loaded !== req.params.models.length)
				{
					fs.readFile(req.params.models[models_loaded] + '.json', 'utf8', load_model);
				}
				else
				{
					final_model_ready();
				}
			}
		)();
		function final_model_ready()
		{
			var template_html = hbs.compile(template)(final_model);
			if (shell_template)
			{
				final_model['content'] = template_html;
				template_html = hbs.compile(shell_template)(final_model);
			}
			res.send(template_html);
		}
	}
}
var port = process.env.PORT || 4000;
http.createServer(app).listen(port);
console.log("Wysia started on port " + port + ".");
