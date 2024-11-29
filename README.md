# Photos Server

> [!WARNING] THIS IS PROJECT IS IN A STATE OF WILD FLUX
> Expect breaking changes throughout.

Serves photos from the [Apple
Photos](https://apps.apple.com/app/photos/id1584215428) application
locally on your Mac.

For instance, on my Mac,
<http://photos/C725495D-7037-4E86-94B6-98EDFAE40AF4>
will return the full-resolution version of this photo:

<p align="center">
<img src="images/P1080279-600x1200.jpeg" alt="a raven" width="150">
</p>

And <http://photos/raven?open> will return a random photo of a raven and then open it in Apple photos.

## Usage

### Client

Make a HTTP request to `http://photos/\<query>[?open]`...

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

### Installation

#### Dependencies

The HTTP handler requires the utility `trurl`;
it is available through homebrew as the `trurl` formula.
It is used to parse and decode the incoming URL.

The automated installation requires the `greadlink` command;
it is available as part of the `coreutils` homebrew formula.

#### Source files

There are four files to install:

- `photos-cli`,
  which contains functions that automates the Apple Photos Application.
  This is used by the HTTP handler to export photos.
- `photos-http-handler`,
  which generates responses to HTTP requests sent to the server.
- `ca.heckman.photos-server.plist`,
  which initiates the HTTP server on a local port.
- `ca.heckman.photos-server-init.plist`, which redirects requests made
  to `https://photos` to the local server.

Additionally, the hosts file `/etc/hosts`
needs to be edited to include the line:

```plain-text
127.0.63.30     photos
```

The `.plist` files should be put in `~/Library/LaunchAgents`.

The source files expect things to be in the following locations:

- The launch agent `ca.heckman.photos-server.plist` expects
  `photos-http-handler` to be in `/usr/local/libexec`.
- The the HTTP handler `photos-http-handler` expects
  the command-line utility `photos-cli` to be in `/usr/local/bin`
  and `trurl` to be found in `/opt/homebrew/bin`.

These expectations can be edited in the source files.

#### Automated installation

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
