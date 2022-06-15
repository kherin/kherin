var express = require("express");
var app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get("/", (_, res) => {
  res.status(200);
  res.send({
    foo: "bar",
  });
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
