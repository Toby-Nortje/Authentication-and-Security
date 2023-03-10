require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { authenticate } = require('passport');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', false);
mongoose.connect("mongodb://0.0.0.0:27017/userDB");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user.id);
    });
  });
  
  passport.deserializeUser(function(id, cb) {
    User.findById(id , function(err, user) {
      if (err) { return cb(err); }
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: profile.emails[0].value}, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    

    User.findOrCreate({ facebookId: profile.id, username: profile.displayName}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', function(req, res){
    res.render('home');
});

app.get('/auth/google', 
   passport.authenticate('google', {scope: ['profile', 'email']})
);

app.get('/auth/facebook', 
   passport.authenticate('facebook')
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.route('/login')

.get(function(req, res){
    res.render('login');
})

.post(function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets');
            });
        }
    })
});

app.route('/register')

.get(function(req, res){
    res.render('register');
})

.post(function(req, res){
    User.register({username: req.body.username, active: false}, req.body.password, function(err, user){
        if(err){
            console.log(err);
            res.redirect('/register');
        } else {
            passport.authenticate('local')(req, res, function(){
                res.redirect('/secrets');
            })
        }
    })
});

app.route('/secrets')

.get(function(req, res){
    User.find({'secret': {$ne:null}}, function(err, foundUser){
        if(err) {
            console.log(err);
        } else {
            if(foundUser) {
                res.render('secrets', {usersWithSecrets: foundUser});
            }
        }
    });
});

app.get('/logout', function(req, res){
    req.logout(function(err){
        if(err){
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

app.route('/submit')

.get(function(req, res){
    if (req.isAuthenticated()) {
        res.render('submit');
    } else {
        res.redirect('/');
    }
})

.post(function(req, res){
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function(err, user){
        if(err) {
            console.log(err);
        } else {
            if (user) {
                user.secret = submittedSecret;
                user.save(function(){
                    res.redirect('/secrets')
                });
            }
        }
    });
});


app.listen(3000, function(){
    console.log("Server started successfully");
});