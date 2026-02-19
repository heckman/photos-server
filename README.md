# Photos Server

Photos Server does three things:

1. Serves media items from the Photos library
   via HTTP on localhost.
2. Launches Photos to open HTTP URLs
   that have a particular prefix.
3. Copies links to the items currently selected
   in the Photos application.

For the remainder of this document we will use the term
"Photo" to refer to a media item, which can be, in fact, a video.

## Use case

I make notes in markdown documents
and I want to include photos from my Photos library.

I'd rather not export copies of the image files
to include along side my notes,
which are stored in a git repository.
Instead, I use links that resolve directly
to the media items within the Photos application.
The following video shows the process:

1. In Apple Photos,
   I select the photos I want to link to
   and press a key combination,
   which copies markdown links to the clipboard.
2. I paste the links into my markdown document,
   where the addresses of the images
   point to a port on localhost,
   where the images are provided by the Photos Server.
3. When I open one of the links "In the browser"
   the Photos application opens,
   focussed on the image.

![Demo](https://github.com/user-attachments/assets/d4d54ee1-15b2-4621-b701-2c591b1ef237)

## The three features

### The server

By default, Photos Server listens to
port `6330` on localhost (`127.0.0.1`)
for incomming HTTP requests.

> [!TIP] Pretty URLs
> In the demo video,
> I access this port via `http://photos.local`,
> through the use of some
> [fancy redirection](#fancy-redirection).)

The server will use
the first component of the URL's path,
which we call the **_identifier_**,
to locate a media item in the Photos library.

First, it will try to use the **_identifier_**
to specify the media item by its ID,
which is unique within the libary,
but which will vary between libraries—on different devices,
or if the library is not migrated properly.

If the _identifier_ does not match an ID of a media item,
it is used as a search query, after replacing all
plus (`+`) tilde (`~`) and period (`.`) characters with spaces.
This search is identical to using
the search box within the Photos application.

The last component of the url is the **_basename_**.
If the photo is downloaded,
its filename will be formed
by combining the _basename_ with the appropriate extension.
If there is only one url component
it will be used as both the _identifier_ and the _basename_.
[^TODO_BASENAME_QUERY]

[^TODO_BASENAME_QUERY]:
    **TO DO**: If the server cannot find
    a media item by using the _identifier_ as a search query,
    it should do another search using the _basename_.

### The "default browser"

To enable this function,
Photos Server must be set as the default browser.
This is done in the System Settings.

As the default browser, Photos Server will open HTTP URLs.
It will screen them for URLs with a particular
[origin](https://developer.mozilla.org/en-US/docs/Web/API/URL/origin),
which it will open with the Photos application,
focussed on the media item specified by the URL.
URLs that don't match the prefix
will be forwarded to a pre-designated application.

The origin can be set to any valid origin with the `http:` scheme,
its default value is `http://localhost:6330`.
This origin will also be used
when copying links in the Photos Application.

### The link copier

This feature is made available as a JXA script libary
included in the Photos Server application bundle at
`Photos Server.app/Contents/Resources/Script Libraries/Photos Links.scptd`.
Creating a symbolic link in the
`~/Library/Script\ Libraries/` folder
pointing to this file will make the library
available within JXA scripts with the Library function.

The function `copy_selection_as_markdown_links`
[^TODO_RENAME_FUNCTIONS]
will generate a URL for each media item
selected in the Photos application
that will resolve to that item
when opened by the default browser
or when requested from the Photos server.

[^TODO_RENAME_FUNCTIONS]:
    **TO DO**: Rename the script library
    functions using conventional capitalization.

This funciton will attempt to generate links
with unique identifiers based on the media item's date and filename.
If the attempted identifier does not resolve to a unique media item,
it will be prepended with the item's ID as the first URL component.

Alt-text will be generated from first
non-blank value found in the media item's
title, caption, keywords, or filename.

## Settings & server control

The server can be controlled, and setting can be changed,
with a command-line utility located at
`Photos Server.app/Contents/Resources/Scripts/serverctl`.

One of the utility's commands is `dialog`
which provides some rudimentary dialog boxes
to access its functionaliry with a graphic interface.
This graphic interface can also be launced by double-clicking
on the Photos Server application.

There are three settings:

- **port** Restarting the server in the graphical interface
  will prompt for a port number.
  It can be set without restarting from the command line utility,
  in which case it will take effect on the next (re)start.
- **origin** URLs generated by the link copier will begin with this
  [origin](https://developer.mozilla.org/en-US/docs/Web/API/URL/origin),
  and, when Photos Server is the default browser,
  URLs with this origin will be opened by the Photos application
  while the remainder will be forwarded to
  the pre-set preferred browser.
- **browser** The application to open URLs that don't begin with
  _origin_.

The other commands control the server, or obtain information about it.
For more information, refer to help text of the command-line utility
with `serverctl --help`, or refer to its source code at
`src/resources/Scripts/serverctl`.

## Installation

### Dependencies

- The installation scripts require **_jq_** and
  a recent-ish version of **_bash_**.
  Both are available via [homebrew](https://brew.sh).

- I don't think **_Xcode_** is required, but I can't be sure.
  Please let me know if you run into an Xcode dependency,
  or any other surprise dependencies for that matter.

### Build process

I wrote a script to bundle a JXA script into an application bundle.
From the repository root it can be used like this
to create the Photos Server application in the `dist` directory:

```shell
scripts/osabundle src/photosServer.json dist/Photos\ Server.app
```

Once built it needs to be moved to
the Applications folder to work correctly.

During development, I make frequent use of
`scripts/rebuild-and-reinstall-and-open`.

### Uninstallation cruft

Starting the server will create a launch agent at
`~/Library/LaunchAgents/ca.heckman.path.plist`.
Stopping the server removes it.
If the Photos Server application is removed
without stopping the server it will remain.
The Photos Server application creates another file
to save its settings at
`~/Library/Preferences/ca.heckman.PhotosServer.plist`,
which is never removed.

### The log

The `handler` script,
which handles both opening URLs beggining with _origin_
as well as HTTP requests, logs to the system log.
Its entries can be filtered with the predicate
`process == "logger" AND composedMessage CONTAINS "ca.heckman.PhotoServer.handler"`

There is a script in the repo in the `scripts` directory
that will stream the log, lightly formatted, for debugging.

## Issues

There was an issue with opening multiple webloc files at once,
with the pre-selected browser to handle non-matching URLs.
Only one of them would be opened.
The JXA was using an Objective-C bridge function
to handle forwarding the opening, and I've replaced
it with a call to running `open -a` in a shell command,
which seems to be working,
but I don't know if it is stable.

I've found an application that, when it is set as the default browser,
can set up rules that decide which browser is opened for each URL.
It is called [finicky](https://github.com/johnste/finicky).
I haven't tried it yet.
I'm hoping I can offload the role of delegating URL-opening,
and have Photos Server open every URL sent to it.

## Fancy redirection

> [!WARNING]
> It's probably not a good idea to trust my instructions.
> It is not my fault if you do and things go poorly.
> Check other sources.
> It requires root access and can do damage.
> Be careful.

This section describes how I have configured my machine
to make requests to http://photos.local
connect to the server listening on http://127.0.0.1:6330.

I've automated this process in a script at `script/danger`.
I use it for development but it's a bad idea to use it blindly
because it has the potential to do serious damage to your system.
Reading its source, however, may help with the process.

The redirection is accomplished in two steps,
both requiring root access.

### Forward port 80 on another loopback device

This will let us use an address without specifying a port.
Ports below `1024` are restricted,
but we can redirect port `80` on `127.6.6.3`
(or some other loopback address)
to `127.0.0.1:6330`.
We will also redirect port `80` on `fd00::6630`
to port `6330` on `::1`.
This can be done by creating a launch daemon
that uses `pfctl` to perform the port forwarding.

The only safe use of the _danger_ script is `script/danger plist`
which will print the plist for a launch daemon
that will perform the port forwarding.
It can be used as a model, or copied to a file at
`/Library/LaunchDaemons/ca.heckman.PhotosServer.port-forwarding.plist`.

### Add a hostname to /etc/hosts

This file `/etc/hosts` defines ip addresses for specific host names. Adding the following lines will do what we need:

```
127.6.3.3       photos.local
fd00::6630      photos.local
```

This will cause the system to resolve `photos.local`
to `127.6.3.3` (or `fd00::6330)` with IPv6).

I highly recommend using a name ending in `.local`
because Photos Server only servers HTTP (not HTTPS)
and many browsers (an my markdown editor
will not let you connect to most hosts without HTTPS.
Hosts ending with `.local` are an exception to this rule.
The only catch with this TLD is that
if you don't include the IPv6 address,
the system will take about 5 seconds
before resolving to the IPv4 address
while the Bonjour service tries to locate `photos.local` via IPv6

With the port-forwarding described earlier in place,
and with this addition to `/etc/hosts/`,
requests to `photos.local:80` will be forwarded to `127.0.0.1:6330`
where they will be served by the Photos Server application.

## License

This project is shared under the GNU v3.0 General Public License,
except for the two SVG icons used for reponses to
unsuccessful HTTP requests,
whose copyrights are held by other people::

- The 'broken image' icon was created for Netscape Navigator
  by Marsh Chamberlin (<https://dataglyph.com>).
  The icon's [SVG code](https://gist.github.com/diachedelic/cbb7fdd2271afa52435b7d4185e6a4ad)
  was hand-coded by github user [diachedelic](https://gist.github.com/diachedelic).

- The 'sad mac' icon was created for Apple Inc.
  by Susan Kare (<https://kareprints.com>).
