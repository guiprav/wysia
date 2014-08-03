Wysia
===

Wysia ("What you see is awesome!") is in essence an HTML template + mock data viewer.

It is meant to showcase web designs with the least amount of duplication by using the same templates used in the final web site or application.

It can also be used together with PhantomJS in order to comprehensively unit test your web site's appearance -- taking photos of elements and comparing them to saved ones. Ever wondered how many pages and elements are affected by a CSS change? PhantomJS and Wysia could help.

Wysia starts a server that serves all Handlebars templates in a directory, backed by the specified JSON files.

E.g. if you `GET /article/logged-in,sample-article`, the server will render `article.hbs` with `logged-in.json` and `sample-article.json`.

Other examples:

* `/home/sample-articles,sample-blogroll`
* `/article/sample-article`
* `/login`
* `/login/login-error`
* `/admin/writer-user`
* `/admin/admin-user`
* Etc.

If available, `global.json` is automatically prepended to the data files list. Also, if available, `{{page-name}}.json` is automatically prepended, so if you `GET /dashboard/some,things`, but both `global.json` and `dashboard.json` exist, `dashboard.hbs` will be rendered as if data files `global,dashboard,some,things` were requested.

If you `GET /`, Wysia will infer `GET /index`, which would try to load `index.hbs` with data files `global,index` (If available.)

Data file merge algorithm
---

Data files are merged in a pretty straightforward manner: From left to right, they're all recursively merged, where right-hand object keys replace left-hand ones, unless they're both arrays, in which case the right-hand array is appended to the left-hand one.

See [src/merge.js](src/merge.js) for more details.

Usage
---

	Usage: wysia [templates-dir] [options]

	templates-dir: Serve templates from this directory.
		Default: ./

	Options:
		-w, --wysia-subdir: Subdirectory where JSON data files are stored.
			Default: none (models loaded from templates-dir)
		-p, --public-subdir: Subdirectory where static assets (images, scripts, stylesheets, etc.) are stored.
			Default: none (assets served from templates-dir)
		--port: Listening port to serve from.
			Default: 3000 (or process.env.PORT, if set.)

Copying
---

![](https://www.gnu.org/graphics/agplv3-155x51.png)

Wysia is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Websites served via Wysia are derivative works and must as such be redistributable under the terms of the AGPLv3 as well.

Unfriendliness with the proprietary paradigm is intentional. If you're writing proprietary software, please consider [respecting your users' freedom instead.](https://www.gnu.org/philosophy/free-sw.html)

Exclusion of warranty
---

Wysia is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

A copy of AGPLv3 can be found in [COPYING.](COPYING)
