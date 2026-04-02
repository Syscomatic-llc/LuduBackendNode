var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var clientsocket = require('./sockets/clientsocket');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tournament = require('./game_manager/tournament');
var loginmanager = require('./room_manager/loginmanager');

var app = express();
var server = require('http').createServer(app);
// var io = require('socket.io')(server, {'pingInterval': 500, 'pingTimeout': 25000,'rememberTransport': false,
//     'reconnect': false,
//     'secure': true});
var io = require('socket.io')(server,
  {
    transports: ['websocket'],
    allowUpgrades: false,
    pingInterval: 25000, // 25 seconds
    pingTimeout: 60000, // 1 minute
  });
console.log("check...");
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
//app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use(express.static(path.join(__dirname, 'delux')));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

clientsocket.initdatabase();
io.on('connect', function(socket) {
  console.log("- One socket connected : ", socket.id);
  clientsocket.initsocket(socket,io);

});

var WinnerCountdown = setInterval(function(){
  tournament.scan_tournament(io);

  var currentHours = new Date().getHours();
  var currentMinute = new Date().getMinutes();
  var currentSeconds = new Date().getSeconds();
  // console.log('-------------- Jackpot Time Checked -------------', currentHours, currentMinute, currentSeconds);
  if(currentHours == 11 && currentMinute == 40 && currentSeconds == 59)
  {
    
    loginmanager.GetJackpotWinners(io);
  }
    
}, 1000);

module.exports = {app: app, server: server};
