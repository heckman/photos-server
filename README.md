# photos-server

Serves photos from the
[Apple Photos](https://apps.apple.com/app/photos/id1584215428)
application locally on your Mac.

## Usage

Make a HTTP request to `http://localhost:6330/PHOTO`...

- If `PHOTO` is a valid photo ID in Apple Photos, that photo will be
  returned.
- Otherwise, `PHOTO` will be searched for in Apple Photos and a random
  result will be returned. Results will be limited to JPEG and HEIC
  files (no movies).
- If nothing is found, a _404_ error will be returned along with a
  placeholder image.

## Installation

To install dependencies:

```bash
bun install
```

To start the server:

```bash
bun run index.ts
```

## Implementation

A bash script that listens to a local TCP port with `nc` for a request.
It uses Javascript-for-Automation (JXA) to instruct Apple Photos to
export the requested photo to a temporary directory from which is then
served.

This will export the modified version of the photo, and convert it from
HEIC to JPEG if required. The conversion settings used by Apple Photos
are undocumented.

## Issues

- there is nothing preventing hidden photos from being served if its id
  is specified, but I'm pretty sure that they won't show up in searches

## To Do

- return a random photo if one is not specified (as long as there is
  zero chance that a hidden photo will show up)

---

This project was created using `bun init` in bun v1.0.26. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
