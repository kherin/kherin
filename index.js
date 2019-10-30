var express = require('express');
var app = express();

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('Hello I"m kherin and i sit next to a racist !');
});

app.listen(PORT, () => {});