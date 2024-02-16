# 2024-02-16 Progress Note

## New Implementation Details

- This commit is a rewrite as another `sh` version of the program, this
  time using `tcpserver` from the `ucspi-tcp` package, available vie
  homebrew.
- Comparing of the time taken to download 50 photos specified by id
  using wget:

  - `bun` implementation: _33.887_ seconds
  - `tcpserver` implementation: _75.90_ seconds

  Looking at where the `tcpserver` implementation is taking up the most
  time, there is a noticeable pause when it runs the `JXA` scripts.

  Modifying the code to run external `JXA` files, as the bun
  implementation does, it speed sup significantly: _32.663_ seconds.

  Embedding identical code in the body of the shell script slows it
  right down again, so the issue is with the embedding. I don't understand why.

## To Do

- Extract the `JXA` scripts to external files; use the same ones as in the
  `bun` implementation.

- Extract the server response handler to an external file as well, this will
  leave the server code quite generic, a simple wrapper to `tcpserver`.
