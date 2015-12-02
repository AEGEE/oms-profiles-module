// routes.js

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
exports.mwLogEveryPage = function(req, res, next) {

    // log each request to the console
    console.log(req.method, req.url);

    // continue doing what we were doing and go to the route
    return next(); 
};

// route middleware to validate :uid
exports.mwValidateUid = function(req, res, next, uid) {
    // do validation on name here: uid must be something dot something
    
    console.log('doing name validations on ' + uid + ': good? ' + !(uid.match(/^[a-z]{2,15}\.[a-z]{2,15}$/)==null));

    // once validation is done save the new item in the req
    req.uid = uid;

    // go to the next thing
    return next(); 
};


// route middleware to validate :bodycode
exports.mwValidateBodyCode = function(req, res, next, bodycode) {
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

exports.getMemberships = function(req, res, next){

    console.log("chain membership");
    restClient.get('/users/'+req.uid+'/memberships', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.membership = restobj;

      return next();
    });
};

exports.getMember = function(req, res, next){

    console.log("chain member");
    restClient.get('/users/'+req.uid, function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj[0]); //The core always returns an array (even for single element)

      req.user = restobj[0];

      return next();
    });
};

exports.getApplicationsToBody = function(req, res, next){

    console.log("chain applications");
    restClient.get('/bodies/'+req.bodycode+'/applications', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.applicants = restobj;

      return next();
    });
};

exports.getMembersOfBody = function(req, res, next){

    console.log("chain members of body");
    restClient.get('/bodies/'+req.bodycode+'/members', function(resterr, restreq, restres, restobj) {

      assert.ifError(resterr);
      console.log('\n %j \n', restobj); //The core always returns an array (even for single element)

      req.members = restobj;

      return next();    
    });
};

exports.addNewUser = function(req, res) { //TODO: split controller and view
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

exports.renderProfile = function(req, res) {
    res.render('profile', 
        {
            title: 'Profile of '+req.uid, 
            user: req.user, 
            membership: req.membership 
        });    
};



exports.renderLogin = function(req, res) {
    res.render('signin', 
        {
            title: "Login"
        });
};


exports.renderApplicationsToBody = function(req, res) {        
    res.render('applicants', 
        {
            title: 'List of applicants to '+req.bodycode, 
            body: req.bodycode, 
            applicant: req.applicants 
        });
};

exports.renderMembersOfBody = function(req, res) {        
    res.render('members', 
        {
            title: 'List of members of '+req.bodycode, 
            body: req.bodycode, 
            members: req.members 
        });
};


exports.renderRegisterNewUser = function(req, res) {
    res.render('register', 
        {
            title: 'register new user'
        });
};


exports.renderIndex = function(req, res) {
    res.render('index');  
};


exports.renderAbout = function(req, res) {
    res.send('im the about page!'); 
};
