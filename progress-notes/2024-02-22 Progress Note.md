# 2024-02-22 13:50:37 Progress Note

## Switched to Node+Express

I've switched over to Node+Express, because my intention is to use the `nodeautomation` package to directly access Apple Photos, without having to call external JXA scripts,
and `bun` is having difficulty with some `napi` dependencies.

Having made the switch, typical image responses (for ravens) wer taking about 3.5 seconds, which seemed long. Switching back to the bun branch I have confirmed that the typical response time hovered around 900 ms, and was rarely more than 1 second.

It might help if I used something slimmer than `express`. Perhaps I'll give [`fastify`](https://github.com/fastify/fastify) a try...
