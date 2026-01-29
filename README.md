# Photos Server

> [!WARNING]
>
> **THIS IS PROJECT IS IN A STATE OF WILD FLUX**<br>
> Expect breaking changes throughout.

**THIS README IS VERY OLD AND OUT OF DATE**

Serves photos from the [Apple
Photos](https://apps.apple.com/app/photos/id1584215428) application
locally on your Mac.

For instance, on my Mac, a request made to
<http://photos.local/C725495D-7037-4E86-94B6-98EDFAE40AF4>
will receive the full-resolution version of this photo:

<p align="center">
<img src="images/P1080279-600x1200.jpeg" alt="a raven" width="150">
</p>
And <http://photos.local/raven?open> will serve a random photo of a raven and then open it in Apple photos.

It is not terribly fast, but it will load photos when I'm editing a markdown document.

The searching feature is particularly slow—slower than it used to be.

## Usage

### Client

Make a HTTP request to `http://localhost:6330/<query>[?open]`...

- `localhost:6330` can be replaced with a pretty name like `photos.local`,
  if it is defined in the hosts file, and port forwarding is set up (See [Naming the server](#Naming the server) for details.)
- If `<query>` is a valid photo ID in Apple Photos, that photo will be
  returned. If it is not but looks like a UUID you'll get a _404_ error.
- Otherwise, Apple Photos will perform a search for `<query>`, and of the
  results, a random photo will be returned. Results will be limited to
  HEIC, HEIF, JPG, JPEG, TIFF, GIF and PNG files. (No RAW images or videos.)
- If the search produces no valid results, you'll get a _404_.
- If the search takes too long you'll get a _500_ error. (Try narrowing
  your search terms.)
- if `?open` is appended to the URL, the photo also will be opened in
  the Photos app.

### Server

The server is operated by a launch agent,
which forwards HTTP requests to the HTTP handler `photos-http-handler`.

### Command-line utility

The utility `photos-cli` provides several functions
to interact with Apple Photos,
one of which is used by the HTTP handler.

It may be spun-off into its own project/repository at some future time.

## Installation

> **Warning**: I haven't Installed this since I changed the system files in `/etc/`.
>
> Please let me know if you have trouble with it and if you overcame it so I can update the instructions.

### Dependencies

The HTTP handler requires the utility `trurl`;
it is available through homebrew as the `trurl` formula.
It is used to parse and decode the incoming URL.

The automated installation requires the `greadlink` command;
it is available as part of the `coreutils` homebrew formula.

### Source files

There are four files to install:

- `photos-cli`,
  which contains functions that automates the Apple Photos Application.
  This is used by the HTTP handler to export photos.
- `photos-http-handler`,
  which generates responses to HTTP requests sent to the server.
- `ca.heckman.photos-server.plist`,
  which initiates the HTTP server on a local port.

#### File locations

The `.plist` files should be put in `~/Library/LaunchAgents`.

The source files expect things to be in the following locations:

- The launch agent `ca.heckman.photos-server.plist` expects
  `photos-http-handler` to be in `/usr/local/libexec`.
- The the HTTP handler `photos-http-handler` expects
  the command-line utility `photos-cli` to be in `/usr/local/bin`
  and `trurl` to be found in `/opt/homebrew/bin`.

These expectations can be edited in the source files.

### Naming the server

If you'd like to refer to the server by name,
rather that as `localhost:6330`,
it can be accomplished by editing some system files.

> **WARNING**: This is not for the faint of heart. Doing this wrong could be VERY VERY VERY bad. Don't do this unless you know what you're doing. If it goes horrible bad it is absolutely not my fault.

#### Forward port 6330

Add this line to a new file at `/etc/pf.anchors/com.local.redirect` to make a new rule:

```conf
rdr pass on lo0 inet proto tcp from any to 127.0.0.3 port 80 -> 127.0.0.3 port 6330
```

Now enable the rule in `/etc/pf.conf`, add the lines with `com.local.redirect` after the existing rules of their respective types, that is to satm the new `rdr-anchor` line after the existing `rdr-anchor` lines, and the new `load anchor` line after the existing `load anchor` lines.

```shell
scrub-anchor "com.apple/*"
nat-anchor "com.apple/*"
rdr-anchor "com.apple/*"
rdr-anchor "com.local.redirect"
dummynet-anchor "com.apple/*"
anchor "com.apple/*"
load anchor "com.apple" from "/etc/pf.anchors/com.apple"
load anchor "com.local.redirect" from "/etc/pf.anchors/com.local.redirect"
```

Now flush the rules with `sudo pfctl -f /etc/pf.conf` which will produce a warning that flushing the rules can mess up your system's existing rules, which is fine.

That takes care of forwarding the port.
Now a request to `127.0.0.3:6330` will be redirected to `127.0.0.3:80`.

Now to add the pretty name. Add lines to `/etc/hosts`
to assign names to `127.0.0.3`.
I used added these:

```plain-text
127.0.0.3       photos
127.0.0.3       photos.local
127.0.0.3       photos.app
```

The only one that worked was `photos.local` so I removed the other two—it's the only one my system would let me access via http rather than https. Also, safari kept adding `.com` to the the plain `photos`.

### Automated installation

> **Warning**: it's probably not a good idea to use this. It is not my fault if you do and things go poorly.

> **Warning**: I haven't used this script since I last edited it, so anything could happen. Really, don't use it!

There is an script called `install.sh` which will copy
the source files to the locations noted above.

Don't run it unless you've grokked the script's source code
and edited it to suit your environment.

The script will not modify `/etc/hosts`; that has to be done manually.

The automated installation does not install
(nor check for the presense of)
the required utilities `trurl` and `greadlink`.

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
