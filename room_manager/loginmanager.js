const publicIp = require('public-ip');
var fs = require('fs');
var dateFormat = require("dateformat");
var database = null;
var gamemanager = require('../game_manager/gamemanager');
const { count } = require('console');
const { workerData } = require('worker_threads');
const { GetRoomList } = require('./roommanager');
var serverip = '35.90.121.12';
var port = '16000';

exports.setsocketio = function (socketio) {
    io = socketio;
};

exports.initdatabase = function(db) {
    database = db;
    (async () => {
        // console.log(await publicIp.v4());
        //serverip = await publicIp.v4();
        console.log(serverip);
        //=> '46.5.21.123'
     
        //console.log(await publicIp.v6());
        //=> 'fe80::200:f8ff:fe21:67cf'        
    })();
};

exports.LogIn = function (socket,  userInfo) 
{
    var collection = database.collection('userdatas');
    var query ;
    if(userInfo.logintype == 'Google')
        query = {google_id: userInfo.google_id};
    if(userInfo.logintype == 'Phone')
        query = {userphone: userInfo.userphone};

    collection.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            var mydata;
            if(result == null){
                mydata = {
                  result:'failed'  
                };
                console.log('123123123');
            }
            else
            {
                if(result.login_status == '1'){
                    mydata = {
                        result:'already logined'
                      };
                    socket.emit('GET_LOGIN_RESULT', mydata);
                    return;
                }                      

                collection.updateOne(query,{$set:{connect:socket.id, status:1, login_status:'0'}},function(err) {
                    if(err) throw err;
                    //else
                    //console.log('- User socket_id:', socket.id);
                });             
                
                let websettings = database.collection('websettings');
                websettings.findOne({}, function(err, result)
                {
                    let webdata ;
                    if(err)
                        console.log(err);
                    if(result != null){
                        if(parseInt(result.activeplayer) >= 0){
                            websettings.updateOne({},{$set:{activeplayer:parseInt(result.activeplayer) + 1}},function(err) {
                                if(err) throw err;                            
                                else console.log('one player logined also. :) +1');
                            });
                        }
                    }
                });

                var mydata = {
                    result : 'success',
                    username : result.username, 
                    userid : result.userid,
                    google_id : result.google_id,                                        
                    userphone: result.userphone,
                    useremail: result.useremail,
                    bank_id : result.bank_id,
                    upi_id : result.upi_id,
                    upi_name : result.upi_name,
                    photo: result.photo,
                    points : result.points, 
                    level : result.level,
                    online_multiplayer: result.online_multiplayer,
                    friend_multiplayer: result.friend_multiplayer,
                    tokens_captured : result.tokens_captured,
                    won_streaks : result.won_streaks,
                    referral_count : result.referral_count,
                    referral_code: result.referral_code,
                    ant : result.winning_amount,
                    added : result.added_amount,
                    kyc_status : result.kyc_status,
                    acc_holder : result.acc_holder,
                    acc_number : result.acc_number,
                    bank_name : result.bank_name,
                    ifsc : result.ifsc,
                    banned : result.banned,
                    used_refer_code : result.used_refer_code,
                    quickludo_multiplayer : result.quickludo_multiplayer,
                    region : result.region
                }
                // console.log('---' + result.username + ' s LOGIN INFO ---' , mydata);
            }
            socket.emit('GET_LOGIN_RESULT', mydata);
        }
    });
}

exports.LogOut = function (socket,  data) 
{
    var collection = database.collection('userdatas');
    var query = {userid : data.userid};
    collection.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            var mydata;
            if(result == null){
                console.log('logout failed ---');
            }
            else
            {
                collection.updateOne(query,{$set:{connect:socket.id, status:1, login_status:'0'}},function(err) {
                    if(err) throw err;
                    //else
                    //console.log('- User socket_id:', socket.id);
                });
            }
        }
    });
}

exports.SignUp = function (socket, data)
{
    let loginMode = data.loginMode;
    if(loginMode == 'google')
    {
        let colletion_userdata = database.collection('userdatas');
        colletion_userdata.findOne({google_id : data.google_id}, function(err, result)
        {
            if(err)
                console.log(err);
            else 
            {
                if(result == null)
                {
                    console.log('---- You can register google Login ----');
                    RegisterAndCheckRefer(socket, data);
                }
                else
                {
                    console.log('---- Failed! Your Google Account already registered ----');
                    let emitdata = {result : "failed", loginMode : 'google'};
                    socket.emit('GET_REGISTER_RESULT', emitdata);                    
                }
            }
        });
    }
    else if(loginMode == 'phone')
    {
        RegisterAndCheckRefer(socket, data);
    }    
}


function RegisterAndCheckRefer(socket, data)
{
    let collection = database.collection('websettings');    
    let signup_bonus = 0;
    collection.findOne({}, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            if(result != null){
                signup_bonus = parseInt(result.signup_bonus);
                var collection = database.collection('userdatas');
                var randomnum1 = '' + Math.floor(100000 + Math.random() * 900000);
                var randomnum2 = '' + Math.floor(100000 + Math.random() * 900000);
                var randomnum = randomnum1 + randomnum2;
                var referralCode = ''+ Math.floor(100000 + Math.random() * 900000);
                var name = data.username;
                var phone = data.userphone;
                var photo = data.userphoto;                
                var email = data.useremail;
                var online_multiplayer = {played : 0, won : 0};                
                var friend_multiplayer = {played : 0, won : 0};
                var quickludo_multiplayer = {played : 0, won : 0};
                var tokens_captured = {mine : 0, opponents : 0};
                var won_streaks = {current : 0, best : 0};
                let currentDate = new Date().toLocaleString('en-US', {
                   timeZone: 'Asia/Calcutta'
                });
                let timel =  dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");                
                var user_data = {
                    username : name,
                    userid : randomnum,
                    userphone: phone,
                    useremail : email,                    
                    photo: photo,
                    points : signup_bonus.toString(), 
                    google_id : data.google_id,
                    level : 0, 
                    online_multiplayer: online_multiplayer,
                    friend_multiplayer: friend_multiplayer,
                    quickludo_multiplayer : quickludo_multiplayer,
                    tokens_captured : tokens_captured,
                    won_streaks : won_streaks,
                    referral_count : 0,
                    referral_users : [],
                    created_date : timel,
                    spin_date : new Date(),
                    dailyReward_date : new Date(),
                    referral_code: referralCode,
                    connect : socket.id,
                    winning_amount : '0',
                    added_amount : 0,
                    refer_earning : 0,
                    status : 1,
                    login_status:"0",
                    banned : 1,
                    kyc_status : 0,
                    upi_id : '',   
                    upi_name: '',
                    bank_id: '',                 
                    acc_holder: '',
                    acc_number: '',                    
                    bank_name: '',
                    ifsc: '',
                    device_token:data.device_token,
                    used_refer_code:'',
                    uniquebankid: '',
                    uniqueupiid:'',
                    region:''
                    
                };
                
                collection.insertOne(user_data);

                let websettings = database.collection('websettings');
                websettings.findOne({}, function(err, result)
                {                    
                    if(err)
                        console.log(err);
                    if(result != null)
                    {
                        if(parseInt(result.activeplayer) >= 0)
                        {
                            websettings.updateOne({},{$set:{activeplayer:parseInt(result.activeplayer) + 1}},function(err) {
                                if(err) throw err;
                                else console.log('one player logined also. :) +1');
                            });
                        }

                        refer_amount = parseInt(result.refer_bonus) ;
                        let collection1 = database.collection('userdatas');
                        collection1.find().toArray(function(err, docs){
                            if(!err){
                                if(docs.length > 0){
                                    let users = docs.filter(function (object) {
                                        return (object.referral_code == data.referral)
                                    });
                                    
                                    if(users.length > 0)
                                    {
                                        let emitdata = {result : "success", refer_amount : refer_amount};
                                        socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);
                                        let referral_users = [];
                                        referral_users = users[0].referral_users;
                                        referral_users.push(data.userphone);
                                        let query = {userphone : users[0].userphone};
                                        let query2 = {userphone : data.userphone};
                                        collection1.updateOne(query, {
                                            $set: {
                                                points: parseInt(users[0].points) + refer_amount,
                                                refer_earning:parseInt(users[0].refer_earning) + refer_amount,
                                                referral_count : users[0].referral_count + 1,
                                                referral_users : referral_users
                                            }
                                        }, function (err) {
                                            if (err) throw err;
                                        });

                                        collection1.updateOne(query2, {
                                            $set: {
                                                used_refer_code : data.referral,
                                            }
                                        }, function (err) {
                                            if (err) throw err;
                                        });
                                    }
                                    else
                                    {
                                        let emitdata = {result : "failed"};
                                        socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);

                                        
                                    }
                                }
                            }
                        });
                    }
                });

                var mydata = {
                    result : 'success',
                    userphone: phone,
                    username : name, 
                    userid : randomnum,  
                    google_id : data.google_id,                   
                    points : signup_bonus.toString(),                    
                    referral_code: referralCode,
                    loginMode : data.loginMode,
                }
                console.log("- New user: " + name + " has Registered.");
                socket.emit('GET_REGISTER_RESULT', mydata);
            }
        }
    }); 
}

function RegisterAndCheckRefer2(socket, data)
{
    // let collection = database.collection('websettings');    
    let signup_bonus = 0;
    // collection.findOne({}, function(err, result)
    // {
    //     if(err)
    //         console.log(err);
    //     else
    //     {
    //         if(result != null){
                // signup_bonus = parseInt(result.signup_bonus);
                signup_bonus = 500000;
                var collection = database.collection('userdatas');
                var randomnum1 = '' + Math.floor(100000 + Math.random() * 900000);
                var randomnum2 = '' + Math.floor(100000 + Math.random() * 900000);
                var randomnum = randomnum1 + randomnum2;
                var referralCode = ''+ Math.floor(100000 + Math.random() * 900000);
                var name = data.username;
                var phone = data.userphone;
                var photo = data.userphoto;                
                var email = data.useremail;
                var online_multiplayer = {played : 0, won : 0};                
                var friend_multiplayer = {played : 0, won : 0};
                var tokens_captured = {mine : 0, opponents : 0};
                var won_streaks = {current : 0, best : 0};
                let currentDate = new Date().toLocaleString('en-US', {
                   timeZone: 'Asia/Calcutta'
                });
                let timel =  dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");                
                var user_data = {
                    username : name,
                    userid : randomnum,
                    userphone: phone,
                    useremail : email,                    
                    photo: photo,
                    points : signup_bonus.toString(), 
                    google_id : data.google_id,
                    level : 0, 
                    online_multiplayer: online_multiplayer,
                    friend_multiplayer: friend_multiplayer,
                    tokens_captured : tokens_captured,
                    won_streaks : won_streaks,
                    referral_count : 0,
                    referral_users : [],
                    created_date : timel,
                    spin_date : new Date(),
                    dailyReward_date : new Date(),
                    referral_code: referralCode,
                    connect : socket.id,
                    winning_amount : '0',
                    added_amount : 0,
                    refer_earning : 0,
                    status : 1,
                    login_status:"0",
                    banned : 1,
                    kyc_status : 0,
                    upi_id : '',   
                    upi_name: '',
                    bank_id: '',                 
                    acc_holder: '',
                    acc_number: '',                    
                    bank_name: '',
                    ifsc: '',
                    device_token:data.device_token,
                    used_refer_code:'',
                    uniquebankid: '',
                    uniqueupiid:''
                    
                };
                
                collection.insertOne(user_data);

                let websettings = database.collection('websettings');
                websettings.findOne({}, function(err, result)
                {                    
                    if(err)
                        console.log(err);
                    if(result != null)
                    {
                        if(parseInt(result.activeplayer) >= 0)
                        {
                            websettings.updateOne({},{$set:{activeplayer:parseInt(result.activeplayer) + 1}},function(err) {
                                if(err) throw err;
                                else console.log('one player logined also. :) +1');
                            });
                        }

                        refer_amount = parseInt(result.refer_bonus) ;
                        let collection1 = database.collection('userdatas');
                        collection1.find().toArray(function(err, docs){
                            if(!err){
                                if(docs.length > 0){
                                    let users = docs.filter(function (object) {
                                        return (object.referral_code == data.referral)
                                    });
                                    
                                    if(users.length > 0)
                                    {
                                        let emitdata = {result : "success", refer_amount : refer_amount};
                                        socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);
                                        let referral_users = [];
                                        referral_users = users[0].referral_users;
                                        referral_users.push(data.userphone);
                                        let query = {userphone : users[0].userphone};
                                        let query2 = {userphone : data.userphone};
                                        collection1.updateOne(query, {
                                            $set: {
                                                points: parseInt(users[0].points) + refer_amount,
                                                refer_earning:parseInt(users[0].refer_earning) + refer_amount,
                                                referral_count : users[0].referral_count + 1,
                                                referral_users : referral_users
                                            }
                                        }, function (err) {
                                            if (err) throw err;
                                        });

                                        collection1.updateOne(query2, {
                                            $set: {
                                                used_refer_code : data.referral,
                                            }
                                        }, function (err) {
                                            if (err) throw err;
                                        });
                                    }
                                    else
                                    {
                                        let emitdata = {result : "failed"};
                                        socket.emit('REQ_CHECK_REFFERAL_RESULT', emitdata);

                                        
                                    }
                                }
                            }
                        });
                    }
                });

                var mydata = {
                    result : 'success',
                    userphone: phone,
                    username : name, 
                    userid : randomnum,  
                    google_id : data.google_id,                   
                    points : signup_bonus.toString(),                    
                    referral_code: referralCode,
                    loginMode : data.loginMode,
                }
                console.log("- New user: " + name + " has Registered.");
                socket.emit('GET_REGISTER_RESULT', mydata);
    //         }
    //     }
    // }); 
}

exports.Insert_KYC = function(data, socket){
    let currentDate = new Date().toLocaleString('en-US', {
       timeZone: 'Asia/Calcutta'
    });
    let timel =  dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");  
    var kyc_data = {
        document_number : data.document_number,
        first_name : data.first_name,
        last_name : data.last_name,
        dob : data.dob,
        document_image: data.document_image,
        document_type : data.document_type,
        verification_status : '0',
        userid : data.userid,
        created_at : timel
    };
    console.log('kyc----- : ' , kyc_data);
    var collection = database.collection('kycdetails');
    collection.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else{
            if(docs.length > 0){
                var kyc_infolist = docs.filter(function (object) {
                    return (object.userid == data.userid)
                });
                // console.log(rooms_wifi);
                if(kyc_infolist.length > 0)
                {
                    console.log('already exists your KYC Document');                    
                    var mydata = {
                        result:'failed'
                    };
                    socket.emit('REQ_KYC_RESULT', mydata);  
                }
                else
                {
                    console.log('KYC inserted');
                    collection.insertOne(kyc_data);
                    var mydata = {
                        result:'success'
                    };
                    socket.emit('REQ_KYC_RESULT', mydata);                     
                }
            }
            else
            {
                console.log('---KYC inserted---');
                collection.insertOne(kyc_data);
                var mydata = {
                    result:'success'
                };
                socket.emit('REQ_KYC_RESULT', mydata);        
            }
        }
    });
}



exports.Check_KYC = function(data, socket){    
    var collection = database.collection('kycdetails');
    collection.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else{
            if(docs.length > 0){
                var kyc_infolist = docs.filter(function (object) {
                    return (object.userid == data.userid)
                });
                if(kyc_infolist.length > 0)
                {                    
                    var mydata = {
                        result : 'success',
                        status :kyc_infolist[0].verification_status,
                    };
                    socket.emit('REQ_CHECK_KYC_RESULT', mydata);
                }
                else
                {
                    var mydata = {
                        result:'failed'
                    };
                    socket.emit('REQ_CHECK_KYC_RESULT', mydata);
                }
            }
            else
            {
                var mydata = {
                    result:'failed'
                };
                socket.emit('REQ_KYC_RESULT', mydata);
            }
        }
    });
}


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
  }

exports.Insert_Withdraw = function(data, socket){    
    var withdraw = database.collection('withdraws');
    var transactions = database.collection('transactions');
    var userdata = database.collection('userdatas');    
    var transactionId = (new Date()).getTime().toString(36).toUpperCase() + getRandomInt(10,99);
    var query = {userid : data.userid}
    let currentDate = new Date().toLocaleString('en-US', {
       timeZone: 'Asia/Calcutta'
    });
    let timel =  dateFormat(currentDate, "dddd mmmm dS yyyy h:MM:ss TT");  
    var withdrawData = {
        method : data.method,
        ifsc : data.ifsc,
        bank_name : data.bank_name,
        acc_holder : data.acc_holder,
        userid : data.userid,
        amount : data.amount,
        upi_id : data.upi_id,
        type : 'Withdraw',
        bank_id : data.bank_id,
        withdraw_status : '0',
        created_at : timel,     
        transactionId   
    }
    // var transactionsData = {
    //     userid : data.userid,
    //     type : 'Deposit',
    //     playmode : '',
    //     order_id : '',
    //     txn_id : '',
    //     amount : data.amount,
    //     status : '',
    //     trans_date : timel,        
    // }
    userdata.findOne(query, function(err, result){
        if(err)
            console.log(err);
        else
        {
            if(result != null)
            {                
                if(parseInt(data.amount)  <=  parseInt(result.winning_amount))
                {
                    // var currentWinningAmount = parseInt(result.winning_amount);
                    // var amount = parseInt(data.amount);

                    // console.log("Winning Amount is ",currentWinningAmount);
                    // console.log("Amount is ",amount);

                    // var query_my = {userid : data.userid};
                    // var finalAmount = currentWinningAmount - amount;

                    // console.log("Final Amount is ", finalAmount);
                    //   userdata.updateOne(query_my,{$set:{winning_amount : finalAmount.toString()}},function(err) {
                    //      if(err) throw err
                    //      else
                    //      {
                    //         console.log("Player Data Updated.");
                    //      }
                    //  });

                    withdraw.insertOne(withdrawData);   
                    // transactions.insertOne(transactionsData);
                    var mydata = {
                        result : 'success'
                    }
                    console.log(mydata);
                    socket.emit('REQ_WITHDRAW_RESULT', mydata);
                }
                else
                {                    
                    var mydata = {
                        result : 'failed'
                    }
                    console.log(mydata);
                    socket.emit('REQ_WITHDRAW_RESULT', mydata);
                }
            }
        }
    });
}

exports.Update_UPI = function(data, socket){        
    var userdata = database.collection('userdatas');    
    var query = {userid : data.userid}        
    userdata.findOne(query, function(err, result){
        if(err)
            console.log(err);
        else
        {
            if(result != null)
            {   
                userdata.updateOne(query,{$set:{upi_id:data.upi_id, upi_name : data.upi_name}},function(err) {
                    if(err) throw err;
                });

                let mydata = {
                    result : 'success',
                    upi_id : data.upi_id,
                    upi_name : data.upi_name
                }
                socket.emit('REQ_UPI_RESULT', mydata);
            }
            else
                socket.emit('REQ_UPI_RESULT', {result : 'failed'});
        }
    });
}

exports.Update_UPI = function(data, socket){        
    var userdata = database.collection('userdatas');    
    var query = {userid : data.userid}        
    userdata.findOne(query, function(err, result){
        if(err)
            console.log(err);
        else
        {
            if(result != null)
            {   
                userdata.updateOne(query,{$set:{upi_id:data.upi_id, upi_name : data.upi_name}},function(err) {
                    if(err) throw err;
                });

                let mydata = {
                    result : 'success',
                    upi_id : data.upi_id,
                    upi_name : data.upi_name
                }
                socket.emit('REQ_UPI_RESULT', mydata);
            }
            else
                socket.emit('REQ_UPI_RESULT', {result : 'failed'});
        }
    });
}


exports.Valid_Phone = function(socket, data)
{
    var collection = database.collection('userdatas');
    collection.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else{
            if(docs.length > 0){
                var rooms_wifi = docs.filter(function (object) {
                    return (object.userphone == data.phone)
                });
                // console.log(rooms_wifi);
                if(rooms_wifi.length > 0)
                {
                    console.log('already exist user');
                    var mydata = {
                        result:'failed'
                    }
                    socket.emit('REQ_VALID_PHONE_RESULT', mydata);  
                }
                else
                {
                    console.log('success');
                    var mydata = {
                        result:'success'
                    }
                    socket.emit('REQ_VALID_PHONE_RESULT', mydata);                     
                }
            }
            else
            {
                console.log('success');
                var mydata = {
                    result:'success'
                }
                socket.emit('REQ_VALID_PHONE_RESULT', mydata);        
            }
        }
    });
}

exports.Get_Coins = function(data, socket)
{
    var collection = database.collection('userdatas');
    var query = {userid : data.userid};
    // console.log('userid>>>>>>>>>>:  ' , data.userid);
    collection.findOne(query, function(err, result)
    {
        if(err)
        {
            console.log(err);            
        }
        else
        {
            var mydata;
            if(result == null){
                mydata = {
                    result : "failed"
                }
            }
            else
            {
                mydata = {
                    result : 'success',
                    points : result.points,
                    winning_amount : result.winning_amount,
                }
            }
            //console.log('---- REQ_COIN_RESULT ----', mydata);
            socket.emit('REQ_COIN_RESULT', mydata);
        }
    });
}

exports.GetUserInfo = function(socket, userInfo)
{
    //console.log(userInfo.username);
    var collection = database.collection('userdatas');
    var query = {userid : userInfo.userid};
    collection.findOne(query, function(err, result)
    {
        if(err)
        {
            console.log(err);
            
        }
        else
        {
            //console.log("- Login userinfo :");
            //console.log(result);
            var mydata;
            if(result == null){
                mydata = {
                    result : "failed"
                }
            }
            else
            {
                mydata = {
                    result : 'success',
                    username : result.username,                     
                    userid : result.userid,
                    photo: result.photo,
                    points : result.points, 
                    level : result.level,
                    online_multiplayer: result.online_multiplayer,
                    friend_multiplayer: result.friend_multiplayer,
                    tokens_captured : result.tokens_captured,
                    won_streaks : result.won_streaks,
                    referral_code : result.referral_code,
                    referral_count : result.referral_count
                }
            }
            socket.emit('GET_USERINFO_RESULT', mydata);
        }
    });
}




exports.UpdateUserInfo = function (socket, userInfo) {
    //console.log("update user info", userInfo);
    var collection = database.collection('userdatas');
    var query = { userid: userInfo.userid };
    var online_multiplayer = { played: parseInt(userInfo.online_played), won: parseInt(userInfo.online_won) };
    var friend_multiplayer = { played: parseInt(userInfo.friend_played), won: parseInt(userInfo.friend_won) };
    var tokens_captured = { mine: parseInt(userInfo.tokenscaptured_mine), opponents: parseInt(userInfo.tokenscaptured_opponents) };
    var won_streaks = { current: parseInt(userInfo.wonstreaks_current), best: parseInt(userInfo.wonstreaks_best) };



    collection.findOne(query, function (err, result) {
        if (err) console.log(err);
        else {

            if (userInfo.updatetype == "BeforePlay") {

                var bonusamount
                var EntryPoint;

                if (parseInt(result.bonus) >= 1){
                    bonusamount = parseInt(result.bonus) - 1;
                    EntryPoint = userInfo.points-1;
                }else{
                    bonusamount = parseInt(result.bonus) - 0;
                    EntryPoint = userInfo.points
                }
               var wincutcoin;
               var minuspoint;

                if(parseInt(EntryPoint)>parseInt(result.points)){
                    var minuspoint = parseInt(EntryPoint)-parseInt(result.points);
                    var wincutcoin = parseInt(result.winning_amount)-minuspoint;
                    var data = {
                            points: "0",
                            level: parseInt(userInfo.level),
                            online_multiplayer: online_multiplayer,
                            friend_multiplayer: friend_multiplayer,
                            tokens_captured: tokens_captured,
                            won_streaks: won_streaks,
                            winning_amount: wincutcoin.toString(),
                            bonus: bonusamount.toString(),
                        }
                }else{
                    var minuspoint = parseInt(result.points)-parseInt(EntryPoint);
                    var data = {
                        points: minuspoint.toString(),
                        level: parseInt(userInfo.level),
                        online_multiplayer: online_multiplayer,
                        friend_multiplayer: friend_multiplayer,
                        tokens_captured: tokens_captured,
                        won_streaks: won_streaks,
                        winning_amount: result.winning_amount.toString(),
                        bonus: bonusamount.toString(),
                    }

                }
           
                console.log("##### result.updatetype #####" + userInfo.updatetype);
                collection.updateOne(query, { $set: data }, function (err) {
                    if (err) throw err;
                    else
                        socket.emit('REQ_UPDATE_USERINFO_RESULT', { result: 'success', amount: amount });
                });

            }

            //After Play

            else {
                console.log("################## result.updatetype #############" + userInfo.updatetype);

                var amount = parseInt(userInfo.winning_amount) + parseInt(result.winning_amount);
                var data = {
                    username : userInfo.username,
                    points: userInfo.points,
                    level: parseInt(userInfo.level),
                    online_multiplayer: online_multiplayer,
                    friend_multiplayer: friend_multiplayer,
                    tokens_captured: tokens_captured,
                    won_streaks: won_streaks,
                    winning_amount: amount.toString(),
                };


                collection.updateOne(query, { $set: data }, function (err) {
                    if (err) throw err;
                    else
                        socket.emit('REQ_UPDATE_USERINFO_RESULT', { result: 'success', amount: amount });
                });
            }

        }
    });
}

exports.Get_User_Photo = function(info, socket)
{
     var buf = Buffer.from(info.photo_data, 'base64');
     fs.writeFile('./delux/userphotos/' + info.userid + '.png', buf, function(err){
        if(err) throw err;
        console.log('Photo Saved!');
        var collection = database.collection('userdatas');
        var url = 'http://'+ serverip + '/userphotos/' + info.userid + '.png';
       // var url = 'http://35.90.121.12/userphotos/' + info.userid + '.png';
        collection.updateOne({userid:info.userid},{$set:{photo:url}},function(err) {
            if(err) throw err;
            else
                socket.emit('UPLOAD_USER_PHOTO_RESULT');
        });
     });
}
exports.Get_Lic_Photo = function(info, socket)
{
     var buf = Buffer.from(info.photo_data, 'base64');
     fs.writeFile('./delux/kycPhotos/' + info.userid + '.png', buf, function(err){
        if(err) throw err;
        console.log('kyc Photo Saved!');        
        var url = 'http://'+ serverip + '/kycPhotos/' + info.userid + '.png';
       // var url = 'http://35.90.121.12/kycPhotos/' + info.userid + '.png';
        
        var mydata = {
            photo_url : url,
        }

        socket.emit('UPLOAD_LIC_PHOTO_RESULT', mydata);        
     });
}


exports.GetGameSettings = function (socket) {
    let collection = database.collection('websettings');
    query = {};
    collection.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            if(result == null){
                mydata = {
                  result:'failed'  
                };
                socket.emit('REQ_GAMESETTINGS_RESULT', mydata);
            }
            else
            {
                mydata = {
                    result:'success',
                    commission : result.commission,
                    min_withdraw : result.min_withdraw,
                    max_withdraw : result.max_withdraw,
                    refer_bonus : result.refer_bonus,
                    whatsapp_link : result.whatsapp_link,
                    youtube_link : result.youtube_link,
                    bot_mode : result.bot_status,
                    purchase_link : result.purchase_link,
                    privacy_desc : result.privacy_desc,
                    terms_desc : result.terms_desc,
                    secemail : result.secemail,
                    website_url : result.website_url,
                    winnertitle : result.winnertitle,
                    winnername : result.winnername,
                    winamount : result.winamount,
                    winnermsg : result.winnermsg,
                    winnerprofile : result.winnerprofile,
                    github : result.github,
                    instagram : result.instagram,
                    twitter : result.twitter
                };
                //console.log('GAMESETTING_____    ' , mydata);
                socket.emit('REQ_GAMESETTINGS_RESULT', mydata);
            }
        }
    });
}


exports.GetImagesLinks = function (socket) {
    let collections = database.collection('sliders');
    collections.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                var mydata = {
                    result : 'success',
                    imglinks : docs,
                    length : docs.length,
                }; 
                //console.log('image_links____' , mydata);
                socket.emit('REQ_IMAGE_LINK_RESULT', mydata);
                
            }
            else
            {
                var mydata = {
                    result:'failed'
                };
                socket.emit('REQ_IMAGE_LINK_RESULT', mydata);        
            }
        }
    });
}


exports.GetOfferAmount = function (socket) {
    let collections = database.collection('bids');
    collections.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                var mydata = {
                    result : 'success',
                    OfferAmount : docs,
                    length : docs.length,
                }; 
                //console.log('image_links____' , mydata);
                socket.emit('REQ_OFFER_AMOUNT_RESULT', mydata);
                
            }
            else
            {
                var mydata = {
                    result:'failed'
                };
                socket.emit('REQ_OFFER_AMOUNT_RESULT', mydata);        
            }
        }
    });
}


exports.GetWalletHistories = function(socket, data) {


    let transactions = database.collection('transactions');
    transactions.find().toArray(function(err, docs) {
        if (err) {
            throw err;
        } else {
            if (docs.length != 0 || docs.length == 0) {
                var deposits = docs.filter(function(object) {
                    return (object.userid == data.userid)
                });

                if (deposits.length != 0 || deposits.length == 0) {
                    let collection = database.collection('withdraws');
                    collection.find().toArray(function(err, docs) {
                        if (err) {
                            throw err;
                        } else {
                            if (docs.length != 0 || docs.length == 0) {
                                var withdraws = docs.filter(function(object) {
                                    return (object.userid == data.userid)
                                });

                                if (withdraws.length != 0 || withdraws.length == 0) {

                                    let collection = database.collection('gamehistorys');
                                    collection.find().toArray(function(err, docs) {
                                        if (err) {
                                            throw err;
                                        } else {
                                            if (docs.length != 0 || docs.length == 0) {
                                                var gamehistory = docs.filter(function(object) {
                                                    return (object.userid == data.userid)
                                                });

                                                if (gamehistory.length != 0 || gamehistory.length == 0) {
                                                    console.log('deposits : ', deposits);   
                                                    console.log('withdraws : ', withdraws); 
                                                    console.log('gamehistory : ', gamehistory); 

                                                    var mydata = {
                                                        result: 'success',
                                                        deposits: deposits,
                                                        withdraws: withdraws,
                                                        gamehistory: gamehistory,
                                                        deposit_length: deposits.length,
                                                        withdraw_length: withdraws.length,
                                                        gamehistory_length: gamehistory.length,
                                                    };
                                                    socket.emit('REQ_WALLET_HIS_RESULT', mydata);
                                                }
                                            } else {
                                                var mydata = {
                                                    result: 'failed'
                                                };
                                                socket.emit('REQ_WALLET_HIS_RESULT', mydata);
                                            }
                                        }
                                    });


                                }
                            } else {
                                var mydata = {
                                    result: 'failed'
                                };
                                socket.emit('REQ_WALLET_HIS_RESULT', mydata);
                            }
                        }
                    });
                }
            } else {
                var mydata = {
                    result: 'failed'
                };
                socket.emit('REQ_WALLET_HIS_RESULT', mydata);
            }
        }
    });
}






exports.GetTournamentList = function (socket, data) {
    let tournaments = database.collection('tournaments');       
    tournaments.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                var tournaments = [];
                var currentDateStamp = Math.floor(Date.now() / 1000);
                for(var i =0; i < docs.length; i++) {
                  var data = {                  
                    id: docs[i].id,
                    title: docs[i].title,
                    bid_amount: docs[i].bid_amount,
                    no_of_player: docs[i].no_of_player,
                    two_player_winning: docs[i].two_player_winning,
                    no_of_winner: docs[i].no_of_winner,
                    four_player_winning_1: docs[i].four_player_winning_1,
                    four_player_winning_2: docs[i].four_player_winning_2,
                    four_player_winning_3: docs[i].four_player_winning_3,
                    updated_at: Math.floor(Date.parse(docs[i].updated_at) / 1000) + "",
                    created_at: Math.floor(Date.parse(docs[i].created_at) / 1000) + "",      
                    tournament_interval: docs[i].tournament_interval * 60,
                    server_time:currentDateStamp + ""
                  }
                  tournaments.push(data);
                }

                let roomlist = gamemanager.getroomlist();

                var mydata = {
                    result : 'success',
                    tournaments : tournaments,
                    tournam_length : docs.length,
                };

                //console.log('---- tournaments ---- ', mydata);
                socket.emit('REQ_TOURNAMENT_RESULT', mydata);
            }
            else
            {
                var mydata = {
                    result:'failed'
                };
                socket.emit('REQ_TOURNAMENT_RESULT', mydata);
            }
        }
    });    
}

exports.GetTournamentMembers = function (socket, data) {
    let roomlist = gamemanager.getroomlist();
    let strIds =  data.tournament_ids;
    var tournament_ids = strIds.split(",");    
    var tournamentds = [];
    var results = [];
    for (let i = 0; i < tournament_ids.length; i++)
    {   
        if (tournament_ids[i] != "")
        {
            let key = "" + tournament_ids[i];
            var data = {
                key: "" + tournament_ids[i],
                play_count: 0
            };
            results.push(data);
        }
    }
    
    for (let i = 0; i < roomlist.length; i++)
    {
        let tournament_id = "" + roomlist[i].tournament_id;        
        let player_count = roomlist[i].playerlist.length;
        for (let j = 0; j < results.length; j++)
        {
            if (results[i].key == "" + roomlist[i].tournament_id)
            {
                results[i].play_count += player_count;
                break;
            }
        }
    }

    var mydata = {
        result : 'success',
        members : results,
        length : results.length,
    };
    
    console.log('----- Tournament Memebers ----- ', mydata);
    socket.emit('REQ_TOURNAMENT_MEMBERS', mydata);
}


exports.GetClickedTMmembers = function (io, data) {
    let roomlist = gamemanager.getroomlist();
    let id = data.tournament_id;
    let player_count = 0;
    for (let i = 0; i < roomlist.length; i++)
    {   
        if(roomlist[i].tournament_id.toString() == id)
            player_count += roomlist[i].playerlist.length;
    }

    player_count += 1;

    var mydata = {
        result : 'success',
        tournament_id : data.tournament_id,
        members : player_count,
    };
    
    console.log('----- Click TM Member broadcast ----- ', mydata);
    io.sockets.emit('REQ_CLICKED_TM_MEMBER', mydata);
}
exports.GetTwoPlayerWins = async function (socket, data) {
    console.log("user name is " + data.username);
    let query1 = {"username" : data.username,
                "seat_limit" : "2",
                "game_status" : "Win"};
    let query2 = {"username" : data.username,
                "seat_limit" : "4",
                "game_status" : "Win"};
    let gamehistorys = database.collection('gamehistorys');
  
    gamehistorys.find(query1).toArray(function(err,docs)
    {
        if(err){
            throw err;
        }
        else
        {
            var myData = 
            {
                 twoPlayersWins : docs.length,
            };
            socket.emit("GETTWOPLAYERWINS",myData);
        }
    });
    gamehistorys.find(query2).toArray(function(err,docs)
    {
        if(err){
            throw err;
        }
        else
        {
            var myData = 
            {
                fourPlayersWins : docs.length,
            };
            socket.emit("GETFOURPLAYERWINS",myData);
        }
    });
}




exports.GetJackpots = function (socket, data) {
    let jackpots = database.collection('jackpots');       
    jackpots.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                var mydata = {
                    result : 'success',
                    jackpots : docs,
                    jackpot_length : docs.length,
                };

                //console.log('---- Jackpots ---- ', mydata);
                socket.emit('REQ_JACKPOT_RESULT', mydata);
            }
            else
            {
                var mydata = {
                    result:'failed'
                };
                socket.emit('REQ_JACKPOT_RESULT', mydata);        
            }
        }
    });
}

exports.JoinJackpot = function (socket, data) {
    let userdatas = database.collection('userdatas');
    query = {userid : data.userid};
    userdatas.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            var mydata;
            if(result != null){                
                if((parseInt(result.points) + parseInt(result.winning_amount))< parseInt(data.Entry)){
                    socket.emit('REQ_CHECK_JACKPOT_RESULT');
                    return;
                }
                else
                {
                    let jackpotlist = database.collection('jackpotlist');
                    var query = {userid: data.userid, entry: data.Entry};
                    var updatescores = (parseInt(result.points) - parseInt(data.Entry));
                    // console.log("result point ------- " + result.points + "  " + data.Entry);
                    userdatas.updateOne({userid : data.userid},{ $set:{points:updatescores.toString()}},function(err) {
                        if(err) throw err;
                    });

                    jackpotlist.findOne(query, function(err, result)
                    {
                        if(err)
                            console.log(err);
                        else
                        {
                            var mydata;
                            if(result == null){
                                mydata = {
                                result:'failed' ,
                                jackpotid : data.JackpotID
                                };
                                console.log('>>>>>>>>> Failed >>>>>>>>');
                                socket.emit('REQ_JOIN_JACKPOT_RESULT', mydata);
                                var insertData = {
                                    userid: data.userid,
                                    username : data.username,
                                    jackpotid : data.JackpotID,
                                    entry : data.Entry,
                                    current : data.Current,
                                    total : data.Total,
                                    score : parseInt(data.Score),
                                    winnings : parseInt(data.Winnings),
                                };                
                                jackpotlist.insertOne(insertData);
                            }
                            else
                            {                
                                mydata = {
                                    result:'success',
                                    userid : result.userid,
                                    jackpotid : result.jackpotid,
                                    entry : result.entry,
                                    current : result.current,                                     
                                };
                                socket.emit('REQ_JOIN_JACKPOT_RESULT', mydata);
                            }
                        }
                    });
                }
            }
        }
    });

    
}

exports.CheckJackpotStatus = function (socket, data) {
    let jackpotlist = database.collection('jackpotlist');        
    jackpotlist.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                let myJackpots = docs.filter(function (object) {
                    return (object.userid == data.userid)
                });

                if(myJackpots.length > 0)
                {   
                    var senddata = {
                        result:'success',
                        myJackpot : myJackpots,
                        length : myJackpots.length,
                    };
                    //console.log(">>>> Check jackpot Result >>>> ", senddata );
                    socket.emit('REQ_JACKPOT_CHECK_RESULT', senddata);
                }
                else{
                    var senddata = {
                        result:'failed'
                    };
                    socket.emit('REQ_JACKPOT_CHECK_RESULT', senddata);
                }
            }
            else
            {
                var senddata = {
                    result:'failed'
                };
                socket.emit('REQ_JACKPOT_CHECK_RESULT', senddata);
            }
        }
    });
}

exports.GetMyJackpotInfo = function (socket, data) {
    let jackpotlist = database.collection('jackpotlist');        
    jackpotlist.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                let myJackpots = docs.filter(function (object) {
                    return (object.userid == data.userid)
                });

                if(myJackpots.length > 0)
                {   
                    var senddata = {
                        result:'success',
                        myJackpot : myJackpots,
                        length : myJackpots.length,
                    };
                    //console.log(">>>> Check jackpot Result >>>> ", senddata );
                    socket.emit('REQ_JACKPOT_MYINFO_RESULT', senddata);
                }
                else{
                    var senddata = {
                        result:'failed'
                    };
                    socket.emit('REQ_JACKPOT_MYINFO_RESULT', senddata);
                }
            }
            else
            {
                var senddata = {
                    result:'failed'
                };
                socket.emit('REQ_JACKPOT_MYINFO_RESULT', senddata);
            }
        }
    });
}

exports.UpdateJackpot = function (socket, data) {
    let jackpotlist = database.collection('jackpotlist');        
    var query = {userid: data.userid, jackpotid: data.jackpotid};  
    jackpotlist.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            var mydata;
            if(result == null){
                mydata = {
                  result:'failed'
                };
                console.log('-------- JACKCPOT UPDATE FAILED --------');
                socket.emit('REQ_UPDATE_JACKPOT_RESULT', mydata);
            }
            else
            {
                console.log('result.score : ' + result.score + ' data.score : ' + data.score)
                console.log('current : ' + data.current)

                var score = result.score  + parseInt(data.score);
                
                var current = parseInt(data.current).toString();

                jackpotlist.updateOne(query,{$set:{score:score, current : current}},function(err) {
                    if(err) throw err;
                });

            }
        }
    });
}


exports.GetJackpotWinners = function (io) {
    console.log('--------- Get JackPot Winners ----------');
    let jackpotidlist = {};
    let jackpotInfoList = [];
    let useridList = [];
    let winscoreList = [];
    let jackpots = database.collection('jackpots');
    jackpots.find().toArray(function(err, docs){
        if(err){
            throw err;
        }
        else
        {
            if(docs.length > 0){
                for (let i = 0 ; i < docs.length; i ++){
                    jackpotidlist[docs[i].id] = '';
                }
                
                let _count= 0;
                for (var key in jackpotidlist) {            
                    GetTopScorelist(key, (userid, score, winscore, jackpotinfo)=>{
                        _count++;

                        if(jackpotinfo != null && score != 0 && userid != -1){
                            useridList.push(userid);
                            winscoreList.push(winscore);
                            jackpotInfoList.push(jackpotinfo);
                        }    
                            
                        //console.log('End work!', _count);       

                        if(Object.keys(jackpotidlist).length == _count){                            
                            console.log('************** SEND JACKPOT RESULT TO ALL USERS ************** : ', jackpotInfoList);
                            var mydata = {
                                result:'success',
                                jackpotInfos : jackpotInfoList,
                                length : jackpotInfoList.length,
                            }
                            io.sockets.emit('REQ_JACKPOT_SCORELIST', mydata);

                            UpdateJackPotScore(useridList, winscoreList);
                        }
                    });
                }                
            }
        }
    });
}

async function UpdateJackPotScore(useridList, winscoreList){
    console.log('useridList :  ', useridList);
    console.log('winscoreList : ', winscoreList);
    
    for(let i = 0; i < useridList.length; i++){
        await UpdateScore(useridList[i], winscoreList[i], ()=>{
            console.log('updating jackpot scores----');
        });
    }
}

async function UpdateScore(userid, winScore)
{    
    let userdatas = database.collection('userdatas');        
    var query = {userid: userid};  
    await userdatas.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            if(result != null)
            {
                var score = result.score  + parseInt(winScore);
                userdatas.updateOne(query,{$set:{points : score.toString()}},function(err) {
                    if(err) throw err;
                });
            }
        }
    });

    // await userdatas.updateOne(query,{$inc:{ points : (parseInt(points) - parseInt(winScore)).toString() }},function(err) {
    //     if(err) throw err;
    // });
}


function GetTopScorelist(key, callback)
{
    let jackpotlist = database.collection('jackpotlist').find({jackpotid:key}).sort({score:-1}).limit(1);
    jackpotlist.toArray(function(err, docs){
        if(err){
            throw err;
        }
        else{
            if(docs.length > 0) {     
                let userid = docs[0].userid;           
                let score = docs[0].score;
                let winscore = docs[0].winnings;
                callback(userid, score, winscore, docs[0]);
            }
            else
                callback(-1, -1, null);
        }
    });
}

exports.UpdateBankInfo = function (socket, data) {
    let userdatas = database.collection('userdatas');        
    var query = {userid: data.userid};  
    userdatas.findOne(query, function(err, result)
    {
        if(err)
            console.log(err);
        else
        {
            var mydata;
            if(result == null){
                mydata = {
                  result:'failed'
                };
                socket.emit('REQ_UPDATE_BANKINFO_RESULT', mydata);
            }
            else
            {
                userdatas.updateOne(query,{$set:{ acc_holder: data.acc_holder, 
                                                    bank_name : data.bank_name, 
                                                    acc_number: data.acc_num,
                                                    ifsc: data.ifsc}},function(err) {
                    if(err) throw err;
                });

                mydata = {
                    result:'success'
                  };

                socket.emit('REQ_UPDATE_BANKINFO_RESULT', mydata);
            }
        }
    }); 
}   
