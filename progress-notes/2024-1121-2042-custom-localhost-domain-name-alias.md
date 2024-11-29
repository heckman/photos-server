# 2024-11-21 20:42:21 Custom localhost domain name alias

Attempt to change the server to listen on `photos` domain
instead of `localhost:6030`.

## Process

### Enable `localhost` alias

The range `127.X.X.X` is reserved for localhost aliases,
but on macOS only `127.0.0.1` is enabled,
so the following is necessary:

```shell
sudo ifconfig lo0 alias 127.0.63.30 up
```

Testing show it works: The `http` response is identical to `localhost`.

### Add `photos` domain name

In `etc/hosts`, add the line:

```plain-text
127.0.63.30     photos
```

### Update the launch agent

In `~/Library/LaunchAgents/ca.heckman.photos-server.plist`,
change server to listen on ` 127.0.63.30`, port `80`.

Update and restart the launch agent.

Tesing shows that I can now get a random image of a raven
at `http://photos/raven`

### Persistence

Made a new launch agent to initialize the domain alias on startup.
Leaving out `sudo` in the launch agent
where it calls `/sbin/ifconfig`.
I will restart later to see it if works.

## References

- [man page launchd.plist section 5](https://www.manpagez.com/man/5/launchd.plist/)
- [in macos, can i map a custom url scheme to a local socket](https://www.perplexity.ai/search/in-macos-can-i-map-a-custom-ur-OpAsEielR1WUZ6EnGejTfw)
- [Alias a domain to a local port (Mac)](https://gist.github.com/exupero/3228103)
- [macos - How do you get loopback addresses other than 127.0.0.1 to work on OS X - Super User](https://superuser.com/questions/458875/how-do-you-get-loopback-addresses-other-than-127-0-0-1-to-work-on-os-x)
- [macos - launchd seemingly ignores SockNodeName - Ask Different](https://apple.stackexchange.com/questions/443497/launchd-seemingly-ignores-socknodename)
- [Permanently create an ifconfig loopback alias — macOS | by David limkys | Medium](https://medium.com/@david.limkys/permanently-create-an-ifconfig-loopback-alias-macos-b7c93a8b0db)
- [Permanently create an ifconfig loopback alias — macOS | by David limkys | Medium](https://medium.com/@david.limkys/permanently-create-an-ifconfig-loopback-alias-macos-b7c93a8b0db)
