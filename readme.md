# TimeControl
Helps control time at computer in the evening.
In the evening (8-10pm) will propmpt the user for a time when they want to shut down the computer.
Then if the computer is still running at that time, it will display an alert every minute

# TODO
* Display some random motivational quotes on each alert (or come kitten pictures)

# Commands


## Setup
Copy plist into `~/Library/LaunchAgents/me.bumbu.TimeControl.plist`
```
launchctl load ~/Library/LaunchAgents/me.bumbu.TimeControl.plist
launchctl start me.bumbu.TimeControl
```

## Stopping
```
launchctl unload me.bumbu.TimeControl.plist
or
launchctl bootout gui/501/me.bumbu.TimeControl
```

## Logs
* Either should be in the files I indicated
* Or should go into `launchctl log`
