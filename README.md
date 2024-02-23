# Photos Server

Serves photos from the [Apple
Photos](https://apps.apple.com/app/photos/id1584215428) application
locally on your Mac.

TODO: **THIS FILE IS OLD AND NEEDS TO BE UPDATED.**

## Usage

Make a HTTP request to `http://localhost:6330/<query>[/open]...

- If `<query>` is a valid photo ID in Apple Photos, that photo will be
  returned. If it is not but looks like a UUID you'll get a _404_ error.
- Otherwise, Apple Photos will perform a search fo `<query>`, and of the
  results, a random photo will be returned. Results will be limited to
  JPEG and HEIC files (no movies).
- If the search produces no valid results, you'll get a _404_.
- If the search takes too long you'll get a _500_ error. (Try narrowing
  your search terms.) The timeout is configurable and currently (but
  liable to change without being updated here) defaults to 1 second.

## Command-line tools

Several command-line functions to interact with Apple Photos were
created in the implementation of this server. They may be extracted to
their own repository in the future.

## Implementation

There are several different implementations, each with their own branch.
See [branches.md](./branches.md) for more details.

Three are in (somewhat) active development:

- one written in JavaScript using the `bun` runtime.
- one written in `sh` using `tcpserver`
- one written in `JXA`, also using `tcpserver`.

The first two implementations make use of external scripts written in
`JXA` to communicate with Apple Photos. The third incorporates these
functions into a single script that also encapsulates the server powered
by `tcpserver`.
