# 2024-02-15 Progress Note

## New Implementation Details

- Remove all await operators, and instead use the .then/.catch construct
  throughout. I prefer reading the code written in this manner; it feels
  more like functional programming.

## To Do

- Consider using a proper cache rather than the system's temporary
  directory. Caching might be implemented in a reverse-proxy instead.

- Once routing is required, use the [Elysia](https://elysiajs.com/)
  framework. Possible routing servies:

  - Open a particular photo in the Photos.app
  - Check the cache of exported photos
  - Clear the cache of exported photos

- Revisit the bash version of the program using `tcpserver` from the
  `ucspi-tcp` package, available vie homebrew.
