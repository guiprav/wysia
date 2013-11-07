Wysia
=====

Wysia ("What you see is awesome!") is an HTML template + mock data viewer.

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

