var roomlist = [];
var database = null;
var io;
var dateFormat = require("dateformat");
const { emit } = require('nodemon');
var gamemanager = require('./gamemanager');
var socketlist = [];

exports.initdatabase = function (db) {
    database = db;
};

exports.scan_tournament = function (io) {

  var roomlist = gamemanager.getroomlist();
  if (roomlist.length == 0) {
    return;
  }
  var currentTimeStamp = Math.floor(Date.now() / 1000);
  for(var i = 0; i < roomlist.length; i++) {
    var r_roomID = roomlist[i].roomid;
    var r_refresh_time = roomlist[i].refresh_time;
    var r_refresh_interval = roomlist[i].refresh_interval;

    if (roomlist[i].status == "full" && roomlist[i].start_status == "") {
      if (roomlist[i].wifi_mode != "privateRoom" && roomlist[i].wifi_mode != "jackpot") {
        console.log("Time Rate " + ((currentTimeStamp - r_refresh_time)% 5));

         if (((currentTimeStamp - r_refresh_time)% 5) == 4) {
          let mydata = {
            result: "success"
          }
          console.log("Timer Start=====================================", r_roomID);
          roomlist[i].start_status = "playing";
          io.sockets.in('r' + r_roomID).emit('REQ_ENTER_ROOM_RESULT', mydata);
        }
      }
    }
  }

  // var roomlist = gamemanager.getroomlist();
  // if (roomlist.length == 0) {
  //   return;
  // }
  // var currentTimeStamp = Math.floor(Date.now() / 1000);
  // for(var i = 0; i < roomlist.length; i++) {
  //   var r_roomID = roomlist[i].roomid;
  //   var r_refresh_time = roomlist[i].refresh_time;
  //   var r_refresh_interval = roomlist[i].refresh_interval;

  //   if (roomlist[i].status == "full" && roomlist[i].start_status == "") {
  //     if (roomlist[i].wifi_mode != "privateRoom" && roomlist[i].wifi_mode != "jackpot") {
  //       if ((r_refresh_interval - (currentTimeStamp - r_refresh_time) % r_refresh_interval) == 11) {
  //         let mydata = {
  //           result: "success"
  //         }
  //         console.log("Timer Start=====================================", r_roomID);
  //         roomlist[i].start_status = "playing";
  //         io.sockets.in('r' + r_roomID).emit('REQ_ENTER_ROOM_RESULT', mydata);
  //       }
  //     }
  //   }
  // }
  /*
  let collection = database.collection('tournaments');
  collection.find().toArray(function(err, docs){
    if(err){
      console.log(err);
    } else {
      var currentTimeStamp = Math.floor(Date.now() / 1000);
      var tournament_list = [];
      for(var i =0; i < docs.length; i++) {
        var tournament_interval = docs[i].tournament_interval * 60;
        var created_at = docs[i].created_at;
        var createdTime = Math.floor(Date.parse(created_at) / 1000);
        var data = {
          id: docs[i].id,
          curTime: currentTimeStamp - createdTime,      
          tournament_interval: tournament_interval,
          curTime: (currentTimeStamp - createdTime)% tournament_interval
        }
        tournament_list.push(data);
      }
      //console.log(tournament_list);
      //io.sockets.emit('tournament_proc', tournament_list);  
    }
  });
  */
}
