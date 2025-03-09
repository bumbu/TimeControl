var join  = require('path').join;
var spawn = require('child_process').spawn;
var os = require('os');
var path = require('path');
var fs = require("fs");

var IS_DEBUG = false;

console.log("[" + getCurrentDateTime() + "] Starting time control");

var timeControlPath = path.join(os.homedir(), 'Documents', 'time_control.txt');

if (shouldAskForTime()) {
  askForTime();
} else if (shouldNotifyOfTime()) {
  notifyOfTime();
}

function shouldAskForTime() {
  // Check if current hour if between 20 and 23
  var now = new Date();
  var hour = now.getHours();
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

    var script = `tell application "System Events" to display dialog "Your time is out, as you set it to ${timeValue}" with title "Time Control" buttons "OK" with icon 2`;
    run("osascript", ["-e", script], function (code) {
      console.log('Notified user', code);
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
