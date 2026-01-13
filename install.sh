#!/bin/sh

# DOES NOT LOAD/UNLOAD THE LAUNCH AGENT !!!
# that must be done manually with one of:
#   launchctl load ~/Library/LaunchAgents/ca.heckman.photos-server.plist
#   launchctl unload ~/Library/LaunchAgents/ca.heckman.photos-server.plist


export PREFIX="/usr/local"
export PREFIX_REQUIRES_ROOT=true
export LIBRARY="$HOME/Library"

main(){
	if test "${1}" == '--uninstall' || test "${2}" == '--uninstall';
	then uninstall "$@"
	else install "$@"
	fi
}

install(){
	if test "${1}" == '--force'; then cp_opt=""; else cp_opt="-n"; fi
	install_file src/ca.heckman.photos-server.plist "$LIBRARY/LaunchAgents"
	install_file src/photos-cli "$PREFIX/bin" $PREFIX_REQUIRES_ROOT
	install_file src/photos-http-handler "$PREFIX/libexec" $PREFIX_REQUIRES_ROOT
	echo "Optionally edit manually various files in /etc/ for a pretty host name"
}

uninstall(){
	if test "${1}" == '--force' || test "${2}" == '--force'
	then rm_opt=""
	else rm_opt="-i"
	fi
	uninstall_file "$LIBRARY/LaunchAgents/ca.heckman.photos-server.plist"
	uninstall_file "$PREFIX/bin/photos-cli" $PREFIX_REQUIRES_ROOT
	uninstall_file "$PREFIX/libexec/photos-http-handler" $PREFIX_REQUIRES_ROOT
	echo "This does not remove any changes made manuall to files in /etc/"
}

# Change to the directory containing this script
type greadlink >/dev/null 2>&1 || { echo requires greadlink; exit 1;}
cd "$(dirname "$(greadlink -f "$0")")" || exit 1

install_file(){
	source="$1"
	destination_directory="$2"
	as_root="${3:-false}"
	$as_root && sudo_cmd="sudo" || sudo_cmd=""
	mkdir -p -- "$destination_directory"
	if $sudo_cmd cp $cp_opt -- "$source" "$destination_directory"
	then
		echo "install.sh: installed file: $destination_directory/$(basename "$source")"
		return 0
	else
		echo "install.sh: file exists, not overwriting: $destination_directory/$(basename "$source")"
		return 1
	fi
}

uninstall_file(){
	target="$1"
	as_root="${2:-false}"
	$as_root && sudo_cmd="sudo" || sudo_cmd=""
	if test -f "$target"
	then
		echo "install.sh: removing file: $target"
		$sudo_cmd rm $rm_opt -- "$target"
	else
		echo "install.sh: file not installed: $target"
	fi
}

main "$@"
