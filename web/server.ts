import * as express from 'express';
import { config } from 'dotenv';
import * as sqlite3 from 'sqlite3';
import { ErrorReport, base_validation, file_report_on_db_error } from './server/error_handling'
import { join } from 'path';


config();

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(join(__dirname, '..', 'data.db'), (err) => {
    if (err) {
        new ErrorReport('CRITICAL', err.name, err.message).fileReport('Error while initializing db')
    }
});

const app = express();
const PORT = Number(process.env.PORT) | 80;



app.get('/api/:year_start/:year_end/duration', (req, res) => {

    const validated = base_validation(req, res);

    if (!validated) {
        return;
    }

    db.get('SELECT start, end FROM durations WHERE year_start = ? AND year_end = ? AND states & ? = ?', [validated.year_start, validated.year_end, validated.states_bitmask, validated.states_bitmask], (err: Error, row: object) => {
        if (err) {
            file_report_on_db_error(req, res, err, validated)
        }

        let result = row;

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
        });
    })
})

app.get('/api/:year_start/:year_end/holidays', (req, res) => {
    const validate = base_validation(req, res);

    if (!validate) {
        return;
    }

    db.all('SELECT holiday_name, start, end FROM holidays WHERE year_start = ? AND year_end = ? AND states & ? = ?', [validate?.year_start, validate?.year_end, validate?.states_bitmask, validate?.states_bitmask], (err: Error, row: unknown) => {
        if (err) {
            file_report_on_db_error(req, res, err, validate);
        }

        let status: number = 200;
        let result = row;

        if (!row) {
            status = 404;
            result = {};
        }

        res.status(status).json({
            success: true,
            data: result
        })
    })
})

app.use('/', express.static(join(__dirname, 'public'), ))

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`)
})