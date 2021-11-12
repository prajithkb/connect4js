var proxy = require('express-http-proxy');
var express = require('express')
var app = express();
const { exec } = require('child_process');
var winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `proxy.log`
        //
        new winston.transports.File({
            filename: 'proxy.log',
            format:
                winston.format.combine(winston.format.timestamp({
                    format: 'YYYY-MM-DD hh:mm:ss A ZZ'
                }), winston.format.json()),
            handleExceptions: true
        }),
    ],
});

function startAllProcess() {
    console.log("Starting Webpack...");
    // start the static server
    let httpServer = exec('npm run start', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    httpServer.stdout.setEncoding('utf8');
    httpServer.stdout.on('data', function (data) {
        //Here is where the output goes
        console.log(`Webpack: ${data}`);
    });

    httpServer.stderr.setEncoding('utf8');
    httpServer.stderr.on('data', function (data) {
        console.log(`Webpack: ${data}`);
    });

    httpServer.on('close', function (code) {
        console.log('closing code: ' + code);
        console.log('Full output of script: ', scriptOutput);
    });


    process.on('SIGINT', function () {
        console.log('Killing servers..');
        httpServer.kill("SIGINT");
        console.log('Done..');
        process.exit();
    });

}

startAllProcess();

app.use(express.json());
app.use((req, _res, next) => {
    logger.info(`${req.method} path:[${req.path}] headers:[${JSON.stringify(req.headers)}] body:[${req.body}]`)
    next();
});

app.post('/log', (req, res) => {
    let message = JSON.parse(req.body.message);
    console.log(`${JSON.stringify(message)}`);
    res.sendStatus(200);
});


// Default
app.use('/', proxy('http://localhost:8080'))
app.listen(8000);
console.log("Listening on 8000");