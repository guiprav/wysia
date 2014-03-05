Wysia
=====

Wysia ("What you see is awesome!") is an HTML template + mock data viewer. It is meant to showcase web designs with the least amount of duplication by using the same templates used in the final web site or application.

It can also be used together with PhantomJS in order to comprehensively unit test your web site's appearance -- taking photos of elements and comparing them to saved ones -- and maybe client-side behavior if you mock the web API.

It will start a server that serves all Handlebars templates in the current directory backed by the specified JSON files.

E.g. if you `GET /article-view/logged-in+sample-article`, the server will render `article-view.hbs` with `logged-in.json` and `sample-article.json`.

Other examples:

* `/article-view/logged-out+sample-article`
* `/home/logged-out+sample-twitter-feed+sample-articles`
* `/admin/logged-in+admin-user`
* Etc.

Usage
-----

    wysia [DIRECTORY] [OPTION]...

    Serve templates from [DIRECTORY] or the current directory.

    -p, --port    	   The port to run the HTTP server on (default: 4000).
    -t, --templates	   Templates subdirectory and file extension override (optional).
    -d, --data		   Mock data subdirectory and file extension override (optional).

Running from current directory:

    cd your-templates
    wysia

Separate template and/or mock data directories:

    # Serve templates from `./your-templates/templates/*.hbs` with
    # mock data from `./your-templates/mock-data/*.json`:

    wysia your-templates -t templates -d mock-data

Other file extensions:

    # Serve templates from `./your-templates/*.not-hbs` with
    # mock data from `./your-templates/*.not-json`:

    wysia your-templates -t ?.not-hbs -d ?.not-json

Copying
-------

![](https://www.gnu.org/graphics/agplv3-155x51.png)

Wysia is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Websites served via Wysia are derivative works and must as such be redistributable under the terms of the AGPLv3 as well.

Unfriendliness with the proprietary paradigm is intentional. If you're writing proprietary software, please consider [respecting your users' freedom instead.](https://www.gnu.org/philosophy/free-sw.html)

A copy of AGPLv3 can be found in [COPYING.](COPYING)
