import * as express from 'express';
import { config } from 'dotenv';
import * as sqlite3 from 'sqlite3';
import { STATES } from './constants'
import { invalid_request, DataValidator, ErrorReport, server_error, ErrorSeverity } from './error_responds'


config();

const sqlite = sqlite3.verbose();
const db = new sqlite.Database('data.db', (err) => {
    if (err) {
        new ErrorReport(ErrorSeverity.CRITICAL, err.name, err.message).fileReport('Error while initializing db')
    }
});

const app = express();
const PORT = Number(process.env.PORT) | 3000;


app.get('/api/:year_start/:year_end/length', (req, res) => {
    
    let success = DataValidator.validate_years(req.params.year_start, req.params.year_end, (error_reason) => {
        invalid_request(res, error_reason);
    })

    success = success && DataValidator.validate_states(req.query, (error_reason) => {
        invalid_request(res, error_reason);
    })

    if (!success) {
        return;
    }

    const year_start: number = Number(req.params.year_start);
    const year_end: number = Number(req.params.year_end);
    const state_bit: number = STATES[req.query.state as string]


    db.get('SELECT start, end FROM start_end WHERE year_start = ? AND year_end = ? AND states & ? = ?', [year_start, year_end, state_bit, state_bit], (err, row) => {
        if (err) {
            new ErrorReport(ErrorSeverity.CRITICAL, err.name, err.message, {
                year_start: year_start,
                year_end: year_end,
                state_bit: state_bit
            }).fileReport(`Error occurred while handling request from ${req.socket.remoteAddress}`);

            server_error(res);
        }
        console.log(row)

        let result: unknown | undefined = row;

        if (!result) {
            result = {};
        }

        const file_report = () => new ErrorReport(ErrorSeverity.WARNING, 'DB_SUSPICIOUS', 'Data from db not as expected', result as object);
        if (Object.keys(row as object).length == 0 || Object.keys(row as object).includes('start') || Object.keys(row as object).includes('start')) {
            file_report();            
        }
        

        res.json({
            success: true,
            data: {

            }
        })
    })
})

app.get('/api/:year_start/:year_end/holidays', (req, res) => {
    

    res.json(`holiday!${req.params.year_start} ${req.params.year_end} ${Object.keys(req.query)}`);
})  

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}...`)
} )