// omsmodule.js

// BASE SETUP
// ==============================================

var config = require('./config/config.json');

var express = require('express');
var app     = express();
var port    = process.env.PORT || config.port;

var exphbs = require('express-handlebars');

var passport = require('passport');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)

var session      = require('express-session');
var cookieSettings = {
    secret: config.secret, // session secret
    saveUninitialized: false,
    rolling: false,
    cookie: {maxAge: 21500000} // (in milliseconds) - expires in 6 hours (minus 100 sec)
};
app.use( session( cookieSettings ) ); 
app.use( passport.initialize() );
app.use( passport.session() ); // persistent login sessions


var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var restify = require('restify');

//var routes = require('./app/routes.js');//this line is probably duplicated and unnecessary so i commented it out
require('./config/passport')(passport)

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


require('./app/routes.js')(router, passport);


// apply the routes to our application
app.use('/', router);


// START THE SERVER
// ==============================================
app.listen(port);
console.log('Magic happens on port ' + port);