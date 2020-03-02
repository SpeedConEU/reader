const express = require('express');
const bodyparser = require('body-parser');
const request = require('request-promise-native').defaults({ jar: true });
const cheerio = require('cheerio');
const config = require('./config');
const app = express();

app.use(express.static('static'));
let toBeRead = [];
let bids = [];

app.use(bodyparser.json());
app.get('/donations', (req, res) => {
    res.header().set('Content-Type', 'application/json');
    res.header().set('Cache-Control', 'no-cache, no-transform');
    res.send(toBeRead);
});

app.get('/bids', (req, res) => {
    res.header().set('Content-Type', 'application/json');
    res.header().set('Cache-Control', 'no-cache, no-transform');
    res.send(bids);
});


app.get('/edit', (req, res) => {
    if (!req.query.id && !req.query.action) {
        res.status(400);
        return;
    }

    console.log(`marking donation with id ${req.query.id} with status ${req.query.action}`);

    let readstate, commentstate;

    if (req.query.action === 'read') {
        readstate = 'READ';
        commentstate = 'APPROVED';
    } else if (req.query.action === 'approve') {
        readstate = 'PENDING';
        commentstate = 'APPROVED';
    } else if (req.query.action === 'deny') {
        readstate = 'IGNORED';
        commentstate = 'DENIED';
    } else if (req.query.action === 'revert') {
        readstate = 'PENDING';
        commentstate = 'PENDING';
    } else {
        res.sendStatus(400);
    }

    // http://localhost:8000/admin/edit_object?type=donation&id=585&readstate=READ&commentstate=APPROVED&
    // http://localhost:8000/admin/edit_object?type=donation&id=585&readstate=IGNORED&commentstate=DENIED&
    // http://localhost:8000/admin/edit_object?type=donation&id=585&readstate=READY&commentstate=APPROVED&

    request({
        method: 'GET',
        uri: config.tracker.editurl,
        qs: {
            type: 'donation',
            id: req.query.id,
            readstate,
            commentstate
        }
    })
        .then(() => {
            res.sendStatus(204);
            console.log('ok');
        })
        .catch(e => {
            res.sendStatus(500).send(e);
            console.log(e.message);
        });
});

console.log('スタート');

function trackerLogin() {
    return new Promise((resolve, reject) => {
        request({
            uri: config.tracker.loginurl,
            transform(body) {
                return cheerio.load(body);
            }
        }).then($ => request({
            method: 'POST',
            uri: config.tracker.loginurl,
            form: {
                username: config.tracker.username,
                password: config.tracker.password,
                csrfmiddlewaretoken: $('#login-form > input[name="csrfmiddlewaretoken"]').val()
            },
            headers: {
                Referer: config.tracker.loginurl
            },
            resolveWithFullResponse: true,
            simple: false
        })).then(() => {
            resolve();
        }).catch(e => reject(e));
    });
}

function getDonations() {
    return request('http://localhost:8000/search/?event=5&type=donation&transactionstate=COMPLETED&readstate=PENDING')
        .then(body => {
            const jsonbody = JSON.parse(body);

            jsonbody.reverse();
            console.log(`${jsonbody.length} ${jsonbody.length === 1 ? 'donation' : 'donations'} to be read`);
            toBeRead = jsonbody;
        })
        .catch(e => e);
}

function getBids() {
    return request('http://localhost:8000/search/?event=5&type=bidtarget&state=PENDING')
        .then(body => {
            const jsonbody = JSON.parse(body);

            bids = jsonbody;
        });
}

(async () => {
    console.log('logging into tracker');
    await trackerLogin();
    console.info(`Logged into tracker as ${config.tracker.username}`);

    console.log('starting refresh interval');
    getDonations();
    setInterval(getDonations, 5000);
    setInterval(getBids, 5000);
    console.log('Webserver started on :8080');
    app.listen(8080);
})();
