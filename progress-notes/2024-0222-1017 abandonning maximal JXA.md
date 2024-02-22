# 2024-02-22 10:18:03 Progress Note

## Progress

### Refactoring `photos-find`

This refactoring creates two new commands but does not change the
existing `photos-find` command. The new commands exist next to it.

Refactoring the `find` function in two smaller scripts: one called
`search` that is the smallest wrapper possible around the search call to
Photos.app, and `resolve` which calls `search` and produces the same results,
although often causes a segmentation fault.

A good deal of the functions have also been pulled out into the `utils` library.

- `photos-search` now returns a list of id, without an error for an empty list.
- `photos-resolve` searches by id if the query looks like a uuid,
  otherwise calls `photos-search` then chooses a random response, It
  always either returns a uuid or throws when there are no matches.

## Issues

### Bundled Libraries

This is still an issue, that the libraries cannot be bundled. The
libraries need to be located in `~/Library/Script Libraries/` which
makes the application a pain to install.

## Direction

I think I'll abandon the maximal-JXA implementation. JXA is a pain to
program, and a good deal of the code is functions that wrap shell
commands.

I think I'll go back to a minimal-JXA implementation, where the bulk of
the code is written in a shell, or propper javascript using the bun (or
node) runtime.

This branch has been a good JXA-learning experience, and should help me
refine the small amount of code that actually needs to be written in JXA,
that is, the calls to Photos.app.
