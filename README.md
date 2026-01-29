# Photos Server

Photos Server provides three features:

- a utility to copy HTTP links, in markdown form, of the media items selected in the Apple Photos application, suitable for triggering with a keyboard shortcut.
- an HTTP interface for viewing media items in the Photos library using those links.
- a "default browser" that will open links to certain http urls in the Photos application,
  while passing the remainder to a pre-selected browser.

For the remainder of this document we will use the term "Photo" to refer to a media item, which can be, in fact, a video.

## Use case

I wanted to embed photos from my Photos library into notes I write in markdown, without exporting them, and without embedding them in the repository I keep my notes in.

With this application, I select an image in Apple Photos, use a keyboard shortcut to copy a link to it, then paste it in my markdown document. It looks like this:

![](https://github.com/user-attachments/assets/16ac318c-68bb-4076-a2af-77be5abd7f88)

Later on, If I right-click on the image in my markdown editor, it gives me the option to "Open Image in Browser...". When I select it, the Photos application opens to a view of the photo.

## The three features

### The server

The server listens on localhost (`127.0.0.1`) on port `6330`—the port number is configurable. On my machine I've made it accessible at http://photos.local, which through some [fancy redirection](#fancy-redirection) accesses the HTTP server at `127.0.0.1:6330`. I will use this hostname throughout this document. It can be replaced with `127.0.0.1:6330`. The server doesn't care how you reach it. It only considers the path portion of the URL.

The Photos library selects a photo based on the contents of the first component of the URL's path, which we call the **_identifier_**. There are two kinds of identifiers: a UUID, and a search query. The Photos Server will try to find the photo using each of these methods in turn.

If there is a photo in the library whose UUID matches the first 32 characters of the identifier, that photo will be served. Otherwise, the _identifier_ will be used as a search query, after replacing all plus (`+`) tilde (`~`) and period (`.`) characters with spaces. This search is identical to using the search box within the Photos application.

The last component of the url is the **_basename_**. If the photo is downloaded, it's filename will be this _basename_ with the appropriate extension appended. (The last component can also be the first component.)

### The "default browser"

If the Photos Server application is set as the default browser in System Settings, it will open matching HTTP URLs with Apple Photos, while forwarding non-matching URLs to a pre-designated application. Opening the Photos Server application will open a [control panel](control-panel) to configure these options. The photo to open will be determined by the **_îdentifier_** in the same fashion as the server: by UUID or matching search query. It doesn't care about the _basename_.

### The link-copier

This action is triggered by calling a command included in the Photos Server application bundle. (The command is written in JXA (javascript for automation) and its code can also be copied to be used elsewhere.) When the command is executed a markdown link will be copied for each photo selected in the Photos application.

The copier will try and identify the photo by date and partial filename. If such a search results in only one match, then it will be used as the identifier. (It will also try one day in either direction to compensate for time-zone complications.) This will usually be the case. The photo in the demo video, which can be accessed at `http://photos.local/31F5FDDB-26D6-4EF6-A9E7-4A636F6E6EE2`, will be copied as `http://photos.local/2025-11-15.8903`. (The original filename is` IMG_8903.HEIC`.)

If the search for the date and partial file-name returns with multiple (or somehow no) results, then the URL returned will use the UUID of the photo as the _identifier_, while still including the date and partial filename as the _basename_. It will look something like: `http://photos.local/31F5FDDB-26D6-4EF6-A9E7-4A636F6E6EE2/2025-11-15.8903`.

The copier copies links in mardown format, which included ALT text. The copier tired to come up with alt text based on the photos metadata, looking at its title, caption, keywords, and filename. The complete link copied for the example photo is `![Lola](http://photos.local/2025-11-15.8903)`.

## The control panel

Opening the Photos Server opens the control panel. It provides the following functions:

### Stop the server

The server will restart on a system restart. In a near-future version that will probably be more permanent, probably uninstalling the service completely, to be reinstalled when the server is "restarted".

### Start/restart the server

This is how to change the port on localhost the server will listen on.

### Set the authority for photos

The **_authority_** is the combination of hostname (or ip address) and optional port number (which defaults to 80). This value will be used in two places.

1. When links are copied, they will be in the form http://**_authority_**/**_identifier_**[*/basename*]. (Where the additional _basename_ component is only present when the identifier is a UUID.)
2. When Photos Server is the default browser, opening a URL beginning with http://**_authority_**/ will open Apple Photos, with the identified photo selected in the "view" mode.

If you are not using fancy redirection, you'll want this to be localhost:**_port_**, where _port_ is the same as the value set when starting/restarting the server. With [fancy redirection](#fancy-redirection), this doesn't have to be the case. For example, I use port `6330` and `photos.local` as the authority (with an implied port of 80).

### Set the preferred browser

When Photos Server is the default browser, URLs that do not begin with http://**_authority_**/ will open with this preferred browser.

### Funny behaviour

The UI of the control panel is somewhat limited because it restricts itself to using native JXA UI elements. This also comes with a particular side-effect: when Photos Server is the default browser, and its control panel is open, opening any HTTP will activate the control panel, and the link will not open in either Photos or the preferred browser.

## Installation

### Dependencies

- `/opt/homebrew/bin/bash` — the command that handle incoming HTTP requests has this hardcoded as its interpreter. It needs to be an absolute path pointing at a modern (v4.0+) version of bash. You can edit this to suit. The file can be found in the repository at `src/contents/MacOS/Photos Server`.

- Building the application requires [**_jq_**](https://jqlang.org), which can be installed vie [homebrew](https://brew.sh). It also uses a bunch of system utilities—I believe all of them are included with MacOS, but it is possible Xcode is required.

### Build process

I wrote a script to bundle a JXA script into an application bundle. When executed from the root of the repository this create the Photos Server application in the `dist` directory:

```shell
scripts/osabundle src/photosServer.json
```

Once built it needs to be moved to the Applications folder to work correctly.

### Uninstallation (Launch agent)

Photos Server will listen for incoming connections by creating a launch agent at `~/Library/LaunchAgents/ca.heckman.path.plist`. This file will not be removed when the Photos Server application is removed. A future version will be tidier, but for now, it will have to be uninstalled manually.

## Fancy redirection

> [!WARNING]
> It's probably not a good idea to trust my instructions. It is not my fault if you do and things go poorly. Check other sources. It requires root access and can do damage. Be careful.

This section describes how I have configured http://photos.local to connect to http://127.0.0.1:6330.

I've automated this process in a script at `script/danger`. I use it for development but it's a bad idea to use it blindly because it has the potential to do serious damage to your system. Reading its source, however, may help with the process.

The redirection is accomplished in two steps, both requiring root access.

### Forward port 80 on another loopback device

This will let us use an address without specifying a port. Ports below `1024` are restricted, but we can redirect port `80` on `127.6.6.3` (or another loopback address) to `127.0.0.1:6330`. This can be done by creating a launch daemon that uses `pfctl` to perform the port forwarding.

The only safe use of the _danger_ script is `script/danger plist` which will print the plist for a launch daemon that will perform the port forwarding. It can be used as a model, or saved as it is to `/Library/LaunchDaemons/ca.heckman.PhotosServer.port-forwarding.plist`.

### Add a hostname to /etc/hosts

This file defines ip addresses for specific host names. Adding the following line is enough:

```
127.6.3.3       photos.local
```

This will cause the system to resolve `photos.local` to `127.6.3.3`.

I highly recommend using a name ending in `.local` because Photos Server only servers HTTP (not HTTPS) and many browsers (an my markdown editor) will not let you connect to most hosts without HTTPS, hosts ending with `.local` are an exception to this rule.

With the port-forwarding described earlier in place, adn this addition to `/etc/hosts/`, requests to this `photos.local:80` will be forwarded to `127.0.0.1:6330` where they will be served by the Photos Server application.

## Development

This program is a combination of shell scripts and JXA (JavaScript for Automation). I might rewrite it in Swift. I wrote it for my own use. If it is useful to you please let me know. If you have are any issues or suggestions please let me know.

## License

This project is shared under the GNU v3.0 General Public License,
except for the two SVG icons whose copyrights are not held by me:

- The 'broken image' icon was created for Netscape Navigator
  by Marsh Chamberlin (<https://dataglyph.com>).
  The icon's [SVG code](https://gist.github.com/diachedelic/cbb7fdd2271afa52435b7d4185e6a4ad)
  was hand-coded by github user [diachedelic](https://gist.github.com/diachedelic).

- The 'sad mac' icon was created for Apple Inc.
  by Susan Kare (<https://kareprints.com>).
  I hand-crafted the SVG which is embedded in the source code for the response handler.
