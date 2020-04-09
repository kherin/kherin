var path = require('path');
var express = require('express');
var app = express();


const PORT = process.env.PORT || 5000;

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'src/public')));


app.get('/coronavirus', (req, res) => {
    res.send(
        JSON.stringify(
            [
                {
                    "date": "01 April",
                    "count": 100
                },
                {
                    "date": "02 April",
                    "count": 140
                },
                {
                    "date": "03 April",
                    "count": 150
                },
                {
                    "date": "04 April",
                    "count": 191
                },
                {
                    "date": "05 April",
                    "count": 201
                },
                {
                    "date": "06 April",
                    "count": 231
                },
                {
                    "date": "07 April",
                    "count": 245
                },
                {
                    "date": "08 April",
                    "count": 267
                },
                {
                    "date": "09 April",
                    "count": 281
                },
                {
                    "date": "10 April",
                    "count": 302
                },
            ]
        )
    );
});

app.listen(PORT, () => { });