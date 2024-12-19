# School-prog 🕛
A simple web-app to tell you how far you have progressed in the school-year in **Austria**

## Getting started
1. Install dependencies:
    - Python: `cd scripts && pip install -r requirements.txt`
    - Node: `npm i`
2. First, you should run the `scripts/db_wizard.py`-script to init the db with data which will than be exposed through an api-endpoint:
```
python ./scripts/db_wizard.py
```
4. Run the express-server:
```
npm run start
```

Note that the duration of the summer-breaks include weekends (first saturday and last sunday).  
Make sure to take a look at [the risks of working with raw 3rd-party-data](#⚠️-third-party-data-based-risks-⚠️).  
For a documentation of the restful-api, look at ["API.md"](./API.md).

## Filling the db
We will make a request to `https://www.bmbwf.gv.at/Themen/schule/schulpraxis/termine/ferientermine_{year_start}_-_{year_end}.html`  
It should be noted that the devs creating that page were so kind to put the data into main, so its not really hard to parse it with `bs4`  
We can now extract the data for this year.  
The years to search for can be found in `config.cfg` (created on first run).
The first year possible to parse is `20/21`, due to variation in the html markup, which means that `21/22` is the first one that you will actually get the duration of, since we need the last day of the summer-break a year before in order to retrieve the length of the school-year.
  
Also important to note is that the day a holiday starts is **the saturday before**.

### DB-architecture
For local file-storage we use `sqlite3`  
The following tables are present:  
**`holidays`:**
```
+-------------------------------------------------------------+
| year_start | year_end | holiday_name | states | start | end |
+-------------------------------------------------------------+
```
- **`year_start`:** `integer`, year in short form (e.g. 24). This is the year the school start in.
- **`year_end`:** `integer`, year in short form (e.g. 25). This is the year the school ends in.
- **`holiday_name`:** `string` (e.g. "Weihnachten")
- **`states`:** `integer`, bit-masks, refer to ["Storing states as a bit-mask"](#storing-states-as-a-bit-mask)
- **`start`:**: `string` First day of the holiday
- **`end`:** `string` Last day of the holiday
- There is a **`UNIQUE`**-constrained combining `year_start`, `year_end`, `holiday_name` and `states` into one single constrained

**`durations`:**
```
+-----------------------------------------------------+
| year_start | year_end | states |  start   |   end   |
+-----------------------------------------------------+
```
- **`year_start`:** `integer`, as in as in **`holidays`**
- **`year_end`:** `integer`, as in as in **`holidays`**
- **`states`:** `integer`, bit-masks, refer to ["Storing states as a bit-mask"](#storing-states-as-a-bit-mask)
- **`start`:** `date`, start of the school-year
- **`end`:** `date`, end of the school-year
- There is also a **`UNIQUE`**-constrained combining `year_start`, `year_end` and `states` into one single constrained

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
| all states    | `2^9 - 1` |

#### Encoding
Adding a state is pretty simple.
We just `OR`-bite-wise combine the bit-mask and the bit-mapping of the state:
```
0b0000 0000 | 0b0000 0010 = 0b0000 0010
```

#### Decoding
he part which is important the most is how to check if a state is in the bit mask. We can do that by `AND`-bite-wise comparing the bit-mapping of each state, which will give us either the bit-mapping we have compared it with or `0` (`True` or `False`):
```
0b0000 0010 & 0b0000 0010 = 0b0000 0010
```

When having all-states as the state, the bit-representation looks like `0b1111 1111`, which mean that all bit-wise `AND`s will return the bit-mapping we have compared with it (which means `True`).

# ⚠️ Third-party-data based risks ⚠️
There are always risks of data getting into your data-life-cycle which you are not prepared for if using third-party data. A few are outlined below:
## Different formats
This is probably the most common one. The format changes and the whole script won't be able to do anything anymore since it doesn't understand the new structure. 
Therefore, the script should be updated to support more types of structures.  
But since I don't really plan to update this repo at this point, this must be done by someone who has some interests in this project.
Different formats are the exact reason why the first year possible to parse is `20/21`. Before that, everything was organized in a table-structure. Since this is a small
project with an even smaller time to develop it, I didn't account for those dates, and sadly also don't plan to do so in the future.

## Different states the dates of summer-break follow-ups
Determining the length of a school year works like the following:
1. Take the end of the last summer-break
2. Take the start of the current summer-break
3. Be happy

But there are multiple dates to take into consideration, since the duration of the summer-break differs from state to state. At the current point, we just pray that those are the same every year, since we need to compare the bit-masks. If there is a mis-match, the script will most likely just give up and crash, or even worse, override clean data with corrupted on.