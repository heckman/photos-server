# Archived Branches

In the development of this project several implementations were attempted.
These various approaches are in the archived branches listed below.
This might not be the best way to structure a repository but here we are.

The descriptions below are quite old, circa February 2024.

Note that the branches marked "(active)" are not in fact active.
They are, however, the latest development for each approach.

## Shell approach

### `archive/sh/netcat`

Abandonned on 2024-02-14 in favour of using `tcpserver` rather than
`netcat`. (Last commit `cbf4092`.)

A bash script that listens to a local TCP port with `nc` for a request.
It uses embedded Javascript-for-Automation (JXA) scripts to instruct
Apple Photos to export the requested photo to a temporary directory from
which is then served.

### `archive/sh/tcpserver/mono`

Abandonned on 2024-02-19 in favour of splitting the `JXA` scripts into
their own files. (Last commit `212f229`.)

Offshoot of the `netcat` branch, uses `tcpserver` instead of `netcat`.
JXA scripts are still embedded in the shell script.

### `archive/sh/tcpserver/micro` (active) (merged into main)

This approach was adopted and further developped as the main branch.

Is comprised of three files:

- `photos`: `JXA` code for interacting with Apple Photos
- `photos-server`: `sh` code for starting/stopping/restarting the server
- `photos-http-response-handler`: `sh` code for handling the http requests

## `JAX` JavaScript-for-Automation (osascript) approach

### `archive/JXA/lib`

Abandonned 2024-02-22 in favour of putting all the `JXA` code in a
single file. (Last commit `1ba15e7`.)

An attempt to rewrite everything using as much JXA as possible.

JXA is a pain to program, a good deal of the code are functions that are
wrappers for shell commands, and everything is a library that needs to
be in the `~/Library/Script Libraries` folder, so it's a pain to
distribute.

This is definitely not the way to go, but has improved my JXA skills!

### `archive/JXA/mono` (active)

The latest version of `JXA` server implementation.

This also contains the best version of `JXA` code for accessing the
Photos.app, most of which has since been copied to the `main` branch.

Another re-write of the `JAX` approach, but rather than multiple
libraries, everything is in a single file. Including the server control
and http-response handler in the script is questionable.

The functions that directly interact with the Photos.app should
definitely stay in a single script, in fact this script could be merged
back into the `sh` and `js` implementations that make use of external
scripts.

The script is structured in such a way that it is easy to add additional
functions. It could eventually provide a command-line interface to all
scriptable endpoints of the Photos application.

## `bun` approach

Using the `bun` runtime to write as much as possible in javascript.

Currently the biggest issue is the difficulty in removing temporary
files. This might be resolved by using the the
[Elysia](https://elysiajs.com/) framework.

The JXA components are still called as external commands, so the fact
that both parts are written in javascript offers no advantage.

### `archive/bun/sync`

Abandoned on 2024-02-13 in favour of asynchronous approach.

Latest commit c4b1d7fd53d9b4aa4244dcd6d899788c1f272e01 as of 2024-02-22

Original javascript implementation. Written entirely with synchronous
functions.

#### Issues

The server hitting occasional segmentation faults, possibly caused by
the self-terminating `get-photo-id` subprocesses.

### `archive/bun/await`

Abandoned on 2024-02-15 in favour of `.then`/`.catch` style.

Re-implementation using asynchronous functions, mostly using
await--everywhere except for in the primary request-handling function,
which uses the `.then` construct.

#### Issues

Can't remove temporary files after returning http response

### `archive/js/bun/then.catch` (active)

Latest version of javascript server implementation.

Removed all await operators, and instead use the .then/.catch construct
throughout. I prefer reading the code written in this manner; it feels
more like functional programming.

#### Issues

Can't remove temporary files after returning http response

## `nodeautomation` approach (abandoned)

This approach was abandoned on 2024-02-22.

I never got this working. Also, it doesn't look like incorporating the `JXA` code into the regular javascript code would actually offer any advantage.

The `[nodeautomation](https://hhas.github.io/nodeautomation/) npm package,
which allegedly "allows 'AppleScriptable' applications to be controlled
by Node.js (JavaScript) scripts." It is unclear how stable it is, or how
well it is maintained; bugs were fixed as recently as last year: [source
on github](https://github.com/hhas/nodeautomation). It comes with this
warning:

> Caution: This is an alpha release. There will be bugs and rough edges.

### `archive/nodeautomation/bun`

After making changes to the server code incorporating the `nodeautomation` library,I discovered that it uses a library (`napi`) which does not currently play nicely with `bun`.

### `archive/nodeautomation/express`

So I replaced `bun` with `node`, and used the `express` http server library. Before introducing the `nodeautomation` code, when testing the server, it seemed quite slow. Taking a closer look, it was taking about 3.5 seconds to respond to a request, while
bot the `bun` and `sh` servers typically respond on the order of 1 to 1.25 seconds.

### `archive/nodeautomation/fastify`

Thinking it might be because the `express` library is overkill, I attempted to replace it with the `fastify` library. It was a mess, I had problems with typescript, and I gave up.
