#!/bin/sh

# Copies file-structure in SOURCE to the install location defined
# by PREFIX. It does not alter the user's $PATH
export PREFIX="$HOME/.local"

# Source directory is relative to this script
export SOURCE=src

# Change to the directory containing this script
type greadlink >/dev/null 2>&1 || { echo requires greadlink; exit 1;}
cd "$(dirname "$(greadlink -f "$0")")" || exit 1


if test "${1##*-}" == uninstall
then
	find "$SOURCE" -type f -exec sh -c '
		target="$PREFIX${1#$SOURCE}"
		if test -f "$target"
		then
			echo "install.sh: removing file: $target"
			rm -i "$target"
		else
			echo "install.sh: file not installed: $target"
		fi
		' shell {} \;
else
	find "$SOURCE" -type f -exec sh -c '
		mkdir -p "$(dirname "$PREFIX${1#$SOURCE}")"
		cp -n "$1" "$PREFIX${1#$SOURCE}" \
		&& echo "install.sh: installed file: $PREFIX${1#$SOURCE}" \
		|| echo "install.sh: file exists, not overwriting: $PREFIX${1#$SOURCE}"
		' shell {} \;
	echo "install.sh: use '$0 --uninstall' to uninstall these files"
fi
