import { Response } from 'express';
import { STATES } from './constants';
type length_api_error_reason = 'FORMAT' | 'YEAR_SPAN_INVALID' | 'YEAR_START_TOO_SMALL' | 'END_YEAR_TOO_BIG' | 'INVALID_YEAR_ORDER';
type state_error_reason = 'INVALID_STATE' | 'NO_STATE_PROVIDED' | 'INVALID_QUERY';

export function invalid_request(res: Response, reason: length_api_error_reason | state_error_reason) {
    res.json({
        success: false,
        reason: reason   
    }).status(400);
}

export function server_error(res: Response) {
    res.json({
        success: false,
        reason: 'SERVER_ERROR'
    }).status(500);
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

        if (Number(year_end) - Number(year_start) > 1) {
            error_callback('YEAR_SPAN_INVALID');
            return false;
        }

        return true;
    },

    validate_states(query: object, error_callback : (reason: state_error_reason) => void): boolean{
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

export enum ErrorSeverity  {
    WARNING, CRITICAL
}

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