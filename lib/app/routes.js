// routes.js
module.exports = function(router, passport) {
// BASE SETUP
// ==============================================
var assert  = require('assert');

var restify = require('restify');

// Creates a JSON client
var restClient = restify.createJsonClient({
  url: 'http://localhost:8080/'
});

// ROUTES
// ==============================================



// Middlewares
// ----------------------------

// route middleware that will happen on every request
function mwLogEveryPage(req, res, next) {

    // log each request to the console
    console.log(req.method, req.url);

    // continue doing what we were doing and go to the route
    return next(); 
};

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


// Routes and pre-functions
// -----------------------

function getMemberships(req, res, next){

    console.log("chain membership");
    restClient.get('/users/'+req.uid+'/memberships', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.membership = restobj;

      return next();
    });
};

function getMember(req, res, next){

    console.log("chain member");
    restClient.get('/users/'+req.uid, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj[0]); //The core always returns an array (even for single element)

      req.user = restobj[0];

      return next();
    });
};

function getApplicationsToBody(req, res, next){

    console.log("chain applications");
    restClient.get('/bodies/'+req.bodycode+'/applications', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.applicants = restobj;

      return next();
    });
};

function getMembersOfBody(req, res, next){

    console.log("chain members of body");
    restClient.get('/bodies/'+req.bodycode+'/members', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.members = restobj;

      return next();    
    });
};

function addNewUser(req, res) { //TODO: split controller and view
    //validate req
    var userData = JSON.parse(JSON.stringify(req.body)); //deep copy
    delete userData.antenna;
    //userData.givenName  = req.body.givenName;
    //userData.sn         = req.body.sn;
    userData.cn = userData.givenName + ' ' + userData.sn;
    //userData.birthDate = req.body.birthDate;
    //userData.userPassword = req.body.userPassword;
    //userData.mail = req.body.mail;
    //userData.tShirtSize = req.body.tShirtSize;

    console.log(userData); 
    console.log("^user^ vv-body-vv");
    console.log(req.body);

    //use API
    restClient.post('/users/create', userData, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      //check if error
      console.log('%d -> %j', restres.statusCode, restres.headers);
      console.log('%j', restobj);
      //send response accordingly
      res.render('error', {"message": "Registration woot woot"});
    });
};

// routes final stage
//----

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

// route middleware that will happen on every request
router.use( mwLogEveryPage );

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

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}


router.get('/login', renderLogin );

router.post('/login', passport.authenticate('ldapauth', {
        //session: false,
        successRedirect : '/user/fabrizio.bellicano', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true, // allow flash messages
        successFlash : 'ba-dum tss'
    }));

router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
});


router.get('/applicants/:bodycode', getApplicationsToBody, renderApplicationsToBody );

router.get('/members/:bodycode', getMembersOfBody, renderMembersOfBody );


router.get('/register', renderRegisterNewUser );

router.post('/useradd', addNewUser );

}