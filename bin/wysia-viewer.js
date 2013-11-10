#!/usr/bin/env node
var fs = require('fs');
var http = require('http');
var express = require('express');
var hbs = require('handlebars');

var app = express();

app.use(express.logger());
app.use(express.static(process.cwd()));

app.get
(
	'/:template', function (req, res)
	{
		req.params.models = '';
		handler(req, res);
	}
);

app.get('/:template/:models', handler);

function handler (req, res)
{
	req.params.models = req.params.models.split('+');

	if (req.params.models.length === 1 && req.params.models[0] === '')
	{
		req.params.models = [];
	}

	var outer_template;

	fs.readFile
	(
		'outer.hbs', 'utf8', function (err, template)
		{
			outer_template = template;
			fs.readFile(req.params.template + '.hbs', 'utf8', template_loaded);
		}
	);

	function template_loaded (err, template)
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
			function load_model (err, model)
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
						final_model[key] = model[key];
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

		function final_model_ready ()
		{
			var template_html = hbs.compile(template)(final_model);

			if (outer_template)
			{
				final_model['page-body'] = template_html;
				template_html = hbs.compile(outer_template)(final_model);
			}

			res.send(template_html);
		}
	}
}

http.createServer(app).listen(4000);
