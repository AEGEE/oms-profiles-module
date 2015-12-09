// routes.js
module.exports = function(router, passport) {
// BASE SETUP
// ==============================================
var assert  = require('assert');

var restify = require('restify');

var token = null; 

// Creates a JSON client
var restClient = restify.createJsonClient({
  url: 'http://localhost:8080/'
});

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
        failureFlash : true, // allow flash messages FIXME they dont work, just remove
        successFlash : 'ba-dum tss'
        }, 
      function(err, user, info) {
          if (err) {
            return next(err); // will generate a 500 error
          }
          if (! user) {
            return renderSuccessError(req, res, {'outcome': 'error', 'message': 'authentication problem'});//TODO use info object for more insight of the problem
          }
          console.log(user);
          
          var credentials = {
            'username' : user.uid,
            'password' : user.userPassword,
            'user' : user,
          };

          return requestToken(req, res, credentials);

      })(req, res, next)
};

function requestToken(req, res, credentials){

    console.log(credentials);

    restClient.post('/authenticate', credentials, function(resterr, restreq, restres, restobj) {
      var message = { 'outcome': 'success', 'message': 'Login woot woot'}
      
      //check if error
      if(resterr){
        message.outcome = 'error';
        message.message = resterr.body;
        assert.ifError(resterr);
      }

      console.log('response token and other: \n %j \n', restobj); 

      token = restobj.token;
      
      //passport.authenticate invokes this automatically (in theory)
      // in practice I can't figure where I should call "next()"
      // but it is actually cool, because now the logged-in user
      // goes on his profile
      req.login(credentials.user, function(error) {
            if (error) { return next(error); }
            return res.redirect('/user/' + credentials.username);
          });

    });
};

// Routes and pre-functions
// -----------------------

function getMemberships(req, res, next){

    console.log("chain membership");

    var options = {
      'path': '/users/'+req.uid+'/memberships',
      'headers': {
        'x-access-token': token
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); 

      req.membership = restobj;

      return next();
    });
};

function getMember(req, res, next){

    console.log("chain member");

    var options = {
      'path': '/users/'+req.uid,
      'headers': {
        'x-access-token': token
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj[0]); //The core always returns an array (even for single element)

      req.user = restobj[0];

      return next();
    });
};

function getApplicationsToBody(req, res, next){

    console.log("chain applications");

    var options = {
      'path': '/bodies/'+req.bodycode+'/applications',
      'headers': {
        'x-access-token': token
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); 

      req.applicants = restobj;

      return next();
    });
};

function getMembersOfBody(req, res, next){

    console.log("chain members of body");

    var options = {
      'path': '/bodies/'+req.bodycode+'/members',
      'headers': {
        'x-access-token': token
      }
    };

    restClient.get(options, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); 

      req.members = restobj;

      return next();    
    });
};

//FIXME: this needs a token to have a legitimate request, 
// but this token does not come from authentication....
function addNewUser(req, res) { //TODO: split controller and view
    //validate req
    var userData = JSON.parse(JSON.stringify(req.body)); //deep copy
    delete userData.antenna;
    userData.cn = userData.givenName + ' ' + userData.sn;
    
    console.log(userData); 
    console.log("^user^ vv-body-vv");
    console.log(req.body);

    //use API
    restClient.post('/users/create', userData, function(resterr, restreq, restres, restobj) {
      var message = { 'outcome': 'success', 'message': 'Registration woot woot'}
      
      //check if error
      if(resterr){
        message.outcome = 'error';
        message.message = resterr.body;
        assert.ifError(resterr);
      }
      
      console.log('%d -> %j', restres.statusCode, restres.headers);
      console.log('%j', restobj);

      //send response accordingly
      renderSuccessError(req, res, message);
    });
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
            body: req.bodycode, 
            applicant: req.applicants 
        });
};

function renderMembersOfBody(req, res) {        
    res.render('members', 
        {
            title: 'List of members of '+req.bodycode, 
            body: req.bodycode, 
            members: req.members 
        });
};

function renderRegisterNewUser(req, res) {
    res.render('register', 
        {
            title: 'register new user'
        });
};

function renderIndex(req, res) {
    res.render('index');  
};

function renderAbout(req, res) {
    res.send('im the about page!'); 
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

// home page route (http://localhost:8080)
router.get('/', renderIndex );

// about page route (http://localhost:8080/about)
router.get('/about', renderAbout );

// route with parameters (http://localhost:8080/hello/:name)
router.get('/user/:uid', isLoggedIn, getMember, getMemberships, renderProfile );

router.get('/login', renderLogin );
router.post('/login', doPassportLogin );

router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
});


router.get('/applicants/:bodycode', isLoggedIn, getApplicationsToBody, renderApplicationsToBody );

router.get('/members/:bodycode', isLoggedIn, getMembersOfBody, renderMembersOfBody );


router.get('/register', renderRegisterNewUser );

router.post('/useradd', addNewUser );

}