// config/passport.js

var config = require('./config.json');
var tokenDispatcher = require('./token.js');

// load all the things we need
var LdapStrategy = require('passport-ldapauth');
var RememberMeStrategy = require('passport-remember-me').Strategy;

var OPTS = {
    usernameField: 'uid',
    passwordField: 'pass',
  server: {
        url: config.ldap.url,
        bindDn: config.ldap.admin, //TODO: use less privileged but admin user
        bindCredentials: config.ldap.pass,
        searchBase: 'ou=people,o=aegee,c=eu',
        searchScope: 'one',
        searchFilter: '(uid={{username}})'
    }
};

// expose this function to our app using module.exports
module.exports = function(passport) {


    passport.use(new LdapStrategy(OPTS));

    // Remember Me cookie strategy
    //   This strategy consumes a remember me token, supplying the user the
    //   token was originally issued to.  The token is single-use, so a new
    //   token is then issued to replace it.
    passport.use(new RememberMeStrategy(
      function(token, done) { 
        tokenDispatcher.consumeRememberMeToken(token, function(err, uid) {
          if (err) { return done(err); }
          if (!uid) { return done(null, false); }

          tokenDispatcher.findByID(uid, function(err, user) { //FIXME
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            return done(null, user);
          });

//          var searchDN = 'ou=people, ' + ldap_top_dn;
//          var filter = '(uid='+uid+')';
//          searchLDAP(filter, searchDN, null, 
//                function(res, user) { 
//                  console.log(user);
//                  console.log(done);
//                  if (!user) { return done(null, false); }
//                  return done(null, user[0]);
//                });


        });
      },
      tokenDispatcher.issueToken 
    ));

    //serialisation and deserialisation is necessary if you want a session
    passport.serializeUser(function(user, done) {
      done(null, user);
    });

    //TODO: Something? no, according to 
    //http://stackoverflow.com/questions/30707181/ldap-authentication-using-passport-ldapauth-npm
    //(the fact is that serialise and deserialise are kind of black magic
    // and in other examples was different....)
    passport.deserializeUser(function(user, done) { 
      done(null, user);
    });


};