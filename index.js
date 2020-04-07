var path = require('path');
var express = require('express');
var app = express();


const PORT = process.env.PORT || 5000;

// view engine setup
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'src/public')));


app.get('/', (req, res) => {
    res.send(JSON.stringify(
        [
            {
                "name": "batman",
                "superpower": "money"
            },
            {
                "name": "catwoman",
                "superpower": "agility"
            },
            {
                "name": "kungfu panda",
                "superpower": "double kick"
            }
        ]
    ))
});



app.listen(PORT, () => { });