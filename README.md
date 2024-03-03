# Photos Server

Serves photos from the [Apple
Photos](https://apps.apple.com/app/photos/id1584215428) application
locally on your Mac.

**THIS IS PROJECT IS IN A STATE OF WILD FLUX**

Expect breaking changes throughout.

## Usage

### Client

Make a HTTP request to `http://localhost:6330/<query>[/open]...

- If `<query>` is a valid photo ID in Apple Photos, that photo will be
  returned. If it is not but looks like a UUID you'll get a _404_ error.
- Otherwise, Apple Photos will perform a search fo `<query>`, and of the
  results, a random photo will be returned. Results will be limited to
  JPEG and HEIC files (no movies).
- If the search produces no valid results, you'll get a _404_.
- If the search takes too long you'll get a _500_ error. (Try narrowing
  your search terms.)
- if `/open` is appended to the URL, the photo also will be opened in
  the Photos app.

### Server

Control the server with `photos-server` with the following commands:

```
  photos-server start [<timeout>]
  photos-server restart [<timeout>]
  photos-server stop
  photos-server status
```

Searches performed by Apple Photos can be limited to `<timeout`>
seconds. At the moment (but liable to change without being updated here)
the default is 1 second. Setting this to 0 seconds disables the timeout.

### Installation

#### Dependencies

The utilities `tcp-server` and `trurl` are required. Both are avaiable
via homebrew from the `ucspi-tcp` and `trurl` formulae respecrively. The
`greadlink` and `realpath` commands are also required; they are
available in the `coreutils` homebrew formula.

#### Source files

There are three files to install:

- `photos-cli`, which contains functions that access the Photos
  Application.
- `photos-server`, which manages the operations of the server.
- `photos-http-response-handler`, which generates responses to HTTP
  requests sent to the server.

They can be put anywhere as long as they can find each-other.
`photos-server` expects `photos-http-response-handler` to be in
`../libexec`, and `photos-http-response-handler` expects `photos-cli` to
be on the PATH. Edit these expectations in the code as required.

#### Automation

There is an script called `install.sh` which will copy these files where
I like to put them. Don't run it unless you've grokked its source code
and edited to suit your environment.

## Command-line tools

Several command-line functions to interact with Apple Photos were
created in the implementation of this server. They may be extracted to
their own repository in the future. Currently they are included in the
file `photos-cli`.

## Implementation

There are several different implementations, each with their own branch.
See [branches.md](./VERSIONS) for more details.

Three are in (somewhat) active development:

- one written in JavaScript using the `bun` runtime.
- one written in `sh` using `tcpserver`
- one written in `JXA`, also using `tcpserver`.

The first two implementations make use of external scripts written in
`JXA` to communicate with Apple Photos. The third incorporates these
functions into a single script that also encapsulates the server powered
by `tcpserver`.

The `sh/tcpserver` branch has been adopted as `main` for publication.
The other two versions have become stale.

## License

This project is shared under the GNU v3.0 General Public License, except
for the two SVGs embedded in the `photos-server`, whose copyrights are not held
by me:

- The 'broken image' icon was created for Netscape Navigatorby Marsh
  Chamberlin (<https://dataglyph.com>). The SVG code,
  [found here](https://gist.github.com/diachedelic/cbb7fdd2271afa52435b7d4185e6a4ad),
  was hand-coded by github user
  [diachedelic](https://gist.github.com/diachedelic).

- The 'sad mac' icon was created for Apple Inc. by Susan Kare (<https://kareprints.com>).
  I hand-crafted the SVG code.
