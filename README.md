# Photos Server

Photos Server does three things:

1. Serves media items from the Photos library via HTTP on localhost.
2. Launches Photos by opening HTTP URLs with a particular pattern.
3. Copies links to the currently selected items in the Photos application.

For the remainder of this document we will use the term "Photo" to refer to a media item, which can be, in fact, a video.

## Use case

I make notes in markdown documents, stored in a git repository. Rather than storing copies of my photos I want to include with my notes, I use links to URLs that resolve to the items in my Photos library.

When I select items in the Photos application and press a hotkey combination, links to those items are copied to the clipboard as markdown images.

In the video below, I then open my editor and paste the image links into a markdown document.

When I open the linked url, the Photos application opens, focussed on the image.

![Demo](https://github.com/user-attachments/assets/d4d54ee1-15b2-4621-b701-2c591b1ef237)

The url

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

### Start/Restart the server

This provides the opportunity to change the port the server is listening on. When starting the server a file is written to `~/Library/LaunchAgents/` that will restart the server when the system reboots.

### Remove the server

This will stop the server and remove the launch agent from the user's `~/Library`. It will remain uninstalled on reboot.

### Set the prefix for URLs to open in Photos

The prefix should be an **_authority_**: the combination of hostname (or IP address) and optional port number (if not 80, which is implied). This value will be used in two places.

1. When links are copied, they will be in the form http://**_authority/basename_** or http://**_authority/UUID/basename_**.
2. When Photos Server is the default browser, opening a URL beginning with http://**_authority_**/ will open Apple Photos, with the identified photo selected in the "view" mode.

If you are not using fancy redirection, you'll want this to be "localhost:**_port_**", where _port_ is the same as the value set when starting/restarting the server. With [fancy redirection](#fancy-redirection), this doesn't have to be the case. For example, I use port `6330` and `photos.local` as the authority.

### Set the preferred browser

When Photos Server is the default browser, URLs that do not begin with http://**_authority_**/ will open with this preferred browser.

### Funny behaviour

The UI of the control panel is somewhat limited because it restricts itself to using native JXA UI elements. This also comes with a particular side-effect: when Photos Server is the default browser, and its control panel is open, opening any HTTP will activate the control panel, and the link will not open in either Photos or the preferred browser.

## Installation

### Dependencies

- The installation scripts require **_jq_** and a recent-ish version of **_bash_**. Both are available via [homebrew](https://brew.sh).

- I don't think **_Xcode_** is required, but it might be required for some of the icon generation—I don't really know. Please let me know if you run into an Xcode dependency, or any other surprise dependencies.

### Build process

I wrote a script to bundle a JXA script into an application bundle. When executed from the root of the repository this create the Photos Server application in the `dist` directory:

```shell
scripts/osabundle src/photosServer.json
```

Once built it needs to be moved to the Applications folder to work correctly.

### Uninstallation cruft

Photos Server will listen for incoming connections by creating a launch agent at `~/Library/LaunchAgents/ca.heckman.path.plist`. This file can be removed from the control panel, but it will not be automatically removed when the Photos Server application is deleted. Photos Server also creates small file to store its settings at `~/Library/Preferences/ca.heckman.PhotosServer.plist` which will also be left behind.

### The log

The latest version uses the system log for the part of the application that handles http requests and opens urls. The following command filters the system log stream for the handler, piping it to awk to filter out less interesting content.

```shell
log stream --debug --predicate 'process == "logger" AND composedMessage CONTAINS "ca.heckman.PhotoServer.handler"' | awk 'NR>2{printf("%s %-8s%s\n",substr($2,1,12),$4,substr($0,index($0,"[ca.heckman.PhotoServer.handler]")+32))}'
```

## Fancy redirection

> [!WARNING]
> It's probably not a good idea to trust my instructions. It is not my fault if you do and things go poorly. Check other sources. It requires root access and can do damage. Be careful.

This section describes how I have configured http://photos.local to connect to http://127.0.0.1:6330.

I've automated this process in a script at `script/danger`. I use it for development but it's a bad idea to use it blindly because it has the potential to do serious damage to your system. Reading its source, however, may help with the process.

The redirection is accomplished in two steps, both requiring root access.

### Forward port 80 on another loopback device

This will let us use an address without specifying a port. Ports below `1024` are restricted, but we can redirect port `80` on `127.6.6.3` (or another loopback address) to `127.0.0.1:6330`. We will also redirect port `80` on `fd00::6630` to port `6330` on `::1`. This can be done by creating a launch daemon that uses `pfctl` to perform the port forwarding.

The only safe use of the _danger_ script is `script/danger plist` which will print the plist for a launch daemon that will perform the port forwarding. It can be used as a model, or saved as it is to `/Library/LaunchDaemons/ca.heckman.PhotosServer.port-forwarding.plist`.

### Add a hostname to /etc/hosts

This file defines ip addresses for specific host names. Adding the following line is enough:

```
127.6.3.3       photos.local
fd00::6630      photos.local
```

This will cause the system to resolve `photos.local` to `127.6.3.3` (or `fd00::6330)`.

I highly recommend using a name ending in `.local` because Photos Server only servers HTTP (not HTTPS) and many browsers (an my markdown editor) will not let you connect to most hosts without HTTPS, hosts ending with `.local` are an exception to this rule. The only catch with this TLD is that if you don't include the ip6 address, the system will take 5 seconds before resolving to the ip4 address while the Bonjour service tries to locate `photos.local`.

With the port-forwarding described earlier in place, adn this addition to `/etc/hosts/`, requests to this `photos.local:80` will be forwarded to `127.0.0.1:6330` where they will be served by the Photos Server application.

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
