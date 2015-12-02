// omsmodule.js

// BASE SETUP
// ==============================================

var express = require('express');
var app     = express();
var port    =   process.env.PORT || 8081;

var exphbs = require('express-handlebars');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var restify = require('restify');

// Creates a JSON client
var restClient = restify.createJsonClient({
  url: 'http://localhost:8080/'
});


var routes = require('./routes.js');


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


// Middlewares
// ----------------------------

// route middleware that will happen on every request
router.use( routes.mwLogEveryPage );

// route middleware to validate :uid
router.param('uid', routes.mwValidateUid );


// route middleware to validate :bodycode
router.param('bodycode', routes.mwValidateBodyCode );


// Routes
// -----------------------

// home page route (http://localhost:8080)
router.get('/', routes.renderIndex );

// about page route (http://localhost:8080/about)
router.get('/about', routes.renderAbout );

// route with parameters (http://localhost:8080/hello/:name)
router.get('/user/:uid', routes.getMember, routes.getMemberships, routes.renderProfile );



router.get('/login', routes.renderLogin );


router.get('/applicants/:bodycode', routes.getApplicationsToBody, routes.renderApplicationsToBody );

router.get('/members/:bodycode', routes.getMembersOfBody, routes.renderMembersOfBody );


router.get('/register', routes.renderRegisterNewUser );

router.post('/useradd', routes.addNewUser );

// apply the routes to our application
app.use('/', router);


// START THE SERVER
// ==============================================
app.listen(port);
console.log('Magic happens on port ' + port);