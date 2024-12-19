const selectState = document.getElementById('select-state') as HTMLSelectElement;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const progressPCT = document.getElementById('progress-pct') as HTMLSpanElement;
const nextHolidayContainer = document.getElementById('nx-holiday-container') as HTMLDivElement;
const nextName = document.getElementById('nx-name') as HTMLSpanElement;
const nextTimeDelta = document.getElementById('nx-time-delta') as HTMLSpanElement;
const nextDuration = document.getElementById('nx-duration') as HTMLSpanElement;

const mapping_DE_EN: Record<string, string> = {
    'Steiermark': 'styria',
    'Kärnten': 'carinthia',
    'Tirol': 'tirol',
    'Burgenland': 'burgenland',
    'Salzburg': 'salzburg',
    'Vorarlberg': 'vorarlberg',
    'Oberösterreich': 'upper_austria',
    'Niederösterreich': 'lower_austria',
    'Wien': 'vienna',
}


async function getPubIP(): Promise<string> {
    return fetch('https://api.ipify.org/?format=json')
        .then(async (res: Response) => {
            return (await res.json()).ip
        })

}

async function getState(ip: string): Promise<string> {
    return fetch(`https://freeipapi.com/api/json/${ip}`)
        .then(async (res: Response) => {
            return (await res.json()).regionName
        })
}

async function init(selected: boolean = false) {
    const IP: string = await getPubIP();
    const state: string = await getState(IP);

    console.log(Object.keys(mapping_DE_EN));

    selectState.innerHTML = '';
    for (const key in mapping_DE_EN) {
        selectState.innerHTML += `
            <option value='${mapping_DE_EN[key]}'${key == state && !selected ? ' selected' : ''}>${key + (key == state && !selected ? ' (Auto-detected)' : '')}</option>
        `
    }


    console.log(`${IP} x ${state}`);
}

selectState.addEventListener('change', () => {
    init(true).then();
})

init().then();