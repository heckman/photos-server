# 2024-02-20 10:55:20 Progress Note

## Doing everything in JXA

It's working, but the code needs some tidying. All of the files in the
`src` directory are compiled into `.scpt` files in `dist`, which is a
symbollic link to the `~/Library/Script Libraries` folder. There is a
very slim entrypoint at `bin/photos` which should be findable on the
system path.

It's not very thoroughly tested.

## Issues

### Libraries

The biggest issue is that I can't get libraries to work inside of a
script bundle (or an Application bundle). I'm following the instructions
that the library script should be in a folder called "Script Libraries"
inside the bundle's Resources folder. I've tried compiling these
libraries as both `.scpt` compiled-script files and `scptd`
compiled-script bundles, but neither have worked.

What does work is putting all the libraries in the `~/Library/Script
Libraries` folder. (These can be `.scpt` files.) This, however, would
make the program the very opposite of portable, which was a goal.

### Timeout

The way the timeout for the photo search routine is implemented, it
needs to be running in a subshell (because the subshell is terminated).
This means the the `find` function can't be called directly from the
main code.
