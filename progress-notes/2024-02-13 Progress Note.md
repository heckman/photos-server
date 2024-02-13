# 2024-02-13 Progress Note

## New Features

- A watchdog timer in the `get-photo-id` JXA utility
  - aborts overly-broad Photos.app searches
  - launches a background subprocess which after a delay
    kills the `osascript` process

## Issues

- Server hitting occasional segmentation faults
  - possibly caused by the killer `get-photo-id` subprocesses?

## To Do

- Make use of asynchronous functions and the .then construct.
- Once routing is required, use the [Elysia](https://elysiajs.com/)
  framework.
