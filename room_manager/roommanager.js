var gamemanager = require('../game_manager/gamemanager');
var dateFormat = require("dateformat");
var database = null;
var io;

exports.initdatabase = function(db) {
    database = db;
};

exports.setsocketio=function (socketio) {
    io = socketio;
};

exports.Check_Rooms = function(socket, data)
{
    console.log('----Check Rooms----');
    console.log(data.seat_limit, data.game_mode, data.wifi_mode, data.stake_money, data.win_money, data.refresh_time, data.refresh_interval);
    //data.seat_limit, data.game_mode, data.wifi_mode, data.stake_money, data.win_money
    var currentTimeStamp = Math.floor(Date.now() / 1000);

    if(data.wifi_mode == "online")
    {
        if ((data.refresh_interval - (currentTimeStamp - data.refresh_time) % data.refresh_interval) <=10) 
        {
            let mydata = {
              result : 'timeout'
            }
            console.log("TIMEOUT==============================");
            socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);
            return;
        }
    }    

    let collection = database.collection('roomdatas');
    collection.find().toArray(function(err, docs){
        if(err){
            console.log(err);
            let mydata = {
                result : 'failed',
            }
            console.log(1);
            socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);
        }
        else{
            if(docs.length > 0){
                // Let's check that wifi_mode is same as game_mode or not.
                let rooms_wifi = [];

                if(data.wifi_mode == "online"){
                    rooms_wifi = docs.filter(function (object) {
                        return ((object.wifi_mode == data.wifi_mode) && (object.game_mode == data.game_mode)
                        && (object.seat_limit == data.seat_limit) && (object.stake_money == data.stake_money)
                        && (object.win_money == data.win_money))
                    });
                }
                else { //jackpot
                    rooms_wifi = docs.filter(function (object) {
                        return ((object.wifi_mode == data.wifi_mode) && (object.game_mode == data.game_mode)
                        && (object.seat_limit == data.seat_limit) && (object.stake_money == data.stake_money)
                        && (object.win_money == data.win_money) && (object.jackpot_id == data.jackpot_id))
                    });
                }
                
                // console.log(rooms_wifi);
                if(rooms_wifi.length > 0)
                {
                    let exitRoomId = -1;
                    for (let index = 0; index < rooms_wifi.length; index++) {
                        if(rooms_wifi[index].status != "full")
                        {
                            exitRoomId = index;
                            break;
                        }
                    }
                    
                    if (exitRoomId == -1){
                        console.log(3);
                        let mydata = {
                            result : 'failed'
                        }
                        socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);     
                    } else {
                        console.log(2);
                        let mydata = {
                            result : 'success',
                            roomID : rooms_wifi[exitRoomId].roomID
                        };
                        console.log("mydata: ", mydata);
                        socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);
                    } 
                }
                else
                {
                    console.log(4);
                    let mydata = {
                        result : 'failed',
                    }
                    socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);                     
                }
            }
            else
            {
                console.log(5);
                let mydata = {
                    result : 'failed',
                }
                socket.emit('REQ_CHECK_ROOMS_RESULT', mydata);        
            }
        }
    });
};

exports.CreateRoom = function(socket, userInfo)
{
    let collection = database.collection('roomdatas');
    //(data.seat_limit, data.game_mode, data.wifi_mode, data.stake_money, data.win_money);
    collection.find().sort({roomID:-1}).limit(1).toArray(function(err, docs) {
        if(err)
            throw err;
        else
        {
            let userdatas = database.collection('userdatas');
            let filter = {userid : userInfo.userid};
            
            userdatas.findOne(filter, function(err, result)
            {
                if(err)
                    console.log(err);
                else
                {
                    if(result == null){
                        console.log('result is null now.... ')
                    }
                    else
                    {
                        if((parseInt(result.points) + parseInt(result.winning_amount)) < parseInt(userInfo.stake_money)){    
                            console.log("---- Failed Create Room, Because not enough money ---- ");                    
                            var mydata = {
                                result : 'failed',
                            };
                            socket.emit('REQ_CREATE_ROOM_RESULT', mydata);
                        }
                        else
                        {
                            let id = 1;
                            if (docs[0])
                                id = docs[0].roomID + 1;
                            let currentTime = new Date().toLocaleString('en-US', {
                               timeZone: 'Asia/Calcutta'
                            });
                            let timel =  dateFormat(currentTime, "dddd mmmm dS yyyy h:MM:ss TT");  
                            let query = {
                                roomID : id,
                                title : userInfo.room_title,
                                creator: userInfo.userid,
                                username : userInfo.username,
                                seat_limit : parseInt(userInfo.seat_limit),
                                status : userInfo.status,
                                jackpot_id : userInfo.jackpot_id,
                                game_mode : userInfo.game_mode,
                                wifi_mode : userInfo.wifi_mode,
                                stake_money : parseInt(userInfo.stake_money),
                                win_money : parseFloat(userInfo.win_money),
                                create_time : timel,
                                refresh_time: userInfo.refresh_time,
                                refresh_interval: userInfo.refresh_interval,
                                start_status: ""
                            };
                            
                            collection.insertOne(query,function(err) {
                                if (err) {
                                    console.log(err);
                                    throw err;
                                }
                                else
                                {
                                    console.log("---- Success Create Room ---- ");                    
                                    var mydata = {
                                        result : 'success',
                                        roomID : id
                                    };
                                    socket.emit('REQ_CREATE_ROOM_RESULT', mydata);
                                    
                                    let tournament_id = '';
                                    if(userInfo.wifi_mode == "online")
                                        tournament_id = userInfo.tournament_id;
                                    gamemanager.addroom(
                                      id, 
                                      userInfo.room_title, 
                                      userInfo.id,                                       
                                      userInfo.username, 
                                      userInfo.tournament_id,
                                      userInfo.jackpot_id,
                                      parseInt(userInfo.seat_limit), 
                                      userInfo.status, 
                                      userInfo.game_mode, 
                                      userInfo.wifi_mode,
                                      userInfo.stake_money, 
                                      userInfo.win_money, 
                                      userInfo.refresh_time,
                                      userInfo.refresh_interval,
                                      socket
                                    );
                                }
                            });
                        }
                    }
                    
                }
            });
        }
    });
}

exports.JoinRoom = function(socket, data)
{
    let userdatas = database.collection('userdatas');
    let filter = {userid : data.userid};
    userdatas.findOne(filter, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            if((parseInt(result.points) + parseInt(result.winning_amount)) < parseInt(data.stake_money)){                        
                var mydata = {
                    result : 'failed',
                };
                socket.emit('REQ_JOIN_ROOM_RESULT', mydata);
            }
            else
            {
                gamemanager.playerenterroom(
                  parseInt(data.roomID),
                  data.userid, 
                  data.jackpot_id,
                  data.username, 
                  data.photo, 
                  socket
                );
            }
        }
    });
}
exports.ReJoinRoom = function(socket, data)
{
    gamemanager.reconnectRoom(parseInt(data.roomid),data.username, data.userid, data.old_socketID, socket);
}
exports.GetRoomInfo = function(socket, data)
{
    let roomid = data.roomID;    
    let roomlist = gamemanager.getroomlist();
    let isThere = false;
    for (let index = 0; index < roomlist.length; index++) {
        if(roomlist[index].roomid == roomid)
        {
            let mydata = {
                seatlimit: roomlist[index].seatlimit,
                gamemode: roomlist[index].game_mode,
                stakemoney: roomlist[index].stake_money,
                winmoney : roomlist[index].win_money
            };
            socket.emit('REQ_ROOM_INFO_RESULT', mydata);
            isThere = true;
            break;
        }
    }
    if(!isThere)
    {
        let mydata = {
            seatlimit: 0,
            stakemoney: "0",
            winmoney : "0"
        };
        socket.emit('REQ_ROOM_INFO_RESULT', mydata);
    }
}
exports.GetRoomList = function()
{
    let roomlist = gamemanager.getroomlist();
    let mydata = '';
    // var collection = database.collection('roomdatas');
    // collection.find().toArray(function(err, docs){
    //     if(err) throw err;
    //     else{
    //         if(docs.length > 0)
    //         {
    //             docs.forEach(element => {
                    
    //             });
    //         }
    //     }
    // });
    for (let i = 0; i < roomlist.length; i++) {
        let currentPlayers = roomlist[i].playerlist.length;
        mydata = mydata + '{' +
            '"roomid":"' + roomlist[i].roomid + '",' +
            '"title":"' + roomlist[i].title + '",' +
            '"seatlimit":"' + roomlist[i].seatlimit + '",' +
            '"type":"' + roomlist[i].type + '",' +
            '"difficulty":"' + roomlist[i].difficulty + '",' +
            '"currentplayers":"' + currentPlayers + '"},';
    }
    mydata=mydata.substring(0,mydata.length-1);
    mydata = '{'
        +'"result" : "success",'
        +'"rooms"  : ['+mydata;
    mydata=mydata+']}';
    //console.log("REQ_ROOM_LIST_RESULT");
    io.sockets.emit('REQ_ROOM_LIST_RESULT', JSON.parse(mydata));

}

exports.GetRoomPlayerAmount = function (socket, data) {
    var stakeMoney = parseInt(data.stake_money);
    var query = { stake_money:stakeMoney};
    let collection = database.collection("roomdatas");
    var playerLength = 0;
    collection.find(query).toArray((err,docs)=>
        {
            console.log("Player Length is " + docs.length);
            playerLength = docs.length;
            let mydata = {
                stakeMoney : data.stake_money,
                playerLength,
              };
          socket.emit("ROOMPLAYER_LENGTH", mydata);
        });
    };

    exports.GetLeaderBoard = function (socket) {
        var mysort = { points: 1 };  
        let collection = database.collection("userdatas");
        collection.find({},{projection: { _id: 0, username: 1 ,winning_amount : 1}}).sort(mysort).toArray((err,docs)=>
        {
            let mydata = 
            {
                result : docs
            }
            socket.emit("GETLEADERBOARD",mydata);
        });
    };

    exports.AddPhoneNumber = function (socket,data) {
       let phoneNumber = data.phone;
       let userName = data.username;

       console.log("PhoneNumber is " , phoneNumber);
       console.log("User Name is",userName);

   
        var query = { username: userName, };
        var newvalues = { $set: {username: userName, userphone: phoneNumber } };

        var collection = database.collection("userdatas");


        collection.updateOne(query, newvalues, function(err, res) {
          if (err) throw err;
          console.log("1 document updated");
        });

    };