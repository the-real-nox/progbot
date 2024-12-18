import { Response, Request } from 'express';
import { STATES } from './constants';
type length_api_error_reason = 'FORMAT' | 'YEAR_SPAN_INVALID' | 'YEAR_START_TOO_SMALL' | 'END_YEAR_TOO_BIG' | 'INVALID_YEAR_ORDER';
type state_error_reason = 'INVALID_STATE' | 'NO_STATE_PROVIDED' | 'INVALID_QUERY';

export function invalid_request(res: Response, reason: length_api_error_reason | state_error_reason) {
    res.status(400).json({
        success: false,
        reason: reason   
    });
}

export function server_error(res: Response) {
    res.status(500).json({
        success: false,
        reason: 'SERVER_ERROR'
    });
}

type BaseValidation = {
    year_start: number,
    year_end: number,
    states_bitmask: number

} | undefined;

export function base_validation( req: Request, res: Response): BaseValidation {
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

export function file_report_on_db_error(req: Request, res: Response, err: Error, baseValidationResult: BaseValidation) {
    new ErrorReport('CRITICAL', err.name, err.message, {
        year_start: baseValidationResult?.year_start,
        year_end: baseValidationResult?.year_end,
        state_bit: baseValidationResult?.states_bitmask
    }).fileReport(`Error occurred while handling request from ${req.socket.remoteAddress}`);

    server_error(res);
}

export const DataValidator = {
    YEAR_REGEX: /\d{2}/,
    YEAR_BOUNDARY: 20, // min year; look at section `Filling the db` in the README for explanation

    validate_years(year_start: string, year_end: string, error_callback: (reason: length_api_error_reason ) => void): boolean {
        const format = this.YEAR_REGEX.test(year_start) && this.YEAR_REGEX.test(year_end);

        if (!format) {
            error_callback('FORMAT');
            return false;
        }

        if (Number(year_start) < this.YEAR_BOUNDARY) {
            error_callback('YEAR_START_TOO_SMALL');
            return false;
        }

        if (Number(year_end) > new Date().getFullYear() % 2000 + 1) {
            error_callback('END_YEAR_TOO_BIG');
            return false;
        }

        if (Number(year_end) < Number(year_start)) {
            error_callback('INVALID_YEAR_ORDER');
            return false;
        }

        if (Number(year_end) != Number(year_start) + 1) {
            error_callback('YEAR_SPAN_INVALID');
            return false;
        }

        return true;
    },

    validate_state(query: object, error_callback : (reason: state_error_reason) => void): boolean{
        if (Object.keys(query).length > 1) {
            error_callback('INVALID_QUERY');
            return false;
        }

        if (!('state' in query)) {
            error_callback('NO_STATE_PROVIDED');
            return false;
        }

        if (!(query.state as string in STATES)) {
            error_callback('INVALID_STATE');
            return false;
        }

        return true;
    }
}

type ErrorSeverity = 'WARNING' | 'CRITICAL';

export class ErrorReport {
    private data: object | undefined;
    private error_name: string;
    private error_message: string;
    private severity: ErrorSeverity;

    constructor(severity: ErrorSeverity, error_name: string, error_message: string, data?: object) {
        this.data = data
        this.error_name = error_name;
        this.error_message = error_message;
        this.severity = severity
    }

    fileReport(msg: string) {
        console.log(`${msg}:\n ${JSON.stringify(this)}`);
    }
}