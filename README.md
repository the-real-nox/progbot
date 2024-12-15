# ProgBot
A simple web-app to tell you how far you have progressed in the school-year in **Austria**

## How it works
1. First, you should run the `scrape_gv.py`-script to init the db with data which will than be exposed through an api-endpoint
2. The frontend requests the data now from the api-endpoint to render it out

## Filling the db
We will make a request to `https://www.bmbwf.gv.at/Themen/schule/schulpraxis/termine/ferientermine_{year_start}-{year_end}.html`  
It should be noted that the devs creating that page were so kind to put the data into main, so its not to hard to parse it with `bs4`  
We can now extract the data for this year

### DB-architecture
For local file-storage we use `sqlite3`  
The following tables are present:  
**`holidays`:**
```
+-----------------------------------+
| year | holiday_name | start | end |
+-----------------------------------+
```
- **`Year`:** `string` (e.g. "24/25")
- **`holiday_name`:** `string` (e.g. "Weihnachten")
- **`start`:**: `string` First day of the holiday
- **`end`:** `string` Last day of the holiday

**`start_end`:**
```
+-----------------------------------+
|  year |   start     |     end     |
+-----------------------------------+
```
- **`year`:** `string`, as in `holiday`, unique
- **`start`:** `date`, start of the school-year
- **`end`:** `date`, end of the school-year