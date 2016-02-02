//token.js

var assert = require('assert');
var restify = require('restify');

var config = require('../config/config.json');

// Creates a REST client talking JSON
var restClient = restify.createJsonClient({
  url: config.rest.url
});

// INTERNAL methods 

//from passport-remember-me example
function randomString(len) {
  var buf = []
    , chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    , charlen = chars.length;

  for (var i = 0; i < len; ++i) {
    buf.push(chars[getRandomInt(0, charlen - 1)]);
  }

  return buf.join('');
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function saveRememberMeToken(token, uid, fn) {
  tokens[token] = uid;
  return fn();
}

var tokens = {}; //TODO: take from Redis

//EXPOSED Methods 
function consumeRememberMeToken(token, fn) {
  var uid = tokens[token];
  // invalidate the single-use token
  delete tokens[token];
  return fn(null, uid);
}

function issueToken(user, done) {
  var token = randomString(64);
  saveRememberMeToken(token, user, function(err) {
    if (err) { return done(err); }
    return done(null, token);
  });
}

var APItoken = null;

//logging in to the profiles microservice
function requestAPIToken(credentials){

    restClient.post('/authenticate', credentials, function(resterr, restreq, restres, restobj) {
      //check if error
      if(resterr){
        assert.ifError(resterr);
      }

      console.log('response token and other: \n %j \n', restobj); 

      APItoken = restobj.token;
      exports.APItoken = APItoken;

    });
};

function findByID(uid, next){

  var options = {
    'path': '/users/'+uid,
    'headers': {
      'x-access-token': APItoken
    }
  };
  console.log("findByID");
  restClient.get(options, function(resterr, restreq, restres, restobj) {
    assert.ifError(resterr);
    //console.log('\n %j \n', restobj[0]); //The core always returns an array (even for single element)
    user = restobj[0];
    return next(null, user);
  });

}

exports.issueToken = issueToken;
exports.consumeRememberMeToken = consumeRememberMeToken;
exports.requestAPIToken = requestAPIToken;
exports.findByID = findByID;