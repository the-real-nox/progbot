import * as express from 'express';
import { config } from 'dotenv';
import * as sqlite3 from 'sqlite3';
import { STATES } from './constants'
import { invalid_request, DataValidator, ErrorReport, server_error } from './error_responds'
import * as moment from 'moment';


config();

const sqlite = sqlite3.verbose();
const db = new sqlite.Database('data.db', (err) => {
    if (err) {
        new ErrorReport('CRITICAL', err.name, err.message).fileReport('Error while initializing db')
    }
});

const app = express();
const PORT = Number(process.env.PORT) | 3000;

function base_validation( req: express.Request, res: express.Response): {
    year_start: number,
    year_end: number,
    states_bitmask: number

} | undefined {
    let success = DataValidator.validate_years(req.params.year_start, req.params.year_end, (error_reason) => {
        invalid_request(res, error_reason);
    })

    success = success && DataValidator.validate_state(req.query, (error_reason) => {
        invalid_request(res, error_reason);
    })

    if (!success) {
        return;
    }

    return {
        year_start:  Number(req.params.year_start),
        year_end:  Number(req.params.year_end),
        states_bitmask:  STATES[req.query.state as string]
    }
}

app.get('/api/:year_start/:year_end/duration', (req, res) => {

    const validated = base_validation(req, res);

    if (!validated) {
        return;
    }

    db.get('SELECT start, end FROM durations WHERE year_start = ? AND year_end = ? AND states & ? = ?', [validated.year_start, validated.year_end, validated.states_bitmask, validated.states_bitmask], (err, row) => {
        if (err) {
            new ErrorReport('CRITICAL', err.name, err.message, {
                year_start: validated.year_start,
                year_end: validated.year_end,
                state_bit: validated.states_bitmask
            }).fileReport(`Error occurred while handling request from ${req.socket.remoteAddress}`);

            server_error(res);
        }

        let result: object = row as object;

        let status: number = 200;
        if (!result) {
            result = {};
            status = 404;
        } else {
            if (Object.keys(result).length == 0 || !Object.keys(result).includes('start') || !Object.keys(result).includes('end')) {
                new ErrorReport('WARNING', 'DB_SUSPICIOUS', 'Data from db not as expected', result).fileReport(`Error occurred while handling request from ${req.socket.remoteAddress}`);
            }
        }

        res.status(status).json({
            success: true,
            data: result
        })
    })
})

app.get('/api/:year_start/:year_end/holidays', (req, res) => {
    const validate = base_validation(req, res)

    res.json(`holiday!${req.params.year_start} ${req.params.year_end} ${Object.keys(req.query)}`);
})

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`)
})