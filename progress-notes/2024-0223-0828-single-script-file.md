# 2024-02-23 08:28 JXA Monolith

## New things

Everything is now in a single `JXA` file, including the http server and
the http-response handler.

It seems to be working fine.

It no longer bothers to see if there is a cached copy of an image in the
temporary directory, and all temporary directories are immediately
deleted after use. I figure caching can be left up to a reverse-proxy at
some point if I want it.

There are a great deal of `$.system` calls. It might be a fun project to
replace as many as possible with `ObjC` calls, but I'm not sure there is
a point to that beyond its educational value.

## Next steps

### Repository structure

Consider restructuring the repository. The branches might be better-off
spun into their own modules with their own repos. This might be best
practice but seems like a bunch of busywork.

There are directories I've kept parallel with the code repository, two of which deserve thier own repos.

- `assets` contains SVG file used for the server that should be
  saved in their own repository: and SVG library. In the future I might add more
  classic Macintosh icons of the same era as the sad mac one, perhaps starting with [these ones](https://kareprints.com/products/1984-a-z-on-gray). High-resolition raster images of the icons are available in [this CNet article](https://www.cnet.com/pictures/susan-kares-early-mac-icons-gave-computers-a-personality-photos/)
- `JXA` contains experimental scripts which have educational value, and
  which could form the basis for a function library.

##
