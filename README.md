# ProgBot
A simple web-app to tell you how far you have progressed in the school-year in **Austria**

## How it works
1. First, you should run the `scrape_gv.py`-script to init the db with data which will than be exposed through an api-endpoint
2. The frontend requests the data now from the api-endpoint to render it out

Note that the duration of holidays include weekends (first saturday and last sunday).

## Filling the db
We will make a request to `https://www.bmbwf.gv.at/Themen/schule/schulpraxis/termine/ferientermine_{year_start}_-_{year_end}.html`  
It should be noted that the devs creating that page were so kind to put the data into main, so its not to hard to parse it with `bs4`  
We can now extract the data for this year  
The years to search for can be found in `config.cfg` (created on first run)
The first year possible to parse is `20/21`, due to variation in the html markup, which means that `21/22` is the first one that you will actually get and are able to specify in the config-file, since we need the last day of the summer-break a year before to calculate the length of the school-year.
  
Also important to note is that the day a holiday starts is **the saturday before**.

### DB-architecture
For local file-storage we use `sqlite3`  
The following tables are present:  
**`holidays`:**
```
+--------------------------------------------+
| year | holiday_name | states | start | end |
+--------------------------------------------+
```
- **`Year`:** `string` (e.g. "24/25")
- **`holiday_name`:** `string` (e.g. "Weihnachten")
- **`states`:** `integer`, bit-masks, refer to [Storing states as a bit-mask](#storing-states-as-a-bit-mask)
- **`start`:**: `string` First day of the holiday
- **`end`:** `string` Last day of the holiday

**`start_end`:**
```
+------------------------------------+
| year | states |  start   |   end   |
+------------------------------------+
```
- **`year`:** `string`, as in `holiday`, unique
- **`states`:** `integer`, bit-masks, refer to [Storing states as a bit-mask](#storing-states-as-a-bit-mask)
- **`start`:** `date`, start of the school-year
- **`end`:** `date`, end of the school-year

### Storing states as a bit-mask
**Mappings:**
| State         | Bit   |
| ------------- | ----- |
| Styria 🔛🔝🔥    | `2^0` |
| Carinthia     | `2^1` |
| Salzburg      | `2^2` |
| Tirol         | `2^3` |
| Burgenland    | `2^4` |
| Upper austria | `2^5` |
| Lower austria | `2^6` |
| Vorarlberg    | `2^7` |
| Vienna        | `2^8` |
| all states    | `2^9` |

Adding a state is pretty simple.
We just or-combine the bit-masks and the bit-mapping of the state:
```
0b0000 0000 | 0b0000 0010 = 0b0000 0010
```

Now we only need to decode the bit-masks. The part which is important the most is how to check if a state is in the bit mask. We can do that by and-comparing the bitmapping of each state, which will give us either `1` or `0` (`True` or `False`):
```
0b0000 0010 & 0b0000 0010 = 0b0000 0001
```

### How data is handled on the inside
For every year, the following structure is kept in memory:
```
{
    '<start-year>/<end-year>': {
        'durations_per_state': {
            ...
            'state_bit-masks': (<start-date>, <end-date>),
            ...
        },
        holidays: {
            ...
            '<holiday-name>': {
                ...
                <state-bit-masks>: (<start-date>, <end-date>),
                ...
            }
            ...
        }
    }
}
```

# ⚠️ Usual third-party-data based risks ⚠️
There are always risks of data getting into your script-life-cycle which you are not prepeared for if using third-party data. A few are outlined below:
## Different formats
This is probably the most common one. The format changes and the whole script won't be able to do anything anymore since it doesn't understand the new structure. 
Therefore, the script should be updated.  
But since I don't really plan to update this repo at this point, this must be done by the one who wants to use it.  
Different formats are the exact reason why the first year possible to parse is `20/21`. Before that, everything was organized in a table-structure. Since this is a small
project with an even smaller time to develop it, I didn't account for those dates, and sadly also don't plan to do so in the future.

## Different states the dates of summer-break follow-ups
Determining the length of a school year works like the following:
1. Take the end of the last summer-break
2. Take the start of the current summer-break
3. Be happy

But there are multiple date to take into consideration, since the duration of the summer-break differs from tate to state. At the current point, we just pray that those are the same every year, since we need to compare the bit-masks. If this isn't the case, the script will just give up and crash.
