Wysia
=====

Wysia ("What you see is awesome!") is in essence an HTML template + mock data viewer. A more obnoxious description might be a functional prototyping platform for front end development.

It is meant to showcase web designs with the least amount of duplication by using the same templates used in the final web site or application.

It can also be used together with PhantomJS in order to comprehensively unit test your web site's appearance -- taking photos of elements and comparing them to saved ones -- as well as client-side behavior if you isolate mock logic from production logic.

It will start a server that serves all Handlebars templates in the current directory backed by the specified JSON files.

E.g. if you `GET /article-view/logged-in,sample-article`, the server will render `article-view.hbs` with `logged-in.json` and `sample-article.json`.

Other examples:

* `/article-view/logged-out,sample-article`
* `/home/logged-out,sample-articles,sample-blogroll`
* `/admin/logged-in,admin-user`
* Etc.

Shared state and cookies!
-------------------------

Besides JSON models, a shared state among site visitors is also merged in as template data, as well as browser cookies.

Shared state can be changed via POST requests, which allow site visitors some level of interaction. Such shared state is initialized to an empty JavaScript object on server start, or to the contents of `{templates-dir}/{wysia-subdir}/initial-shared-state.json`, if present.

Browser cookies are merged lastly to allow for mock authentication, as well as other things up to your imagination.

How POST requests work?
-----------------------

In order for POST requests to manipulate shared state, a field called `$state-update-logic` is used. The field should contain JavaScript code to be executed by the server. It is sandboxed and can only access shared state, cookies, and the rest of form data. E.g.:

    <input type="hidden" name="$state-update-logic" value='
		state.tasks.push(form_data.task);
	'>
	<input type="text" name="task" placeholder="Task description.">
	<input type="submit" value="Add task.">

Wysia will detect the presence of `$state-update-logic` and execute the code, which in turn pushes the task description from form field `'task'` value into the `tasks` shared state array.

__Note__: All site visitors have unrestricted access to shared state like that. For prototyping this is very handy, but bear in mind that in a production setting that's just catastrophic.

Usage
-----

	wysia [templates-dir] [options]

	templates-dir: Serve templates from this directory.
		Default: ./

	Options:
		-w, --wysia-subdir: Subdirectory where JSON models are stored.
			Default: none (models loaded from templates-dir)
		-p, --port: Listening port to serve from.
			Default: 3000

Copying
-------

![](https://www.gnu.org/graphics/agplv3-155x51.png)

Wysia is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Websites served via Wysia are derivative works and must as such be redistributable under the terms of the AGPLv3 as well.

Unfriendliness with the proprietary paradigm is intentional. If you're writing proprietary software, please consider [respecting your users' freedom instead.](https://www.gnu.org/philosophy/free-sw.html)

A copy of AGPLv3 can be found in [COPYING.](COPYING)
