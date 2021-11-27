const express = require('express');
const axios = require('axios');
require('dotenv').config();
var CircularJSON = require('circular-json');
var cookieParser = require('cookie-parser');
const util = require('util');


const PORT = process.env.PORT | 3001;
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser());

// zccsubhamoy, testsubhamoy
const SUBDOMAIN = 'zccsubhamoy';
const cookie_name = 'token';

// ZENDESK
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

var access_token = "";

// Middleware
function validateCookie(req, res, next) {
    const {cookies} = req;
    if(cookie_name in cookies) {
        console.log('Session ID exists.');
        if(cookies.token == access_token && access_token != "") {
            next();
            // res.redirect('/ticketscount')
        } else {
            console.log('Session ID not present 1');
            // res.status.send(403).send({ msg: 'Not Auth'});
            res.redirect('/validate');
        }
    } else {
        console.log('Session ID not present 2');
        // res.status(403).send({ msg: 'Not Auth'});
        res.redirect('/validate');
    }
    next();
}


// ROUTES
app.listen(PORT, () => {
    console.log(`Server started at port: ${PORT}`);
});

app.get('/', validateCookie, (req, res) => {
    // res.redirect('/tickets')
});

app.get('/validate', (req, res) => {
    const parameters = {
        'response_type': 'code',
        'redirect_uri': 'http://localhost:3001/handle_user_decision',
        'client_id': CLIENT_ID,
        'scope': 'read write'
    };
    var url = `https://${SUBDOMAIN}.zendesk.com/oauth/authorizations/new?${dict_to_url_encode(parameters)}`;
    res.redirect(url)
});


// Redirect URL
app.get('/handle_user_decision', async function (req, res) {
    const requestToken = req.query.code;
    const parameters = {
        "grant_type": "authorization_code",
        "code": requestToken,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": `http://localhost:3001/handle_user_decision`,
        "scope": "read write"
    }
    await axios({
        method: 'post',
        url: `https://${SUBDOMAIN}.zendesk.com/oauth/tokens?${dict_to_url_encode(parameters)}`,
        headers: {
            "Content-Type": 'application/json'
        }
    })
        .then((response) => {
            access_token = String(CircularJSON.stringify(response));
            access_token = access_token.substring(access_token.indexOf("access_token"));
            access_token = access_token.split(",")[0];
            access_token = access_token.split(":")[1];
            access_token = access_token.substring(1);
            access_token = access_token.substring(0, access_token.length - 1);
            res.cookie(cookie_name, access_token);
            res.send({ "Status" : "Success" });
        })
        .catch(function (error) {
            res.status(error.response && error.response.status || 500).json({
                "errors": [error.response && error.response.data || error.message]
            });
        });
});


app.get('/tickets', validateCookie, async function(req, res) {
    console.log('/tickets :: ' + access_token);
    await axios({
        method: 'get',
        url: `https://${SUBDOMAIN}.zendesk.com/api/v2/tickets.json?page[size]=25`,
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    })
        .then((response) => {
            // console.log("TICKETS RESPONSE: " + CircularJSON.stringify(response));
            var tickets = util.inspect(response);
            console.log("TICKETS RESPONSE: " + tickets);
            res.status(200).send({"ticks": tickets});
        })
        ;
});


app.get('/ticketscount', validateCookie, async function(req, res) {
    await axios({
        method: 'get',
        url: `https://${SUBDOMAIN}.zendesk.com/api/v2/tickets/count.json`,
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    })
        .then((response) => {
            // console.log("TICKETS RESPONSE: " + CircularJSON.stringify(response));
            var tickets_count = util.inspect(response);
            console.log("TICKETS COUNT: " + tickets);
            res.status(200).send({"tickets_count": tickets_count});
        })
        ;
});



// Helper functions
function dict_to_url_encode(params) {
    return Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}


app.