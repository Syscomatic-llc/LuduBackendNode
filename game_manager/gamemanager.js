var roomlist = [];
var database = null;
var io;
var roommanager = require('../room_manager/roommanager');
var dateFormat = require("dateformat");
const { emit } = require('nodemon');
var socketlist = [];

exports.initdatabase = function (db) {
    database = db;
    setTimeout(() => {
        let collection = database.collection('userdatas');
        collection.find().toArray(function (err, docs) {
            if (!err) {
                if (docs.length > 0) {
                    for (let i = 0; i < docs.length; i++) {
                        const element = docs[i];

                        let query = { userid: element.userid };
                        collection.updateOne(query, {
                            $set: {
                                connect: ""
                            }
                        }, function (err) {
                            if (err) throw err;
                        });
                    }
                }
            }
        });

    }, 3000);
};
exports.addsocket = function (id) {
    socketlist.push(id);
}
exports.setsocketio = function (socketio) {
    io = socketio;
};

exports.getroomlist = function () {
    return roomlist;
}

exports.getroom = function (r_roomID) {
    let roominfo = null;
    for (i = 0; i < roomlist.length; i++) {
        if (roomlist[i].roomid == r_roomID) {
            roominfo = roomlist[i];
            break;
        }
    }
    return roominfo;
}

exports.addroom = function (r_roomID, r_title, r_creator, r_username, r_tournament_id, r_jackpot_id, r_seatlimit, r_status, r_game_mode, r_wifi_mode, r_stake_money, r_win_money, r_refresh_time, r_refresh_interval, socket) {
    let inputplayerlist = [];
    let inputnamelist = [];
    let playerphotos = [];
    let earnScore = [];
    let diceHistory = [];
    let gameobject = {
        roomid: r_roomID,
        title: r_title,
        creator: r_creator,
        username: r_username,
        tournament_id: r_tournament_id,
        seatlimit: parseInt(r_seatlimit),
        status: r_status,
        game_mode: r_game_mode,
        wifi_mode: r_wifi_mode,
        stake_money: r_stake_money,
        win_money: r_win_money,
        playerlist: inputplayerlist,
        namelist: inputnamelist,
        playerphotos: playerphotos,
        earnScores: earnScore,
        dice: 1,
        turnuser: '',
        diceHistory: diceHistory,
        turncount: [],
        refresh_time: r_refresh_time,
        refresh_interval: r_refresh_interval,
        start_status: "",
        jackpot_id: r_jackpot_id,
        move_history: {
            status: '',
            mover: '',
            path: ''
        },
    }
    roomlist.push(gameobject);
}

exports.GetRoomPassedTime = function (socket, data) {
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == data.roomid) {
            roomlist[index].passedtime = parseFloat(data.passedtime);
        }
    }
}
exports.playerenterroom = function (roomid, userid, jackpot_id, username, photo, socket) {
    socket.room = 'r' + roomid;
    socket.userid = userid;
    //socket.nickname = username;
    console.log("----- player joined in room No: " + socket + " ------");
    socket.join('r' + roomid);

    if (roomlist.length > 0) {
        var sum_players = 0;
        for (let index = 0; index < roomlist.length; index++) {
            if (roomlist[index].roomid == roomid) {
                if (roomlist[index].wifi_mode == "jackpot") {
                    if (jackpot_id != roomlist[index].jackpot_id)
                        return;
                }

                for (let i = 0; i < roomlist[index].playerlist.length; i++) {
                    let id = roomlist[index].playerlist[i].userid;
                    if (id == userid) {
                        let mydata = {
                            result: "failed"
                        }
                        console.log('--- userid ' + userid + ' joined already in room ---');
                        socket.emit('REQ_ENTER_ROOM_RESULT', mydata);
                        return;
                    }
                }

                roomlist[index].playerlist.push({ userid: userid, isIgnored: false, moved: "", statics: "", completed: "", timechance: "0" });
                roomlist[index].namelist.push(username);
                roomlist[index].playerphotos.push(photo);
                roomlist[index].earnScores.push(0);

                exports.GetUserListInRoom(roomid);

                if (roomlist[index].playerlist.length == roomlist[index].seatlimit) {
                    // start game
                    roomlist[index].turnuser = userid;
                    console.log('----- GameRoom is full players');
                    let mydata = {
                        result: "success"
                    }
                    if (roomlist[index].wifi_mode == "privateRoom") {
                        console.log('-------Private Room Start--------');
                        io.sockets.in('r' + roomid).emit('REQ_ENTER_ROOM_RESULT', mydata);
                    }
                    if (roomlist[index].wifi_mode == "jackpot") {
                        console.log('-------Jackpot Room Start --------');
                        io.sockets.in('r' + roomid).emit('REQ_ENTER_ROOM_RESULT', mydata);
                    }

                    roomlist[index].status = "full";
                    UpdateRoomStatus(roomid);
                }
            }
        }
    }

    // roommanager.GetRoomList();
}
exports.reconnectRoom = function (roomid, username, userid, old_socketID, socket) {

    let roomindex = 0;
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            roomindex = index;
        }
    }
    if (roomlist[roomindex] == null) return;
    let ischeck = roomlist[roomindex].playerlist.filter(function (object) {
        return (object.userid == userid)
    });

    if (ischeck.length == 0) {
        let emitdata = {
            message: "exitUser"
        }
        socket.emit('EXIT_GAME', emitdata);
        console.log("You already got disconnection");
    }
    else {
        socketlist.splice(socketlist.indexOf(old_socketID), 1);
        //console.log("reconn", roomid, username);
        socket.room = 'r' + roomid;
        socket.userid = userid;
        socket.username = username;
        socket.join('r' + roomid);
        let emit_data = {
            roomid: roomid,
            reconnecter: userid,
            status: roomlist[roomindex].move_history.status,
            mover: roomlist[roomindex].move_history.mover,
            path: roomlist[roomindex].move_history.path
        }
        io.sockets.in('r' + roomid).emit('RECONNECT_RESULT', emit_data);
    }
}
exports.GetUserListInRoom = function (roomid) {
    let roomindex = 0;
    let mydata = '';
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            roomindex = index;
        }
    }
    for (let i = 0; i < roomlist[roomindex].namelist.length; i++) {
        mydata = mydata + '{' +
            '"userid":"' + roomlist[roomindex].playerlist[i].userid + '",' +
            '"username":"' + roomlist[roomindex].namelist[i] + '",' +
            '"photo":"' + roomlist[roomindex].playerphotos[i] + '",' +
            '"points":"' + 0 + '",' +
            '"level":"' + 0 + '"},';
    }
    mydata = mydata.substring(0, mydata.length - 1);
    mydata = '{' +
        '"result":"success",' +
        '"roomid":"' + roomid + '",' +
        '"userlist": [' + mydata;
    mydata = mydata + ']}';
    //console.log('---REQ_USERLIST_ROOM_RESULT---  ', JSON.parse(mydata));
    console.log("roomid ====== ", roomid);
    io.sockets.in('r' + roomid).emit('REQ_USERLIST_ROOM_RESULT', JSON.parse(mydata));
}
exports.AddHistory = function (data) {
    let collection = database.collection('gamehistorys');
   // let currentDate = new Date();
    let currentDate = new Date().toLocaleString('en-US', {
       timeZone: 'Asia/Calcutta'
    });
    let currentTime = dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");
    let query = {
        userid: data.userid,
        username: data.username,
        creater: data.creater,
        seat_limit: data.seat_limit,
        type: "Gameplay",
        game_mode: data.gamemode,
        stake_money: data.stake_money,
        game_status: data.game_status,
        win_money: data.win_money,
        playing_time: currentTime,
        tournament_id: data.tournament_id,
        created_at:currentDate,
    };

      collection.insertOne(query, function (err) {
        if (!err) {
            console.log("history info added");
            
        }else{
            console.log("history info not added");
        }
    });

    // collection.insertOne(query, function (err) {
    //     if (!err) {
    //         transactions.insertOne(query, function (err){
    //             if (!err) {
    //                 console.log("history info added");
    //             }else{
    //                 console.log("history info not added");
    //             }
    //         });
            
    //     }else{
    //         console.log("history info not added");
    //     }
    // });
}



function GetThisWeek() {
    let curr = new Date
    let week = []

    for (let i = 1; i <= 7; i++) {
        let first = curr.getDate() - curr.getDay() + i
        let day = new Date(curr.setDate(first)).toISOString().slice(0, 10)
        week.push(day)
        //console.log('*** ', day);
    }
    return week;
}

function msToTime(duration) {
    let milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    _hours = (hours < 10) ? "0" + hours : hours;
    _minutes = (minutes < 10) ? "0" + minutes : minutes;
    _seconds = (seconds < 10) ? "0" + seconds : seconds;
    console.log("Spin Remaining: ", _hours + ":" + _minutes + ":" + _seconds + "." + milliseconds);
    let datajson = {
        result: "remaining",
        hours: hours,
        minutes: minutes,
        seconds: seconds
    }
    return datajson;
}

exports.SetPawnData = function (socket, data) {
    console.log("Setting Pawn Data");
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == data.roomid) {
            let userid = data.userid;
            for (let j = 0; j < roomlist[index].playerlist.length; j++) {
                if (data.pawns_moved != undefined) {
                    const element = roomlist[index].playerlist[j];
                    if (element.userid == userid) {
                        roomlist[index].playerlist[j].moved = data.pawns_moved;
                        // element.statics = data.pawns_statics;
                        // element.completed = data.pawns_completed;
                        console.log("Pawn data is ",element);
                        if (data.myTimechance == "") { element.timechance = "0" }
                        else {
                            if (parseInt(element.timechance) < parseInt(data.myTimechance))
                                element.timechance = data.myTimechance;
                        }

                    }
                }
            }
            break;
        }
    }
}

exports.GetTurnUser = function (socket, data) {
    console.log("ASK TURN USER");
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == data.roomid) {
            let username = data.username;
            let userid = data.userid;
            let turn_user = data.turnuser != undefined ? data.turnuser : 0;
            for (let j = 0; j < roomlist[index].playerlist.length; j++) {
                if (data.pawns_moved != undefined) {
                    const element = roomlist[index].playerlist[j];
                    if (element.userid == userid) {
                        element.moved = data.pawns_moved;
                        // element.statics = data.pawns_statics;
                        // element.completed = data.pawns_completed;
                        console.log(data.myTimechance);
                        if (data.myTimechance == "") { element.timechance = "0" }
                        else {
                            if (parseInt(element.timechance) < parseInt(data.myTimechance))
                                element.timechance = data.myTimechance;
                        }

                    }
                }
                if (data.pawns_turn_moved != undefined) {
                    const element = roomlist[index].playerlist[j];
                    if (element.userid == turn_user) {
                        element.moved = data.pawns_turn_moved;
                        // element.statics = data.pawns_turn_statics;
                        // element.completed = data.pawns_turn_completed;
                        if (data.turnuserTimechance == "") { element.timechance = "0" }
                        else {
                            if (parseInt(element.timechance) < parseInt(data.turnuserTimechance))
                                element.timechance = data.turnuserTimechance;
                        }
                    }
                }
            }
            // console.log(username);
            let ischeck = roomlist[index].turncount.filter(function (object) {
                return (object == userid)
            });
            // console.log("ischeck: ", ischeck);
            if (ischeck.length == 0)
                roomlist[index].turncount.push(userid);
            // console.log('roomlist[index].turncount : ', roomlist[index].turncount);
            let takenUsers = roomlist[index].playerlist.filter(p => p.isIgnored == false);
            if (roomlist[index].turncount.length == roomlist[index].seatlimit || roomlist[index].turncount.length == takenUsers.length) 
            {
                roomlist[index].dice = parseInt(data.dice);
                console.log("Decide Turn");
                SetTurn(index, data.roomid,data.repeatTurn,data.finalPath);
            }
            break;
        }
    }
}

var sixCount = 0;

function SetTurn(index, roomid,repeatTurn =false,finalPath =false) {

    console.log("Repeat Turn is", repeatTurn);
    console.log("Final Path is ",finalPath);

    let ignoredUsers = roomlist[index].playerlist.filter(p => p.isIgnored == true).length;

    if ((roomlist[index].dice < 6 && repeatTurn == "false") || finalPath == "true") {
        let turnuser = roomlist[index].turnuser;
        let takenUsers = roomlist[index].playerlist;//.filter(p => p.isIgnored == false);

        for (let i = 0; i < takenUsers.length; i++) {
            if (takenUsers[i].userid == turnuser) {
                isFounded = true;
                if (i == takenUsers.length - 1) {
                    i = 0;
                }
                else {
                    i++;
                }
                turnuser = takenUsers[i].userid;
                roomlist[index].turnuser = turnuser;
            }
        }
        //  for (let i = 0; i < roomlist[index].playerlist.length; i++) {
        //     if (roomlist[index].playerlist[i].userid == turnuser) {
        //         while (true) {                    
        //             if (i == roomlist[index].playerlist.length - 1) {
        //                 i = 0;
        //             }
        //             else {
        //                 i++;
        //             }
        //             if(roomlist[index].playerlist[i].isIgnored == false)
        //             {
        //                 turnuser = roomlist[index].playerlist[i].userid;
        //                 roomlist[index].turnuser = turnuser;
        //                 break;
        //             } 
        //         }                
        //         break;
        //     }
        // }
    }
    setTimeout(() => {
        if (roomlist[index].playerlist == null) return;
        let takenUsers = roomlist[index].playerlist;//.filter(p => p.isIgnored == false);
        if (takenUsers.length > 0) {
            let value = randomNum(1, 6);

            if(ignoredUsers  > 0)
            {
                value = randomNum(1,5);
            }

            if (value == 6)
                sixCount++;
            else
                sixCount = 0;

            // console.log('sixCount --> ', sixCount);

            if (sixCount == 3) {
                value = randomNum(1, 5);
                sixCount = 0;
            }


            // console.log('diceValue --> ', value);

            roomlist[index].dice = value;
            let mydata = '';
            for (let i = 0; i < roomlist[index].playerlist.length; i++) {
                mydata = mydata + '{' +
                    '"userid":"' + roomlist[index].playerlist[i].userid + '",' +
                    '"isIgnored":"' + roomlist[index].playerlist[i].isIgnored + '",' +
                    '"timechance":"' + roomlist[index].playerlist[i].timechance + '",' +
                    '"moved":"' + roomlist[index].playerlist[i].moved + '"},';
                    // '"statics":"' + roomlist[index].playerlist[i].statics + '",' +
                    // '"completed":"' + roomlist[index].playerlist[i].completed + '"},';
            }
            mydata = mydata.substring(0, mydata.length - 1);
            mydata = '{' +
                '"turnuser":"' + roomlist[index].turnuser + '",' +
                '"dice":"' + roomlist[index].dice + '",' +
                '"allusers": [' + mydata;
            mydata = mydata + ']}';
            console.log(mydata)
            // let turndata = {
            //     turnuser: roomlist[index].turnuser,
            //     dice: roomlist[index].dice,
            //     allusers : roomlist[index].playerlist
            // }
            roomlist[index].turncount = [];
            //io.sockets.in('r' + roomid).emit('REQ_TURNUSER_RESULT', turndata);
            //console.log('TURN_DATA : ', turndata);
            setTimeout(() => {

                lastTurnTime = new Date();
                io.sockets.in('r' + roomid).emit('REQ_TURNUSER_RESULT', JSON.parse(mydata));
            },100);
        }
    }, 100);
}

// function SetTurn(index, roomid,repeatTurn =false,finalPath =false) {

//     console.log("Repeat Turn is", repeatTurn);
//     console.log("Final Path is ",finalPath);

//     if ((roomlist[index].dice < 6 && repeatTurn == "false") || finalPath == "true") {
//         let turnuser = roomlist[index].turnuser;
//         let takenUsers = roomlist[index].playerlist;//.filter(p => p.isIgnored == false);

//         for (let i = 0; i < takenUsers.length; i++) {
//             if (takenUsers[i].userid == turnuser) {
//                 isFounded = true;
//                 if (i == takenUsers.length - 1) {
//                     i = 0;
//                 }
//                 else {
//                     i++;
//                 }
//                 turnuser = takenUsers[i].userid;
//                 roomlist[index].turnuser = turnuser;
//             }
//         }
//         //  for (let i = 0; i < roomlist[index].playerlist.length; i++) {
//         //     if (roomlist[index].playerlist[i].userid == turnuser) {
//         //         while (true) {                    
//         //             if (i == roomlist[index].playerlist.length - 1) {
//         //                 i = 0;
//         //             }
//         //             else {
//         //                 i++;
//         //             }
//         //             if(roomlist[index].playerlist[i].isIgnored == false)
//         //             {
//         //                 turnuser = roomlist[index].playerlist[i].userid;
//         //                 roomlist[index].turnuser = turnuser;
//         //                 break;
//         //             } 
//         //         }                
//         //         break;
//         //     }
//         // }
//     }
//     setTimeout(() => {
//         if (roomlist[index].playerlist == null) return;
//         let takenUsers = roomlist[index].playerlist;//.filter(p => p.isIgnored == false);
//         if (takenUsers.length > 0) {
//             let value = randomNum(1, 6);

//             if (value == 6)
//                 sixCount++;
//             else
//                 sixCount = 0;

//             // console.log('sixCount --> ', sixCount);

//             if (sixCount == 3) {
//                 value = randomNum(1, 5);
//                 sixCount = 0;
//             }

//             // console.log('diceValue --> ', value);

//             roomlist[index].dice = value;
//             let mydata = '';
//             for (let i = 0; i < roomlist[index].playerlist.length; i++) {
//                 mydata = mydata + '{' +
//                     '"userid":"' + roomlist[index].playerlist[i].userid + '",' +
//                     '"isIgnored":"' + roomlist[index].playerlist[i].isIgnored + '",' +
//                     '"timechance":"' + roomlist[index].playerlist[i].timechance + '",' +
//                     '"moved":"' + roomlist[index].playerlist[i].moved + '"},';
//                     // '"statics":"' + roomlist[index].playerlist[i].statics + '",' +
//                     // '"completed":"' + roomlist[index].playerlist[i].completed + '"},';
//             }
//             mydata = mydata.substring(0, mydata.length - 1);
//             mydata = '{' +
//                 '"turnuser":"' + roomlist[index].turnuser + '",' +
//                 '"dice":"' + roomlist[index].dice + '",' +
//                 '"allusers": [' + mydata;
//             mydata = mydata + ']}';
//             console.log(mydata)
//             // let turndata = {
//             //     turnuser: roomlist[index].turnuser,
//             //     dice: roomlist[index].dice,
//             //     allusers : roomlist[index].playerlist
//             // }
//             roomlist[index].turncount = [];
//             //io.sockets.in('r' + roomid).emit('REQ_TURNUSER_RESULT', turndata);
//             //console.log('TURN_DATA : ', turndata);
//             setTimeout(() => {

//                 lastTurnTime = new Date();
//                 io.sockets.in('r' + roomid).emit('REQ_TURNUSER_RESULT', JSON.parse(mydata));
//             },100);
//         }
//     }, 100);
// }

function UpdateRoomStatus(roomid) {
    var collection = database.collection('roomdatas');
    var query = {
        roomID: roomid
    };

    collection.findOne(query, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            collection.updateOne(query, {
                $set: {
                    status: "full"
                }
            }, function (err) {
                if (err) throw err;
            });
        }
    });
}

function randomNum(min, max) {
    var random = Math.floor((Math.random() * (max - min + 1)) + min);
    return random;
}

exports.ChatMessage = function (socket, data) {
 
    var mydata = {
        result: "success",
        username: data.username,
        message: data.message
    };

    console.log("socket emitted from front end",mydata, " room id : ", data);
    //socket.in('r' + data.roomid).emit('REQ_CHAT_RESULT', mydata); 
    //io.sockets.in('r' + data.roomid).emit('REQ_CHAT_RESULT', mydata);
    setTimeout(() => {
        io.sockets.in('r' + data.roomid).emit('REQ_CHAT_RESULT', mydata);
    }, 400);
};

exports.Roll_Dice = function (socket, data) {

    setTimeout(()=>{
        var roomid = data.roomid;
        for (let index = 0; index < roomlist.length; index++) {
            if (roomlist[index].roomid == roomid) {
                if (roomlist[index].dice == data.dice || true) {
                    var mydata = {
                        roller: data.roller,
                        dice: data.dice
                    };
                    //console.log("REQ_ROLL_DICE_RESULT", roomid, data.roller, data.dice);
                    socket.in('r' + roomid).emit('REQ_ROLL_DICE_RESULT', mydata);
                    break;
                } else {
                    console.log(data.roller, 'is Hacker');
                }
            }
        }
    },250);

};
exports.Move_Token = function (socket, data) {
    var roomid = data.roomid;
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            var mydata = {
                status: data.status,
                mover: data.mover,
                path: data.path
            };
            roomlist[index].move_history.status = data.status;
            roomlist[index].move_history.mover = data.mover;
            roomlist[index].move_history.path = data.path;
            socket.in('r' + roomid).emit('REQ_MOVE_TOKEN_RESULT', mydata);
            console.log(roomlist[index].move_history);
            break;
        }
    }
};

exports.SendTimeUpSocket = function (socket, data) {
    var roomid = data.roomid;
    var userid = data.userid;
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            console.log('--------- REQ_TIME_UP_RESULT ---------');
            var mydata = { userid: data.userid }
            socket.in('r' + roomid).emit('REQ_TIME_UP_RESULT', mydata);
            break;
        }
    }
};

exports.Set_Auto = function (socket, data) {
    let roomid = data.roomid;
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            var mydata = {
                user: data.user,
                auto: data.auto
            };
            socket.in('r' + roomid).emit('REQ_AUTO_RESULT', mydata);
            break;
        }
    }
};
exports.LeaveRoom = function (socket, data) {
    let mydata = {
        result: "success",
        username: data.username,
        userid: data.userid,
        message: "user has left the room"
    };

    io.sockets.in('r' + data.roomid).emit('REQ_LEAVE_ROOM_RESULT', mydata);
    // socket.in('r' + data.roomid).emit('REQ_LEAVE_ROOM_RESULT', mydata);
    socket.leave('r' + data.roomid);
    console.log(data.userid, "has ", data.roomid, "room exit");

    if (roomlist.length > 0) {
        let removeindex = null;
        for (let index = 0; index < roomlist.length; index++) {
            if (roomlist[index].roomid == data.roomid) {
                let num;
                let isExist = false;
                for (let i = 0; i < roomlist[index].playerlist.length; i++) {
                    if (roomlist[index].playerlist[i].userid == data.userid) {
                        isExist = true;
                        num = i
                        break;
                    }
                }
                if (isExist == true) {

                    roomlist[index].seatlimit--;
                    //console.log('seatlimit : ', roomlist[index].seatlimit);

                    if (roomlist[index].turnuser == data.userid) {
                        console.log('is changing turn');
                        SetTurn(index, data.roomid);
                    }

                    setTimeout(() => {
                        if (roomlist[index] != undefined) {
                            roomlist[index].playerlist.splice(num, 1);
                            roomlist[index].playerphotos.splice(num, 1);
                            roomlist[index].namelist.splice(num, 1);
                            roomlist[index].earnScores.splice(num, 1);

                            //exports.GetUserListInRoom(data.roomid);
                            if (roomlist[index].playerlist.length == 0) {
                                removeindex = index;
                                if (removeindex != null) {
                                    roomlist.splice(removeindex, 1);
                                    let query = {
                                        roomID: parseInt(data.roomid)
                                    }
                                    let collection = database.collection('roomdatas');
                                    collection.deleteOne(query, function (err, removed) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log('roomID:' + data.roomid + ' has removed successfully!');
                                        }
                                    });
                                    //roommanager.GetRoomList();
                                }
                            } else if (roomlist[index].playerlist.length == 1) {
                                console.log("STOP! Everyone not me outsided~");
                                io.sockets.in('r' + data.roomid).emit('GAME_END', { outerid: data.userid });
                            }
                        }
                    }, 1000);
                }
            }
        }
    }
}
exports.RemoveRoom = function (socket, data) {
    console.log("Remove Force Room", data.roomid);
    let removeindex;
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == data.roomid) {
            removeindex = index;
            roomlist.splice(removeindex, 1);
            let query = {
                roomID: parseInt(data.roomid)
            };
            let collection = database.collection('roomdatas');
            collection.deleteOne(query, function (err, removed) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(data.roomid, 'room has removed successfully!');
                }
            });
        }
    }
}

exports.OnDisconnect = function (socket) {
    console.log("---- Disconnect -----", socket.room, socket.userid, socket.id);
    //let collection = database.collection('userdatas');
    let userdatas = database.collection('userdatas');
    userdatas.updateOne({ connect: socket.id }, {
        $set: {
            status: 0,
            login_status: '0'
        }
    }, function (err) {
        if (err) throw err;
    });
    let websettings = database.collection('websettings');
    websettings.findOne({}, function (err, result) {
        let webdata;
        if (err)
            console.log(err);
        if (result != null) {
            if (parseInt(result.activeplayer) > 0) {
                websettings.updateOne({}, { $set: { activeplayer: parseInt(result.activeplayer) - 1 } }, function (err) {
                    if (err) throw err;
                });
            }
        }
    });

    let ischeck = socketlist.filter(function (object) {
        return (object == socket.id)
    });

    if (ischeck.length == 0) {
        console.log("re-connected user");
    }
    else {
        socketlist.splice(socketlist.indexOf(socket.id), 1);
        let userid = socket.userid;
        console.log("  leaving user's id : ", userid)

        if (socket.room == undefined || userid == undefined)
            return;

        let roomid_arr = socket.room.split("");
        roomid_arr.splice(0, 1);
        let roomid = '';
        for (let i = 0; i < roomid_arr.length; i++) {
            roomid += roomid_arr[i];
        }
        console.log("roomid : ", roomid);

        if (roomlist.length > 0) {
            let removeindex = null;
            for (let index = 0; index < roomlist.length; index++) {
                if (roomlist[index].roomid == roomid) {
                    //console.log("yes");
                    let num;
                    let isExist = false;
                    for (let i = 0; i < roomlist[index].playerlist.length; i++) {
                        if (roomlist[index].playerlist[i].userid == userid) {
                            isExist = true;
                            //console.log("yes");
                            num = i
                            break;
                        }
                    }
                    if (isExist == true) {
                        setTimeout(() => {
                            roomlist[index].playerlist.splice(num, 1);
                            roomlist[index].playerphotos.splice(num, 1);
                            roomlist[index].earnScores.splice(num, 1);
                            //exports.GetUserListInRoom(roomid);
                            if (roomlist[index].playerlist.length == 0) {
                                //console.log("yes");
                                removeindex = index;
                                if (removeindex != null) {
                                    // console.log("yes");
                                    roomlist.splice(removeindex, 1);
                                    let query = {
                                        roomID: parseInt(roomid)
                                    };
                                    let collection = database.collection('roomdatas');
                                    collection.deleteOne(query, function (err, removed) {
                                        if (err) {
                                            console.log(err);
                                        } else {
                                            console.log(roomid, 'room has removed successfully!');
                                        }
                                    });
                                    //roommanager.GetRoomList();
                                }
                            } else if (roomlist[index].playerlist.length == 1) {
                                console.log("STOP", roomlist[index].roomid);
                                //roommanager.GetRoomList();
                                io.sockets.in('r' + roomlist[index].roomid).emit('GAME_END', { outerid: socket.userid });
                                //socket.in(socket.room).emit('GAME_END', {});
                            }
                        }, 100);
                    }
                }
            }
        }
    }
}
function getConnectedList() {
    let list = []

    for (let client in io.sockets.connected) {
        list.push(client)
    }

    return list
}
exports.Pause_Game = function (socket, data) {
    let roomid = data.roomid;
    let outerName = data.outerName;
    let outerID = data.outerID;
    let emitdata = {
        roomid: roomid,
        outerName: outerName,
        outerid: outerID
    }
    for (let index = 0; index < roomlist.length; index++) {
        if (roomlist[index].roomid == roomid) {
            let mine = roomlist[index].playerlist.filter(p => p.userid == outerID);
            if (mine.length > 0) {
                mine[0].isIgnored = true;
            }

        }
    }

    // socket.in('r' + roomid).emit('REQ_PAUSE_RESULT', emitdata);
    io.sockets.in('r' + roomid).emit('REQ_PAUSE_RESULT', emitdata);
}

//     exports.Resume_Game = function (socket, data) {
//         let roomid = data.roomid;
//         let outerName = data.outerName;
//         let outerID = data.outerID;
    
//         let emitdata = {
//             roomid : roomid
//         }
//         for (let index = 0; index < roomlist.length; index++) {
//             if (roomlist[index].roomid == roomid) {
//                 let mine = roomlist[index].playerlist.filter(p => p.userid == outerID);
//                 if (mine.length > 0) {
//                     mine[0].isIgnored = false;
//                 }
//             }
//                 let mydata = '';
//                 for (let i = 0; i < roomlist[index].playerlist.length; i++) {
//                     mydata = mydata + '{' +
//                         '"userid":"' + roomlist[index].playerlist[i].userid + '",' +
//                         '"isIgnored":"' + roomlist[index].playerlist[i].isIgnored + '",' +
//                         '"timechance":"' + roomlist[index].playerlist[i].timechance + '",' +
//                         '"moved":"' + roomlist[index].playerlist[i].moved + '",' +
//                         '"statics":"' + roomlist[index].playerlist[i].statics + '",' +
//                         '"completed":"' + roomlist[index].playerlist[i].completed + '"},';
//                 }
//                 mydata = mydata.substring(0, mydata.length - 1);
//                 mydata = '{' +
//                     '"turnUser":"' + roomlist[index].turnuser + '",' +
//                     '"roomid":"' + roomid + '",' +
//                     '"outerID":"' + outerID + '",' +
//                     '"allusers": [' + mydata;
//                 mydata = mydata + ']}';
//                 io.sockets.in('r' + roomid).emit('REQ_RESUME_RESULT', JSON.parse(mydata));
//                 let takenUsers = roomlist[index].playerlist.filter(p => p.isIgnored == false);
//                 // if(takenUsers.length == roomlist[index].seatlimit)
//                 // {
//                     // SetTurn(index, roomid);
//                 // }
//             // }
//         }
// }

exports.Resume_Game = function (socket, data) {
    let roomid = data.roomid;
    let outerName = data.outerName;
    let outerID = data.outerID;

    let emitdata = {
        roomid : roomid
    }
    for (let index = 0; index < roomlist.length; index++) {
       
            let mydata = '';
            for (let i = 0; i < roomlist[index].playerlist.length; i++) {
                mydata = mydata + '{' +
                    '"userid":"' + roomlist[index].playerlist[i].userid + '",' +
                    '"isIgnored":"' + roomlist[index].playerlist[i].isIgnored + '",' +
                    '"timechance":"' + roomlist[index].playerlist[i].timechance + '",' +
                    '"moved":"' + roomlist[index].playerlist[i].moved + '",' +
                    '"statics":"' + roomlist[index].playerlist[i].statics + '",' +
                    '"completed":"' + roomlist[index].playerlist[i].completed + '"},';
            }
            mydata = mydata.substring(0, mydata.length - 1);
            mydata = '{' +
                '"turnUser":"' + roomlist[index].turnuser + '",' +
                '"roomid":"' + roomid + '",' +
                '"outerID":"' + outerID + '",' +
                '"allusers": [' + mydata;
            mydata = mydata + ']}';
            io.sockets.in('r' + roomid).emit('REQ_RESUME_RESULT', JSON.parse(mydata));
            let takenUsers = roomlist[index].playerlist.filter(p => p.isIgnored == false);

            setTimeout(() => {
                if (roomlist[index].roomid == roomid) {
                    let mine = roomlist[index].playerlist.filter(p => p.userid == outerID);
                    if (mine.length > 0) {
                         mine[0].isIgnored = false;
                    }
                }
            }, 2000);

            // if(takenUsers.length == roomlist[index].seatlimit)
            // {
                // SetTurn(index, roomid);
            // }
        // }
    }
}

exports.SendGameHistory = function (socket, data) {
    
    let userId = data.userid;
    let seatLimit = data.seat_limit;
    let query = { userid: userId,seat_limit:seatLimit };
    let collection = database.collection("gamehistorys");

    collection.find(query).toArray(function (err, docs) {
    
        console.log("History Data is",docs);
    });

    socket.emit("GAMEHISTORY")
}

exports.AddWithDeposite = function (socket, data) {
    
    let currentDate = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Calcutta'
     });
     let currentTime = dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");


     collection = database.collection("transactions");

     let record = {
        userid: data.userId,
        order_id: data.orderId,
        txn_id: data.txnId,
        amount: data.amount,
        status: data.status,
        trans_date: currentDate,
        created_at: currentTime,
    };

    collection.insertOne(record, function (err) {
        if (!err) {
            console.log("Transactions added");
            
        }else{
            console.log("Transaction added");
        }
    });


    socket.emit("REQ_ADD_DEPOSITE_RESULT");
}

exports.ConnectionLeft = function (socket, data) {
   
    socket.in('r' + data.roomId).emit('REQ_CONNECTION_LEFT_RESULT');
}

var lastTurnTime;

exports.GetDelayedTime = function (socket, data) {
   
    let currentDate = new Date();
    let difference = currentDate - lastTurnTime;

    let result =
    {
        difference : difference/1000
    }

    socket.in('r' + data.roomId).emit('REQ_GET_DELAYEDTIME_RESULT',result);
}


exports.GetServerNotice = function (socket, data) {
    
    let collection = database.collection("websettings");
    collection.find({}).toArray(function (err, docs) {
    
        let serverNotice = docs[0].server_key;
        console.log("Server Notice is ", serverNotice);

        let result =
        {
            notice : serverNotice
        }

        socket.emit("REQ_GET_SERVER_NOTICE_RESULT",result);
        
    });
}

exports.UpdateUserData = function (socket, data) {
    
        let collection = database.collection("userdatas");
        let query = {userid : data.userid}

        let quickludo_multiplayer =
        {
            won : parseInt(data.quickLudoWon),
            played : parseInt(data.quickLudoPlayed)
        }

        let online_multiplayer =
        {
            won : parseInt(data.online_won),
            played : parseInt(data.online_played)
        }

        var result = {
            points:data.points.toString(),
            level:parseInt(data.level),
            // online_multiplayer: data.online_multiplayer,
            // friend_multiplayer: data.friend_multiplayer,
            // tokens_captured : data.tokens_captured,
            // won_streaks : data.won_streaks,                        
          
            winning_amount : data.winning_amount.toString(),
            upi_id : data.upi_id,
            bank_id : data.bank_id,
            bank_name : data.bank_name,
            ifsc : data.ifsc,
            acc_holder : data.acc_holder,
            used_refer_code : data.used_refer_code,
            region : data.region,
            quickludo_multiplayer,
            online_multiplayer,
            userphone : data.userphone
           };

      collection.updateOne(query,{$set:result},function(err) {
        if(err) throw err;
        else
        {
            console.log("Player Data Updated.")
        }
           
      });
    }

    exports.ValidateReferCode = function (socket, data) {
    
        let collection = database.collection("userdatas");
        let query = {referral_code : data.refercode}

        collection.findOne(query, function (err, result) {
            if (err)
                console.log(err);
            if (result != null) {
                
                    console.log("Log 1");
                    var data = 
                    {
                        codeStatus : true
                    }
                    socket.emit("REQ_VALIDATEREFERCODE_RESULT",data);
            }
            else
            {
                console.log("Log 2");
                var data = 
                {
                    codeStatus : false
                }
                socket.emit("REQ_VALIDATEREFERCODE_RESULT",data);
            }
        });
    }
    

exports.UpdateReferEarnings = function (socket, data) {
    
    let collection = database.collection("userdatas");
    let query = {referral_code : data.usedrefercode}

       collection.findOne(query, function (err, result) {
        let webdata;
        if (err)
            console.log(err);
        if (result != null) {

            var currentPoints = result.points;
            var refer_earning = result.refer_earning;

            var newPoints = parseFloat(currentPoints)+parseFloat(data.referamount);
            var newReferEarnings = parseFloat(refer_earning) + parseFloat(data.referamount);

            var newdata = {
                points : newPoints.toString(),
                refer_earning : newReferEarnings,
            };

                collection.updateOne(query, {$set:newdata}, function (err) {
                    if (err) throw err;
                    else
                    {
                        console.log("Refer Earnings Updated.")
                    }
                });
        }
    });
}

// exports.UpdatePlayers = function (socket, data) {

//     let collection = database.collection("roomdatas");

//     collection.find().toArray(function (err, docs) {
//         if (!err) {
//             let twoPlayersOnline = docs.filter(x=>x.seat_limit == 2).length * 2;
//             let fourPlayersOnline = docs.filter(x=>x.seat_limit == 4).length * 4;

//             let result =
//             {
//                 twoPlayersOnline,
//                 fourPlayersOnline
//             }

//             socket.emit("REQ_UPDATEPLAYERS_RESULT",result);
//         }
//     });
// }

exports.UpdatePlayers = function (socket, data) {

    let collection = database.collection("roomdatas");

    collection.find().toArray(function (err, docs) {
        if (!err) {
            let twoPlayersOnline = docs.filter(x=>(x.seat_limit == 2 && x.game_mode == "classic")).length * 2;
            let fourPlayersOnline = docs.filter(x=>x.seat_limit == 4 && x.game_mode == "classic").length * 4;
            let quickLudoPlayersOnline = docs.filter(x=>x.game_mode == "quickLudo").length * 2;

            let result =
            {
                twoPlayersOnline,
                fourPlayersOnline,
                quickLudoPlayersOnline
            }

            socket.emit("REQ_UPDATEPLAYERS_RESULT",result);
        }
    });
}

exports.AddBotHistory = function (data) {
    let collection = database.collection('botgameplays');
   let currentDate = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Calcutta'
 });
    let currentTime = dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");
    let query = {
        entry : data.entry,
        win_money : data.win_money,
        loss_money : data.loss_money,
        game_status : data.game_status,
        currentTime : currentDate
    };

      collection.insertOne(query, function (err) {
        if (!err) {
            console.log("Bot History info added");
            
        }else{
            console.log("Bot History info not added");
        }
    });
}
    