# API-Documentation
This is the documentation of the api-backend for the db filled with data by the script described in [README.md](./README.md)

## Routes
### Length-api
```
/api/:year_start/:year_end/length
```
This api-endpoint is used to determine the length of the school-year.  
**Parameters:**
- `year_start`: the year in which the school-year starts. Long form: e.g. 2024
- `year_end`: the year in which the school-year ends. Format as in `year_start`  

**Queries:**
- `?state`: Refer to [Queries](#query-parameters)
<br>


```
/api/:year_start/:year_end/holiday
```
This api-endpoint is used to retrieve the holidays for a specific state.
**Parameters:**
- `year_start`: the year in which the school-year starts. Short form: e.g. 24
- `year_end`: the year in which the school-year ends. Format as in `year_start`  

**Queries:**
- `?state`: Refer to [Queries](#query-parameters)

## Query-Parameters
- `?state`: One of the Austrian federal states you want to get the holidays for  
If no query is provided, data for all states is returned!  

| State-values |
| ------ |
| `styria`        |
| `carinthia`     |
| `salzburg`      |
| `tirol`         |
| `burgenland`    |
| `upper_austria` |
| `lower_austria` |
| `vorarlberg`    |


## Return-formats
Since this is a json-backend api, everything is returned in the json-format.

### Structure
```
{
    success: <true or false>,
    reason: <reason>           // Only on success = false,
    data: {                    // The actual data
        ...
    }
}
```
- **`success`**: `true` when there are no errors, else `false`.
- **`reason`**: Only present if success is `false`. Refer to the [Error-reasons](#error-resons) below.
- **`data`**: The actual data. Refer to [each route above](#routes) in order to lookup what i returns

### Error-reason
**Errors due to invalid year:**
Error-code: `400`
- **`FORMAT`:** An invalid format was provided. Must be in short form: e.g. 24
- **`YEAR_SPAN_INVALID`:** The years must be following each other. That means that the `year_end` can't be a bigger number than the year following the `year_start`.
    - `24` and `25`: Valid
    - `23` and `25`: Invalid
- **`INVALID_YEAR_ORDER`:** The `year_start` provided was bigger than the `year_end`
- **`YEAR_START_TOO_SMALL`:** The `year_start` is smaller than the min allowed year. Refer to ["Fillin the db" in the README](./README.md#filling-the-db) for explanation.
- **`END_YEAR_TOO_BIG`:** The `year_end` was bigger than the following year of the current year

<br>

**Error due to an invalid state/query:**
Error-code: `400`
- **`INVALID_QUERY`:** There was mor than on invalid query-parameters in the request.
- **`NO_STATE_PROVIDED`:** There was no state provided with `?state=...` in the query-parameters.
- **`INVALID_STATE`:** The state provided was not a valid one. Refer to [the valid states above](#query-parameters) for a list.

<br>

**Server-side errors:**
Error-code: `500`
- **`SERVER_ERROR`:** An unexpected error occurred on the server. Contact the one who runs it, since they can read the error in the logs.

### Errors on the server-side
Errors will be logged to `stdout`. The errors are handed up as they are thrown / provided by the db. But there is one exception:
- `DB_SUSPICIOUS`: The db provided data in a format that wasn't expected. Manual intervention is needed. This is the only warning with a severity of `WARNING`, since it make ths api still return `data` (an empty object / `{}`)