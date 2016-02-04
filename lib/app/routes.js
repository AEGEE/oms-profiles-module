// routes.js
module.exports = function(router, passport) {
// BASE SETUP
// ==============================================
var assert  = require('assert');

var restify = require('restify');

var config = require('../config/config.json');

var token = require('../config/token.js');

// Creates a REST client talking JSON
var restClient = restify.createJsonClient({
  url: config.rest.url
});

//logging in to the profiles microservice
token.requestAPIToken( {
            'username' : config.module.user,
            'password' : config.module.password
            } ); 

// ROUTES
// ==============================================

// Middlewares
// ----------------------------

// route middleware to validate :uid
function mwValidateUid(req, res, next, uid) {
    // do validation on name here: uid must be something dot something
    
    console.log('doing name validations on ' + uid + ': good? ' + !(uid.match(/^[a-z]{2,15}\.[a-z]{2,15}$/)==null));

    // once validation is done save the new item in the req
    req.uid = uid;

    // go to the next thing
    return next(); 
};

// route middleware to validate :bodycode
function mwValidateBodyCode(req, res, next, bodycode) {
    // do validation on name here
    // blah blah validation
    // log something so we know its working
    console.log('doing name validations on ' + bodycode);

    // once validation is done save the new item in the req
    req.bodycode = bodycode;
    // go to the next thing
    return next(); 
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated()){ 
      return next(); 
    }

    console.log("request unauthenticated");
    // if they aren't redirect them to the home page
    res.redirect('/');
}

function doPassportLogin(req, res, next) {
  passport.authenticate('ldapauth', 
        {
        failureRedirect: '/login',
        }, 
      function(err, user, info) {
          if (err) {
            return next(err); // will generate a 500 error
          }
          if (! user) {
            return renderSuccessError(req, res, {'outcome': 'error', 'message': 'authentication problem'});//TODO use info object for more insight of the problem
          }
          
          if (req.body.remember_me) { 
            token.issueToken(req.body.uid, function(err, token) {
              if (err) { return next(err); }
              console.log("token issued: "+token);
              res.cookie('remember_me', token, { path: '/', httpOnly: true, maxAge: 604800000 });
              return next();
            }); 
          }else{
            req.login(user, function(error) {
              if (error) { return next(error); }
              return next();
            });
          }

        })(req, res, next)
};

// Routes and pre-functions
// -----------------------

function getMemberships(req, res, next){

    console.log("chain membership");

    var options = {
      'path': '/users/'+req.uid+'/memberships',
      'headers': {
        'x-access-token': token.APItoken
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      //console.log('\n %j \n', restobj); 
      req.membership = restobj;
      return next();
    });
};

function getMember(req, res, next){

    console.log("chain member");

    var options = {
      'path': '/users/'+req.uid,
      'headers': {
        'x-access-token': token.APItoken
      }
    }; 

    restClient.get(options, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      //console.log('\n %j \n', restobj[0]); //The core always returns an array (even for single element)
      req.user = restobj[0]; //FIXME: passport automagically sets it up?
                            //also if I look for a member that is not me, then 
                            //user is set to this other guy (although for now req.user is not used)

      return next();
    });
};

function getApplicationsToBody(req, res, next){

    console.log("chain applications");

    var options = {
      'path': '/bodies/'+req.bodycode+'/applications',
      'headers': {
        'x-access-token': token.APItoken
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      //console.log('\n %j \n', restobj); 
      req.applicants = restobj;
      return next();
    });
};

function getMembersOfBody(req, res, next){

    console.log("chain members of body");

    var options = {
      'path': '/bodies/'+req.bodycode+'/members',
      'headers': {
        'x-access-token': token.APItoken
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      //console.log('\n %j \n', restobj); 
      req.members = restobj;
      return next();    
    });
};

function addNewUser(req, res) { //TODO: split controller and view
    //validate req
    var userData = JSON.parse(JSON.stringify(req.body)); //deep copy
    delete userData.antenna;
    userData.cn = userData.givenName + ' ' + userData.sn;

    var options = {
      'path': '/users/create',
      'headers': {
        'x-access-token': token.APItoken
      }
    };

    //use API
    restClient.post(options, userData, function(resterr, restreq, restres, restobj) {
      var message = { 'outcome': 'success', 'message': 'Registration woot woot'}
      
      //check if error
      if(resterr){
        message.outcome = 'error';
        message.message = resterr.body;
        console.log(resterr.body);
        assert.ifError(resterr);
      }
      
      console.log('%d -> %j', restres.statusCode, restres.headers);
      console.log('%j', restobj);

      //send response accordingly
      renderSuccessError(req, res, message);
    });
};

//Membership data are received in an encoded key-value format:
//KEY: memberType-{{uid}}-{{bodyCode}}
//VALUE: {{memberType}}
function processMembership(req, res){

  var userData = req.body;

  console.log(userData);

  var modifications = [];

  for (var key in userData){
    if( key !== 'uid' && key !== 'bodyCode' ){
      console.log(key);
      if(userData[key] !== 'Applicant' ){ //only new modifications will trigger an API call
        modifications.push({ 'uid': key.split('-')[1], 'memberType': userData[key], 'bodyCode': key.split('-')[2] });
      }
    }
  }

  console.log(modifications);

  var options = {
      'path': null,
      'headers': {
        'x-access-token': token.APItoken
      }
    };

  //FOR EACH MEMBER TO MODIFY, do an api call
  //use API (FIXME: Is an error message spotted?)
  var message = { 'outcome': 'success', 'message': 'Confirmation woot woot'}
  modifications.forEach(function(entry){
    console.log(entry);

    options.path = '/users/'+entry.uid+'/memberships/'+entry.bodyCode+'/modify';

    restClient.post(options, entry, function(resterr, restreq, restres, restobj) {
        message = { 'outcome': 'success', 'message': 'Confirmation woot woot'}
      
        //check if error
        if(resterr){
          message.outcome = 'error';
          message.message = resterr.body;
          assert.ifError(resterr);
        }
        
        console.log('%d -> %j', restres.statusCode, restres.headers);
        console.log('%j', restobj);
      });
  });

  //send response accordingly
  renderSuccessError(req, res, message); 
};


// routes final stage
//----

function renderSuccessError(req, res, message){
  message = message || { 'outcome': 'success', 'message': 'woot woot'}
  res.render(message.outcome, message);
};

function renderProfile(req, res) {
  res.render('profile', 
      {
          title: 'Profile of '+req.uid, 
          user: req.user, 
          membership: req.membership 
      });    
};

function renderLogin(req, res) {
  res.render('signin', 
      {
          title: "Login"
      });
};

function renderApplicationsToBody(req, res) {        
  res.render('applicants', 
      {
          title: 'List of applicants to '+req.bodycode, 
          bodyCode: req.bodycode, 
          applicant: req.applicants 
      });
};

function renderMembersOfBody(req, res) {        
  res.render('members', 
      {
          title: 'List of members of '+req.bodycode, 
          bodyCode: req.bodycode, 
          member: req.members 
      });
};

function renderRegisterNewUser(req, res) {
  res.render('register', 
      {
          title: 'register new user',
          layout: 'public'
      });
};

function renderHome(req, res) {
  var activeHome = true;
  res.render('home', {layout: 'real-home-layout'});
};

function renderIndex(req, res) {
  var activeHome = true;
  res.render('index', activeHome);
};

function renderAbout(req, res) {
  var activeAbout = true;
  res.render('about', activeAbout );
};

function renderContact(req, res) {
  var activeContact = true;
  res.render('contact', activeContact );
};


// Assigning routes:
// Middlewares
// ----------------------------

// route middleware to validate :uid
router.param('uid', mwValidateUid );

// route middleware to validate :bodycode
router.param('bodycode', mwValidateBodyCode );


// Routes
// -----------------------

// home page route (http://localhost:8801)
router.get('/', renderHome );
router.get('/index', renderIndex );

// about page route (http://localhost:8801/about)
router.get('/about', renderAbout );
router.get('/contact', renderContact );

// route with parameters (http://localhost:8801/hello/:name)
router.get('/user/:uid', isLoggedIn, getMember, getMemberships, renderProfile );

router.get('/login', renderLogin );
router.post('/login', doPassportLogin,
        function(req,res){
          res.redirect('/user/' + req.body.uid);
        });

router.get('/logout', function(req, res) {
        // clear the remember me cookie when logging out
        res.clearCookie('remember_me');
        req.logout();
        res.redirect('/index');
});


router.get('/applicants/:bodycode', isLoggedIn, getApplicationsToBody, renderApplicationsToBody );

router.get('/members/:bodycode', isLoggedIn, getMembersOfBody, renderMembersOfBody );


router.get('/register', renderRegisterNewUser );

router.post('/useradd', addNewUser );

router.post('/applications/processmembership', isLoggedIn, processMembership );

router.post('/members/modifymembership', isLoggedIn, processMembership );

}