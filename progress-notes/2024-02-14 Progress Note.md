# 2024-02-14 Progress Note

## New Implementation Details

- Using asynchronous functions, mostly with await, but
  in the primary request function, the .then construct.

## Issues

### Resolved

- No more segmentation faults,
  probably on account of asynchronous implementation.

## To Do

- Once routing is required, use the [Elysia](https://elysiajs.com/)
  framework. This will be useful to provide services
  other than retrieving photos. A good first service
  would be to open the Photos.app with a specified photo.
