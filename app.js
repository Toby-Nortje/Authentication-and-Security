require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.set('strictQuery', false);
mongoose.connect("mongodb://0.0.0.0:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model('User', userSchema);

app.get('/', function(req, res){
    res.render('home');
});

app.route('/login')

.get(function(req, res){
    res.render('login');
})

.post(function(req, res){
    User.findOne({email: req.body.username}, function(err, result){
        if(result) {
            if(result.password === md5(req.body.password)){
                res.render('secrets');
            } else {
                console.log('No user with that username/password');
                res.redirect('/login');
            }
        } else {
            console.log('No user with that username/password');
            res.redirect('/login');
        }
    });
});

app.route('/register')

.get(function(req, res){
    res.render('register');
})

.post(function(req, res){
    const newUser = new User({
        email: req.body.username,
        password: md5(req.body.password)
    });
    newUser.save(function(err){
        if(err) {
            console.log(err);
        } else {
            console.log("Successfully added new user");
            res.render('secrets');
        }
    })
});




app.listen(3000, function(){
    console.log("Server started successfully");
});