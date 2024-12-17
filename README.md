# ProgBot
A simple web-app to tell you how far you have progressed in the school-year in **Austria**

## How it works
1. First, you should run the `scrape_gv.py`-script to init the db with data which will than be exposed through an api-endpoint
2. The frontend requests the data now from the api-endpoint to render it out

## Filling the db
We will make a request to `https://www.bmbwf.gv.at/Themen/schule/schulpraxis/termine/ferientermine_{year_start}_-_{year_end}.html`  
It should be noted that the devs creating that page were so kind to put the data into main, so its not to hard to parse it with `bs4`  
We can now extract the data for this year  
The years to search for can be found in `config.cfg` (created on first run)
The first year possible is `20/21`, due to variation in the html markup, which means that `21/22` is the first one that you will actually get, since we need the last day of the summer-break to calculate the length of the school-year
  
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
- **`states`:** `integer`, bitmask, refer to [Storing states as a bit-mask](#storing-states-as-a-bit-mask)
- **`start`:**: `string` First day of the holiday
- **`end`:** `string` Last day of the holiday

**`start_end`:**
```
+------------------------------------+
| year | states |  start   |   end   |
+------------------------------------+
```
- **`year`:** `string`, as in `holiday`, unique
- **`states`:** `integer`, bitmask, refer to [Storing states as a bit-mask](#storing-states-as-a-bit-mask)
- **`start`:** `date`, start of the school-year
- **`end`:** `date`, end of the school-year

### Storing states as a bit-mask
**Mappings:**
| State  | Bit |
| -----  | --- |
| Styria 🔛🔝🔥  | `2^0`   |
| Carinthia  | `2^1`  |
| Salzburg | `2^2` |
| Tirol | `2^3` |
| Burgenland | `2^4` |
| Upper austria | `2^5` |
| Lower austria  | `2^6` |
| Vorarlberg | `2^7` |
| Vienna | `2^8` |
| all states | `2^9` |

Adding a state is pretty simple.
We just or-combine the bitmask and the bit-mapping of the state:
```
0b0000 0000 | 0b0000 0010 = 0b0000 0010
```

Now we only need to decode the bitmask. The part which is important the most is how to check if a state is in the bit mask. We can do that by and-comparing the bitmapping of each state, which will give us either `1` or `0` (`True` or `False`):
```
0b0000 0010 & 0b0000 0010 = 0b0000 0001
```