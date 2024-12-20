const selectState = document.getElementById('select-state') as HTMLSelectElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressPCT = document.getElementById('progress-pct') as HTMLSpanElement;
const nextHolidayContainer = document.getElementById('nx-holiday-container') as HTMLDivElement;
const nextName = document.getElementById('nx-name') as HTMLSpanElement;
const nextTimeDelta = document.getElementById('nx-time-delta') as HTMLSpanElement;
const nextDuration = document.getElementById('nx-duration') as HTMLSpanElement;
const holidayBody = document.getElementById('tbody-holidays') as HTMLTableElement;
const holidaysContainer = document.getElementById('holidays-container') as HTMLDivElement;


(window as any).dayjs.extend((window as any).dayjs_plugin_customParseFormat);
const STATES: string[] = [
    'Styria',
    'Carinthia',
    'Tirol',
    'Burgenland',
    'Salzburg',
    'Vorarlberg',
    'Upper Austria',
    'Lower Austria',
    'Vienna'
]

const OUT_DATE_FORMAT = 'DD.MM.YYYY';

function transformState(state: string) {
    return state.replace(' ', '_').toLowerCase();
}


async function getPubIP(): Promise<string> {
    return fetch('https://api.ipify.org/?format=json')
        .then(async (res: Response) => {
            return (await res.json()).ip
        })

}

async function queryBackend(url: string): Promise<any> {
    return await fetch(url)
        .then(async (res: Response) => {
            const jsonBody = (await res.json());
            if (!res.ok && !jsonBody) {
                throw new Error(`Backend-api returned: ${res.status}`);
            } else if (!jsonBody.success) {
                throw new Error(`Backend-api returned: ${res.status}, Reason: ${jsonBody.reason}`);
            }

            return jsonBody.data;
        })
}

async function getCurrentSchoolYearDuration(state: string): Promise<{
    year: [number, number],
    duration: Record<string, any>
}> {
    const yearNow = dayjs().year() % 2000;
    const now = dayjs();

    const requestYear = async (start: number, end: number) => {
        return await queryBackend(`/api/${start}/${end}/duration?state=${state}`)
    }

    const yearOne: Record<string, any> = await requestYear(yearNow - 1, yearNow);

    if (now.isBefore(dayjs(yearOne['end'])) && now.isAfter(dayjs(yearOne['start']))) {
        return { year: [yearNow - 1, yearNow], duration: yearOne };
    }

    return { year: [yearNow, yearNow + 1], duration: await requestYear(yearNow, yearNow + 1) }; // year two:
}

async function getState(ip: string): Promise<string> {
    return fetch(`http://ip-api.com/json/${ip}`) // sadly no https :(
        .then(async (res: Response) => {
            return (await res.json()).regionName
        })
}

function updateProgressBar(year: [number, number], startRaw: string, endRaw: string) {
    const now = dayjs();
    const start = dayjs(startRaw);

    const pct = Math.round(now.diff(start, 'd') / dayjs(endRaw).diff(start, 'd') * 100);

    progressBar.style.width += `${pct}%`;
    progressPCT.innerText = pct + '%';
}

type Holiday = {
    start: any,
    end: any
};

async function updateNextHoliday(year: [number, number], state: string): Promise<Record<string, Holiday> | undefined> {
    const holidays: Record<string, Holiday> = (await queryBackend(`/api/${year[0]}/${year[1]}/holidays?state=${state}`));

    if (dayjs().isAfter(dayjs(holidays['Sommerferien'].start))) {
        nextHolidayContainer.style.display = 'none';
        return;
    }


    let nearest: string | undefined;
    let diff: number | undefined;

    for (let i = 1; i < Object.keys(holidays).length; i++) {
        let holiday: Holiday = holidays[Object.keys(holidays)[i]];
        let calc_dif = dayjs(holiday.start).diff(dayjs(), 'd')
        
        if (nearest) {
            if (calc_dif < diff! && calc_dif >= 0) {
                nearest = Object.keys(holidays)[i];
                diff = calc_dif;
            }
        }

        nearest = Object.keys(holidays)[i];
        diff = calc_dif;
    }

    let nearestHoliday = holidays[nearest!];

    nextName.innerText = `"${nearest}",`;
    nextTimeDelta.innerText = `${diff} day${diff != 1 ? 's' : ''},`;
    nextDuration.innerText = `${dayjs(nearestHoliday.start).format(OUT_DATE_FORMAT)} - ${dayjs(nearestHoliday.end).format(OUT_DATE_FORMAT)}`;

    return holidays;
}

function updateHolidaysTable(holidays: Record<string, Holiday>) {
    holidayBody.innerHTML = '';

    let items = Object.keys(holidays).map((key) => {
        let holiday = holidays[key];
        let diff = dayjs(holiday.start).diff(dayjs(), 'd');
        return [diff, key, holiday.end, holiday.start];
    })

    let itemsSorted = items.sort((a, b) => {
        return a[0] - b[0];
    })

    let holidaysSorted: {
        name: string,
        diff: number,
        start: string,
        end: string
    }[] = [];
    itemsSorted.forEach((item: any) => {
        holidaysSorted.push({
            diff: item[0],
            name: item[1],
            end: item[2],
            start: item[3]
        })
    })

    holidaysSorted.forEach((holiday) => {
        holidayBody.innerHTML += `
        <tr class="border-t">
            <td class="px-4 py-2">${holiday.name}</td>
            <td class="px-4 py-2">${holiday.diff >= 0 ? holiday.diff + (holiday.diff == 1 ? " day" : " days") : 'N/A'}</td>
            <td class="px-4 py-2">${dayjs(holiday.start).format(OUT_DATE_FORMAT)} - ${dayjs(holiday.end).format(OUT_DATE_FORMAT)}</td>
        </tr>`
    })
}

async function init(selected: boolean = false) {
    const IP: string = await getPubIP();
    const state: string = !selected ? await getState(IP) : selectState.value;
    console.log(state);
    selectState.innerHTML = '';
    STATES.forEach((value, i) => {
        selectState.innerHTML += `
            <option value='${transformState(value)}' ${transformState(value) == state? 'selected' : ''}>${value + (value == state && !selected ? ' (Auto-detected)' : '')}</option>
        `
    });

    const yearResult = await getCurrentSchoolYearDuration(selectState.value);

    updateProgressBar(yearResult.year, yearResult.duration.start, yearResult.duration.end);
    const holidays = await updateNextHoliday(yearResult.year, selectState.value);

    if (!holidays) {
        holidaysContainer.style.display = 'none';
        return;
    }

    updateHolidaysTable(holidays);
}

selectState.addEventListener('change', () => {
    init(true).then();
})

init().then();