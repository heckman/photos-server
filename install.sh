#!/bin/sh

# Copies file-structure in SOURCE to the install location defined
# by PREFIX. It does not alter the user's $PATH

export PREFIX="$HOME/.local"
export SOURCE=src

if test "${1##-}" == uninstall
then
	find "$SOURCE" -type f -exec sh -c '
		destinaton="$(echo "$1" | sed "s|^$SOURCE|$PREFIX|")"
		rm -i "$destinaton"' shell {} \;
else
	find "$SOURCE" -type f -exec sh -c '
		destinaton="$(echo "$1" | sed "s|^$SOURCE|$PREFIX|")"
		mkdir -p "$(dirname "$destinaton")"
		cp -i "$1" "$destinaton"' shell {} \;
fi
