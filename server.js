let express = require('express'), 
app = express();
port = process.env.port || 3000,
bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

let routes = require('./api/routes/dataUserFileRoute');
routes(app);

app.listen(port);

console.log(`API iniciada por el puerto ${port}`);