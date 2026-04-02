var MongoClient = require("mongodb").MongoClient;
// var URL = "mongodb+srv://royallifemart:PJ3NJqtPv2dUT1ph@royalludo.2xczupv.mongodb.net/?retryWrites=true&w=majority";
var URL = process.env.MONGO_URL || "mongodb://localhost:27017/luduBackend";

var state = {
  db: null,
};

exports.connect = function (done) {
  if (state.db) return done();

  MongoClient.connect(
    URL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    function (err, client) {
      if (err) return done(err);
      var db = client.db("RoyalGame");
      state.db = db;
      done();
    }
  );
};

exports.get = function () {
  return state.db;
};

exports.close = function (done) {
  if (state.db) {
    state.db.close(function (err, result) {
      state.db = null;
      state.mode = null;
      done(err);
    });
  }
};
