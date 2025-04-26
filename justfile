
agentdir:="$HOME/Library/LaunchAgents/"

update-agent:
  launchctl stop ca.heckman.photos-server || :
  launchctl unload "{{agentdir}}/ca.heckman.photos-server.plist" || :
  cp src/ca.heckman.photos-server.plist "{{agentdir}}"
  chmod 644 "{{agentdir}}/ca.heckman.photos-server.plist"
  launchctl load "{{agentdir}}/ca.heckman.photos-server.plist"
  launchctl start ca.heckman.photos-server
  launchctl list | grep ca.heckman.photos-server

start-agent:
  launchctl start ca.heckman.photos-server

update-handler:
  sudo cp src/photos-http-handler "/usr/local/libexec"
  sudo chmod 755 "/usr/local/libexec/photos-http-handler"

set-loopback:
  sudo /sbin/ifconfig lo0 alias 127.0.63.30 up
