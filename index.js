var join  = require('path').join;
var spawn = require('child_process').spawn;
var os = require('os');
var path = require('path');
var fs = require("fs");
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;

var IS_DEBUG = false;

var timeControlPath = path.join(os.homedir(), 'Documents', 'time_control.txt');

// Test Screen lock logic
// setInterval(function() {
//   console.log('isScreenLocked', isScreenLocked());
// }, 1000)

var isLocked = isScreenLocked();
console.log("[" + getCurrentDateTime() + "] Starting time control. Screen lock state: " + isLocked);

// Only ask for time or notify of time when the screen is unlocked
if (isLocked === false) {
  if (shouldAskForTime()) {
    askForTime();
  } else if (shouldNotifyOfTime()) {
    notifyOfTime();
  }
}  


function shouldAskForTime() {
  var now = new Date();
  var hour = now.getHours();
  // Check if it is time to ask for time (aka evening)
  var correctHour = hour >= 20 && hour <= 23;
  // var correctHour = true;
  if (!correctHour && !IS_DEBUG) {
    return false;
  }

  // Create file if it doesn't exist
  if (!fs.existsSync(timeControlPath)) {
    fs.writeFileSync(timeControlPath, "");
  }

  // Get last modified date of file
  var stats = fs.statSync(timeControlPath);
  var mtime = new Date(stats.mtime);


  // If file was not modified today, check for contents
  if (mtime.getDate() !== new Date().getDate()) {
    return true
  } else {
    var timeValue = fs.readFileSync(timeControlPath, "utf8");
    return timeValue == "";
  }
}

function askForTime() {
  var script = `tell application "System Events" to display dialog "When do you want to turn off your computer?" with title "Time Control" buttons "OK" with icon 1 default answer "21:55"`;
  run("osascript", ["-e", script], function (data, stdout, stderr) {
    // console.log("data", data, stdout, stderr);
    var regex = /text returned:(.*)/;
    var match = stdout.match(regex);

    if (match) {
      var time = match[1].trim();
      IS_DEBUG && console.log('Found time is: "' + time + '"');
      fs.writeFileSync(timeControlPath, time);
    }
  });

  function run(bin, args, cb) {
    var stdout = "",
      stderr = "";

    var child = spawn(bin, args, {
      detached: true,
    });

    child.stdout.on("data", function (data) {
      stdout += data.toString();
    });

    child.stderr.on("data", function (data) {
      stderr += data.toString();
    });

    child.on("exit", function (code) {
      cb && cb(code, stdout, stderr);
    });
  }
}

function shouldNotifyOfTime() {
  // Get last modified date of file
  var stats = fs.statSync(timeControlPath);
  var mtime = new Date(stats.mtime);
  if (mtime.getDate() === new Date().getDate()) {
    // Only check if file was modified today
    var timeValue = fs.readFileSync(timeControlPath, "utf8");
    if (timeValue != '') {
      var hour = parseInt(timeValue.split(":")[0], 10);
      var minutes = parseInt(timeValue.split(":")[1], 10);
      IS_DEBUG && console.log(
        "Checking if it is time to notify, for: ",
        hour,
        minutes
      );
      var now = new Date();
      var currentHour = now.getHours();
      var currentMinutes = now.getMinutes();
      return (
        currentHour > hour || (currentHour === hour && currentMinutes >= minutes)
      );
    }
  } else {
    return false;
  }
}

function notifyOfTime() {
  // Read file
  var timeValue = fs.readFileSync(timeControlPath, "utf8");

    var script = `tell application "System Events" to display dialog "Your time is out, as you set it to ${timeValue}" with title "Time Control" buttons "OK" with icon 2 giving up after 45`;
    run("osascript", ["-e", script], function (code) {
      console.log('Notified user', code);

      var scriptLock = `
activate application "SystemUIServer"
tell application "System Events"
    tell process "SystemUIServer" to keystroke "q" using {command down, control down}
end tell
      `;
      var isLocked = isScreenLocked();
      if (isLocked === true) {
        console.log('Trying to lock the screen', code);  
        run("osascript", ["-e", scriptLock], function (code) {
          console.log('Locked the screen', code);
        });
      } else if (isLocked === false) {
        console.log('Screen is already locked');
      } else {
        console.log('Unknown screen lock state. Not locking');
      }
    });

    function run(bin, args, cb) {
      var child = spawn(bin, args, {
        detached: true,
      });

      child.on("exit", function (code) {
        cb && cb(code);
      });
    }
}

// function isScreenLockedCb(cb) {
//   // https://www.reddit.com/r/applescript/comments/det3go/check_if_mac_is_awake_before_unlocking_with_ssh/
//   // Script that returns 0 when screen is locked 
//   var screenLockScript = `[ "$(/usr/libexec/PlistBuddy -c "print :IOConsoleUsers:0:CGSSessionScreenIsLocked" /dev/stdin 2>/dev/null <<< "$(ioreg -n Root -d1 -a)")" = "true" ] && echo 0 || echo 1;`;
//   exec(screenLockScript, function(err, stdout, stderr) {
//     if (err) {
//       return null;
//     }
//     // console.log(stdout);
//     if (stdout === '0') {
//       return true;
//     } else {
//       return false;
//     }
//   });
// }

function isScreenLocked(cb) {
  // https://www.reddit.com/r/applescript/comments/det3go/check_if_mac_is_awake_before_unlocking_with_ssh/
  // Script that returns 0 when screen is locked 
  var screenLockScript = `[ "$(/usr/libexec/PlistBuddy -c "print :IOConsoleUsers:0:CGSSessionScreenIsLocked" /dev/stdin 2>/dev/null <<< "$(ioreg -n Root -d1 -a)")" = "true" ] && echo 0 || echo 1;`;
  var isLocked = null;
  try {
    var output = execSync(screenLockScript, {timeout: 5 * 1000}).toString().trim();
    if (output === '0') {
      isLocked = true;
    } else if (output === '1') {
      isLocked = false;
    } else {
      console.log(`Received ${output} when checking for screen status`);
    }
  } catch {
    console.log(`Checking for screen status has thrown`);
  }
  return isLocked;
}



function getCurrentDateTime() {
  var currentdate = new Date();
  return (
    currentdate.getFullYear() +
    "/" +
    (currentdate.getMonth() + 1) +
    "/" +
    +currentdate.getDate() +
    " " +
    currentdate.getHours() +
    ":" +
    currentdate.getMinutes() +
    ":" +
    currentdate.getSeconds()
  );
}
