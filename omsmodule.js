// omsmodule.js

// BASE SETUP
// ==============================================

var express = require('express');
var app     = express();
var port    =   process.env.PORT || 8081;
var assert  = require('assert');

var exphbs = require('express-handlebars');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var restify = require('restify');

// Creates a JSON client
var restClient = restify.createJsonClient({
  url: 'http://localhost:8080/'
});

// VIEWS ENGINE
// ==============================================
app.engine('.hbs', exphbs({defaultLayout: 'single', extname: '.hbs'}));
app.set('view engine', '.hbs');

//Defining middleware to serve static files
app.use('/static', express.static('public'));


// ROUTES
// ==============================================

// we'll create our routes here

// get an instance of router
var router = express.Router();

// route middleware that will happen on every request
router.use(function(req, res, next) {

    // log each request to the console
    console.log(req.method, req.url);

    // continue doing what we were doing and go to the route
    next(); 
});

// home page route (http://localhost:8080)
router.get('/', function(req, res) {
    res.render('index');  
});

// about page route (http://localhost:8080/about)
router.get('/about', function(req, res) {
    res.send('im the about page!'); 
});

// route middleware to validate :name
router.param('uid', function(req, res, next, uid) {
    // do validation on name here
    // blah blah validation
    // log something so we know its working
    console.log('doing name validations on ' + uid);

    // once validation is done save the new item in the req
    req.uid = uid;
    // go to the next thing
    next(); 
});

// route with parameters (http://localhost:8080/hello/:name)
router.get('/user/:uid', function(req, res) {
    restClient.get('/users/'+req.uid, function(resterr, restreq, restres, restobj) {
      assert.ifError(resterr);
      console.log('%j', restobj);
      res.render('profile', {title: 'Profile of '+req.uid, user: restobj[0]});
    }); 
});

// route with parameters (http://localhost:8080/hello/:name)
router.get('/register', function(req, res) {
    res.render('register', {"title": "register new user"});
});

router.post('/useradd', function(req, res) {
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
      console.log('%d -> %j', restres.statusCode, restres.headers);
      console.log('%j', restobj);
      //send response accordingly
      res.render('error', {"message": "coddio"});
    });
    //res.render cannot be here! it's async shit
});

// apply the routes to our application
app.use('/', router);


// START THE SERVER
// ==============================================
app.listen(port);
console.log('Magic happens on port ' + port);