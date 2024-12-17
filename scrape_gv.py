from enum import Enum
import sqlite3
from typing import Generator
from colorama import Fore, Style
from colorama import init as init_colorama
from datetime import date, datetime, timedelta
import configparser
from requests import get
from bs4 import BeautifulSoup
import json
from re import compile
import locale

# Just a quick logo, couldn't find any other ascii-arts related to storage. Props to https://www.asciiart.eu/computers/floppies
MAIN_COLOR = Fore.GREEN
LOGO = MAIN_COLOR + f"""
 _________________
|# {Style.BRIGHT}:           :{Style.RESET_ALL + MAIN_COLOR} #|
|  {Style.BRIGHT}:           :{Style.RESET_ALL + MAIN_COLOR}  |
|  {Style.BRIGHT}:   Prog    :{Style.RESET_ALL + MAIN_COLOR}  |
|  {Style.BRIGHT}:    Bot    :{Style.RESET_ALL + MAIN_COLOR}  |
|  {Style.BRIGHT}:___________:{Style.RESET_ALL + MAIN_COLOR}  |
|     _________   |
|    | __      |  |
|    ||  |     |  |
\____||__|_____|__|
 by the-real-nox"""

# Pretty simple implementation, doesn't have to be too fancy
class CustomLogger():
    def ok(self, msg: str) -> None:
        print(Fore.GREEN + f'[+] {msg}' + Style.RESET_ALL)
    
    def fatal(self, msg: str) -> None:
        print(Fore.RED + Style.BRIGHT + f'[-] {msg}' + Style.RESET_ALL)

    def warn(self, msg: str) -> None:
        print(Fore.YELLOW + f'[!] {msg}' + Style.RESET_ALL)

    def info(self, msg: str) -> None:
        print(Fore.BLACK + Style.BRIGHT + f'[#] {msg}' + Style.RESET_ALL)
logger = CustomLogger()
BASE_URL = 'https://www.bmbwf.gv.at/Themen/schule/schulpraxis/termine/ferientermine_{start_year}_{end_year}.html'

class Config():
    def __init__(self):
        parser = configparser.ConfigParser()
        parser.read('./config.cfg')
        if not parser.has_section('web_scraper'):

            parser['web_scraper'] = {
                'start_year': date.today().year,
                'end_year': date.today().year + 1
            }

            with open('config.cfg', 'w') as conf_file:
                parser.write(conf_file)

        self.start_year = parser.getint('web_scraper', 'start_year') % 2000
        self.end_year = parser.getint('web_scraper', 'end_year') % 2000

        if self.start_year > date.today().year:
            raise ValueError('`start_year` must be smaller than current year!')
        
        if self.start_year > self.end_year:
            raise ValueError('`start_year` must be smaller than `end_year`!')
        
        if self.start_year < 21: # ONLY EDIT WITH CAUTION. SCRIPT PROBABLY BREAKS
            raise ValueError('`start_year` must be 20 at minimum!')

        logger.ok('Config initialized!')

class HolidayDuration:
    
    STATES = {
        'Steiermark': 2**0,
        'Kärnten': 2**1,
        'Salzburg': 2**2,
        'Tirol': 2**3,
        'Burgenland': 2**4,
        'Oberösterreich': 2**5,
        'Niederösterreich': 2**6,
        'Vorarlberg': 2**7,
        'Wien': 2**8,
        'alle Bundesländer': 2**9
    }
    
    def __init__(self, duration: tuple[date, date], states: list[str]):
        self.states = self.__encode_states(states)
        self.duration = duration

    @classmethod
    def __encode_states(cls, states: list[str]):
        bitmask = 0

        for state in states:
            if state not in cls.STATES:
                logger.warn(f'Unknown state: {state}|')
                continue

            bitmask |= cls.STATES[state]

        return bitmask

class SchoolYear:
    def __init__(self, year: tuple[int, int], holidays: dict[str, list[HolidayDuration]], prev_year_sum_durations: list[HolidayDuration] = None):
        self.year = year
        self.durations_per_state = {}
        self.holidays = holidays
        for k, sum_break_duration in holidays['Sommerferien'].items():
            self.durations_per_state.update({k: (None, sum_break_duration.duration[0] + timedelta(days=2))}) # We have to add the 2 days back in, since we have already removed them before
            
        if prev_year_sum_durations != None:
            self.__determine_prev_summer_break_ends(prev_year_sum_durations)
        
        
    def __determine_prev_summer_break_ends(self, prev_year_sum_durations: HolidayDuration):
        for k, sum_break_duration in prev_year_sum_durations.items():
            self.durations_per_state.update({k: (sum_break_duration.duration[1] + timedelta(days=1), self.durations_per_state.get(k)[1])}) # Add 1 to start the school-year on monday, not on sunday
    
    def __repr__(self):
        return json.dumps(self)  

def init_db(cur: sqlite3.Cursor) -> None:
    cur.execute("CREATE TABLE IF NOT EXISTS holidays(year_start INT, year_end INT, holiday_name STRING, states INTEGER,  start DATE, end DATE, UNIQUE(year_start, year_end, states, holiday_name))")
    cur.execute("CREATE TABLE IF NOT EXISTS start_end(year_start INT, year_end INT, states INT, start DATE, end DATE, UNIQUE(year_start, year_end, states))")
    logger.ok('Db initialized!')

def handle_res(start_year: int, end_year: int, prev_year_sum_durations: dict=None) -> SchoolYear:
    res = get(BASE_URL.format(start_year=start_year, end_year=end_year))
    year = f'{start_year}/{end_year}'
    if not res.ok:
        logger.warn(f'Request failed for {start_year}/{end_year}. Got code: {res.status_code}')
        return
    logger.info(f'Got year {year}...')

    soup = BeautifulSoup(res.text, 'html.parser').main
    for tag in soup.find_all(['sup', 'a']):
        tag.extract()

    wanted = soup.find_all(['h3', 'p'])
    holidays_raw = {}
    current = ''
    valid_holidays = [
        'Herbstferien',
        'Sommerferien Hauptferien',
        'Semesterferien',
        'Osterferien',
        'Pfingstferien',
        'Weihnachtsferien'
    ]
    for tag in wanted:
        content = tag.get_text().strip().replace('\xa0', ' ')
        if content in valid_holidays:
            current = content.replace('Sommerferien Hauptferien', 'Sommerferien')
            holidays_raw.update({current: []})
        elif current != '' and content != '':
            holidays_raw.get(current).extend(content.split('\n'))

    pattern = compile(r'^(\d{1,2}\. \w+ \d{4}) bis (\d{1,2}\. \w+ \d{4}), ([A-Za-zöüä ]+(?:, [A-Za-zöüä ]+)*)$')
    date_fmt = '%d. %B %Y'
    holidays: dict[str, HolidayDuration] = {}
    for key, value in holidays_raw.items():
        holiday_durations_per_state = {}
        for el in value: 
            match = pattern.match(el)
            if match != None:
                holiday_duration = HolidayDuration(
                    (
                        datetime.strptime(match[1], date_fmt) - timedelta(days=2), # we show saturday as the first day, not the first school-day which is free
                        datetime.strptime(match[2], date_fmt),
                    ),
                    match[3].replace(' ,', ',').split(', ') # remove spaces which made it through due to mistakes in the html-markup downloaded
                )
                
                holiday_durations_per_state.update({
                    holiday_duration.states: holiday_duration
                })

        holidays.update({key: holiday_durations_per_state})
    
    return SchoolYear((start_year, end_year), holidays, prev_year_sum_durations)

def request_gv(conf: Config, school_years: dict):
    for year in range(conf.start_year - 1, conf.end_year):
        prev_year = (year - 1, year)
        school_year = handle_res(year, year + 1, school_years[prev_year].holidays['Sommerferien'] if prev_year in school_years else None)
        school_years.update({
            school_year.year: school_year
        })

def main():
    locale.setlocale(locale.LC_ALL, 'de_AT.UTF-8') # Make sure that the week-days are parsed in German for the region Austria (Jänner, etc.)
    init_colorama()
    
    print(LOGO + "\n")
    
    # initializing
    conf = Config()
    con = sqlite3.connect('data.db')
    cur = con.cursor()
    init_db(cur)
    # requesting data and parsing it into a format we can work with
    school_years = {}
    request_gv(conf, school_years)
    
    for year, school_year_data in school_years.items():
        for states, duration in school_year_data.durations_per_state.items():
            cur.execute('REPLACE INTO start_end(year_start, year_end, states, start, end) VALUES (?, ?, ?, ?, ?)', (year[0], year[1], states, duration[0], duration[1] + timedelta(50)))

        for holiday_name, holidays_per_state in school_year_data.holidays.items():
            for states, holiday_data in holidays_per_state.items():
                cur.execute('REPLACE INTO holidays(year_start, year_end, holiday_name, states, start, end) VALUES (?, ?, ?, ?, ?, ?)', (year[0], year[1], holiday_name, states, holiday_data.duration[0], holiday_data.duration[1]))
        
        logger.info(f'Created data for {f"{year[0]}/{year[1]}"} in sqlite-db!')
     
    logger.ok(f'Created data in db for {len(school_years)} year{"s" if len(school_years) != 0 else ""}!')
    
    con.commit()
    
if __name__ == '__main__' :
    # try:
       main()
    # except Exception as e:
        # logger.fatal('Quit: %s' % e)