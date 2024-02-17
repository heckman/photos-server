# 2024-02-15 Progress Note

## To Do

- Figure out a way to delete temporary files after they are sent via the
  http response. This will be especially relevant if a reverse-proxy is
  being used to cache the photos.

- Consider using a proper cache rather than the system's temporary
  directory. Caching might be implemented in a reverse-proxy instead.

- Once routing is required, use the [Elysia](https://elysiajs.com/)
  framework. Possible routing servies:

  - Open a particular photo in the Photos.app
  - Check the cache of exported photos
  - Clear the cache of exported photos
