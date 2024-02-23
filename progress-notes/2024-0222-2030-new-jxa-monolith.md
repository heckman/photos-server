# 2024-02-22 20:30:34 New JXA monolith

Rewrote all the Photos.app-interfacing code in a single JXA file.

Eventually I will move the server control and http responder to the JXA
file as well. These two services will be primarily written in `sh`
invoked from calls to `$.system`.

As of now, these two services are in the shell script called `photos-server`.
