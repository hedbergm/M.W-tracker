// Global variables
let currentSection = 'kondisjon';
let aktiviteter = [];
let brukerProfil = null;
let charts = {}; // Store chart instances
let deferredPrompt; // For PWA install

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadAllData();
    setupEventListeners();
    initializePWA();
});

// Initialize the application
function initializeApp() {
    // Set today's date as default for all date inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.value = today;
    });
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchSection(this.dataset.section);
        });
    });

    // Forms
    document.getElementById('kondisjon-form-element').addEventListener('submit', handleKondisjonSubmit);
    document.getElementById('aktivitet-form-element').addEventListener('submit', handleAktivitetSubmit);
    document.getElementById('styrke-okt-form-element').addEventListener('submit', handleStyrkeOktSubmit);
    document.getElementById('lagidrett-form-element').addEventListener('submit', handleLagidrettSubmit);
    document.getElementById('bruker-form-element').addEventListener('submit', handleBrukerSubmit);
    document.getElementById('mal-form-element').addEventListener('submit', handleMalSubmit);
}

// Section switching
function switchSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Update sections
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');

    currentSection = section;
    
    // Load section-specific data
    if (section === 'statistikk') {
        loadStatistics();
    } else if (section === 'bruker') {
        loadBrukerProfil();
    } else if (section === 'mal') {
        loadMal();
    } else if (section === 'rekorder') {
        loadRekorder();
    }
}

// Load all data
async function loadAllData() {
    await loadBrukerProfil();
    await loadKondisjonData();
    await loadStyrkeData();
    await loadLagidrettData();
}

// KONDISJON FUNCTIONS
async function loadKondisjonData() {
    try {
        // Load treninger
        const treningerResponse = await fetch('/api/kondisjon');
        const treninger = await treningerResponse.json();
        displayKondisjonHistorie(treninger);
    } catch (error) {
        console.error('Feil ved lasting av kondisjon data:', error);
        showError('Kunne ikke laste kondisjon data');
    }
}

function displayKondisjonHistorie(treninger) {
    const container = document.getElementById('kondisjon-historie');
    
    if (treninger.length === 0) {
        container.innerHTML = '<p class="loading">Ingen treninger registrert ennå.</p>';
        return;
    }

    container.innerHTML = treninger.map(trening => `
        <div class="history-item">
            <button class="delete-btn" onclick="deleteKondisjonTrening(${trening.id})" title="Slett trening">×</button>
            <div class="date">${formatDate(trening.dato)}</div>
            <div class="details">
                <strong>${trening.km} km</strong> på ${formatTime(trening.tid_minutter)}
                ${trening.snittpuls ? `<br>Snittpuls: ${trening.snittpuls} bpm` : ''}
                ${trening.hoydemeter ? `<br>Høydemeter: ${trening.hoydemeter}m` : ''}
                ${trening.stigningsprosent ? `<br>Stigning: ${trening.stigningsprosent}%` : ''}
                <br>Tempo: ${calculatePace(trening.km, trening.tid_minutter)} min/km
                ${trening.kalorier ? `<br>💥 ${trening.kalorier} kalorier` : ''}
                ${trening.kommentar ? `<br><em>${trening.kommentar}</em>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleKondisjonSubmit(e) {
    e.preventDefault();
    
    const formData = {
        dato: document.getElementById('kondisjon-dato').value,
        km: parseFloat(document.getElementById('kondisjon-km').value),
        tid_minutter: parseInt(document.getElementById('kondisjon-tid').value),
        snittpuls: document.getElementById('kondisjon-snittpuls').value || null,
        hoydemeter: document.getElementById('kondisjon-hoydemeter').value || null,
        stigningsprosent: document.getElementById('kondisjon-stigning').value || null,
        kommentar: document.getElementById('kondisjon-kommentar').value || null
    };

    // Beregn kalorier hvis brukerprofil eksisterer
    const kalorier = await beregnKalorier('kondisjon', {
        km: formData.km,
        tid_minutter: formData.tid_minutter
    });
    
    if (kalorier) {
        formData.kalorier = kalorier;
    }

    try {
        const response = await fetch('/api/kondisjon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            let successMessage = 'Kondisjon trening lagret!';
            if (kalorier) {
                successMessage += ` (${kalorier} kalorier forbrent)`;
            }
            showSuccess(successMessage);
            hideKondisjonForm();
            e.target.reset();
            document.getElementById('kondisjon-dato').value = new Date().toISOString().split('T')[0];
            await loadKondisjonData();
        } else {
            throw new Error('Feil ved lagring');
        }
    } catch (error) {
        console.error('Feil ved lagring av kondisjon trening:', error);
        showError('Kunne ikke lagre treningen');
    }
}

async function deleteKondisjonTrening(id) {
    if (!confirm('Er du sikker på at du vil slette denne treningen?')) return;
    
    try {
        const response = await fetch(`/api/kondisjon/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Trening slettet!');
            await loadKondisjonData();
        } else {
            throw new Error('Feil ved sletting');
        }
    } catch (error) {
        console.error('Feil ved sletting av kondisjon trening:', error);
        showError('Kunne ikke slette treningen');
    }
}

// STYRKE FUNCTIONS
async function loadStyrkeData() {
    try {
        // Load aktiviteter
        const aktiviteterResponse = await fetch('/api/styrke/aktiviteter');
        aktiviteter = await aktiviteterResponse.json();
        displayStyrkeAktiviteter(aktiviteter);
        updateAktivitetSelects();

        // Load treningsøkter (ny struktur)
        const okterResponse = await fetch('/api/styrke/okter');
        const okter = await okterResponse.json();
        displayStyrkeOkter(okter);

        // Load enkelt treninger (for bakoverkompatibilitet)
        const treningerResponse = await fetch('/api/styrke/treninger');
        const treninger = await treningerResponse.json();
        displayStyrkeHistorie(treninger);
    } catch (error) {
        console.error('Feil ved lasting av styrke data:', error);
        showError('Kunne ikke laste styrke data');
    }
}

function displayStyrkeAktiviteter(aktiviteter) {
    const container = document.getElementById('styrke-aktiviteter');
    
    if (aktiviteter.length === 0) {
        container.innerHTML = '<p class="loading">Ingen aktiviteter opprettet ennå. Opprett din første aktivitet!</p>';
        return;
    }

    container.innerHTML = aktiviteter.map(aktivitet => `
        <div class="activity-card">
            <h4>${aktivitet.navn}</h4>
            <p>${aktivitet.beskrivelse || 'Ingen beskrivelse'}</p>
            <div class="activity-stats">
                <strong>Maks vekt:</strong> ${aktivitet.maks_vekt || 0} kg
                ${aktivitet.maks_vekt_dato ? `<br><small>Satt: ${formatDate(aktivitet.maks_vekt_dato)}</small>` : ''}
            </div>
            <div class="activity-actions" style="margin-top: 10px;">
                <button class="btn-secondary" onclick="updateMaksVekt(${aktivitet.id}, '${aktivitet.navn}')" style="margin-right: 10px; padding: 6px 12px; font-size: 12px;">Oppdater Maks</button>
                <button class="btn-danger" onclick="deleteAktivitet(${aktivitet.id})" style="padding: 6px 12px; font-size: 12px;">Slett</button>
            </div>
        </div>
    `).join('');
}

function displayStyrkeOkter(okter) {
    const container = document.getElementById('styrke-okter');
    
    if (okter.length === 0) {
        container.innerHTML = '<p class="loading">Ingen treningsøkter registrert ennå.</p>';
        return;
    }

    container.innerHTML = okter.map(okt => `
        <div class="history-item">
            <button class="delete-btn" onclick="deleteStyrkeOkt(${okt.id})" title="Slett treningsøkt">×</button>
            <div class="date">${formatDate(okt.dato)}</div>
            <div class="details">
                <strong>${okt.navn || 'Treningsøkt'}</strong><br>
                ${okt.antall_ovelser} øvelse${okt.antall_ovelser !== 1 ? 'r' : ''}
                ${okt.aktiviteter ? `<br>Aktiviteter: ${okt.aktiviteter}` : ''}
                ${okt.kalorier ? `<br>💥 ${okt.kalorier} kalorier` : ''}
                ${okt.kommentar ? `<br><em>${okt.kommentar}</em>` : ''}
                <br><button class="btn-secondary" onclick="showOktDetails(${okt.id})" style="margin-top: 10px; padding: 6px 12px; font-size: 12px;">Vis Detaljer</button>
            </div>
        </div>
    `).join('');
}

function displayStyrkeHistorie(treninger) {
    const container = document.getElementById('styrke-historie');
    
    if (treninger.length === 0) {
        container.innerHTML = '<p class="loading">Ingen styrke treninger registrert ennå.</p>';
        return;
    }

    container.innerHTML = treninger.map(trening => `
        <div class="history-item">
            <button class="delete-btn" onclick="deleteStyrke(${trening.id})" title="Slett trening">×</button>
            <div class="date">${formatDate(trening.dato)}</div>
            <div class="details">
                <strong>${trening.aktivitet_navn}</strong><br>
                ${trening.sett} sett × ${trening.reps} reps @ ${trening.vekt}kg
                <br>Estimert 1RM: ${calculate1RM(trening.vekt, trening.reps).toFixed(1)}kg
                ${trening.kommentar ? `<br><em>${trening.kommentar}</em>` : ''}
            </div>
        </div>
    `).join('');
}

function updateAktivitetSelects() {
    // Oppdater alle aktivitet select-elementer
    const selects = document.querySelectorAll('.ovelse-aktivitet, #styrke-aktivitet');
    const options = '<option value="">Velg aktivitet...</option>' + 
        aktiviteter.map(aktivitet => `<option value="${aktivitet.id}">${aktivitet.navn}</option>`).join('');
    
    selects.forEach(select => {
        // Bevar eksisterende valg
        const currentValue = select.value;
        select.innerHTML = options;
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

async function handleAktivitetSubmit(e) {
    e.preventDefault();
    
    const formData = {
        navn: document.getElementById('aktivitet-navn').value,
        beskrivelse: document.getElementById('aktivitet-beskrivelse').value || null
    };

    try {
        const response = await fetch('/api/styrke/aktiviteter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showSuccess('Aktivitet opprettet!');
            hideAktivitetForm();
            e.target.reset();
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved opprettelse');
        }
    } catch (error) {
        console.error('Feil ved opprettelse av aktivitet:', error);
        showError('Kunne ikke opprette aktiviteten');
    }
}

async function handleStyrkeOktSubmit(e) {
    e.preventDefault();
    
    console.log('handleStyrkeOktSubmit called'); // Debug log
    
    // Samle økt data
    const formData = {
        dato: document.getElementById('styrke-okt-dato').value,
        navn: document.getElementById('styrke-okt-navn').value || null,
        kommentar: document.getElementById('styrke-okt-kommentar').value || null,
        ovelser: []
    };

    console.log('Form data før øvelser:', formData); // Debug log

    // Samle øvelser
    const ovelseItems = document.querySelectorAll('.ovelse-item');
    console.log('Antall øvelse items:', ovelseItems.length); // Debug log
    
    for (let item of ovelseItems) {
        const aktivitetId = item.querySelector('.ovelse-aktivitet').value;
        const sett = item.querySelector('.ovelse-sett').value;
        const reps = item.querySelector('.ovelse-reps').value;
        const vekt = item.querySelector('.ovelse-vekt').value;
        const tid = item.querySelector('.ovelse-tid').value;
        const kommentar = item.querySelector('.ovelse-kommentar').value;

        console.log('Øvelse data:', { aktivitetId, sett, reps, vekt, tid, kommentar }); // Debug log

        if (aktivitetId && sett && reps && vekt) {
            formData.ovelser.push({
                aktivitet_id: parseInt(aktivitetId),
                sett: parseInt(sett),
                reps: parseInt(reps),
                vekt: parseFloat(vekt),
                tid_minutter: tid ? parseInt(tid) : null,
                kommentar: kommentar || null
            });
        }
    }

    console.log('Final form data:', formData); // Debug log

    if (formData.ovelser.length === 0) {
        showError('Du må legge til minst én øvelse');
        return;
    }

    // Beregn kalorier for styrketrening basert på total tid
    const totalTid = formData.ovelser.reduce((sum, ovelse) => sum + (ovelse.tid_minutter || 30), 0); // Default 30 min per øvelse
    const kalorier = await beregnKalorier('styrke', {
        tid_minutter: totalTid,
        intensitet: 'moderat' // Default moderat intensitet
    });
    
    if (kalorier) {
        formData.kalorier = kalorier;
    }

    try {
        console.log('Sending POST request...'); // Debug log
        const response = await fetch('/api/styrke/okter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Response status:', response.status); // Debug log

        if (response.ok) {
            const result = await response.json();
            console.log('Success response:', result); // Debug log
            let successMessage = 'Treningsøkt lagret!';
            if (kalorier) {
                successMessage += ` (${kalorier} kalorier forbrent)`;
            }
            showSuccess(successMessage);
            hideStyrkeOktForm();
            resetStyrkeOktForm();
            await loadStyrkeData();
        } else {
            const errorData = await response.text();
            console.error('Error response:', errorData); // Debug log
            throw new Error('Feil ved lagring: ' + errorData);
        }
    } catch (error) {
        console.error('Feil ved lagring av treningsøkt:', error);
        showError('Kunne ikke lagre treningsøkten: ' + error.message);
    }
}

async function handleStyrkeSubmit(e) {
    e.preventDefault();
    
    const formData = {
        aktivitet_id: parseInt(document.getElementById('styrke-aktivitet').value),
        dato: document.getElementById('styrke-dato').value,
        sett: parseInt(document.getElementById('styrke-sett').value),
        reps: parseInt(document.getElementById('styrke-reps').value),
        vekt: parseFloat(document.getElementById('styrke-vekt').value),
        kommentar: document.getElementById('styrke-kommentar').value || null
    };

    try {
        const response = await fetch('/api/styrke/treninger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            showSuccess('Styrke trening lagret!');
            hideStyrkeForm();
            e.target.reset();
            document.getElementById('styrke-dato').value = new Date().toISOString().split('T')[0];
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved lagring');
        }
    } catch (error) {
        console.error('Feil ved lagring av styrke trening:', error);
        showError('Kunne ikke lagre treningen');
    }
}

async function deleteAktivitet(id) {
    if (!confirm('Er du sikker på at du vil slette denne aktiviteten? Alle tilhørende treninger vil også bli slettet.')) return;
    
    try {
        const response = await fetch(`/api/styrke/aktiviteter/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Aktivitet slettet!');
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved sletting');
        }
    } catch (error) {
        console.error('Feil ved sletting av aktivitet:', error);
        showError('Kunne ikke slette aktiviteten');
    }
}

async function updateMaksVekt(aktivitetId, aktivitetNavn) {
    const maksVekt = prompt(`Oppgi ny maks vekt for ${aktivitetNavn} (kg):`);
    
    if (maksVekt === null) return; // Bruker kansellerte
    
    const vekt = parseFloat(maksVekt);
    if (isNaN(vekt) || vekt <= 0) {
        showError('Vennligst oppgi en gyldig vekt');
        return;
    }
    
    try {
        const response = await fetch(`/api/styrke/aktiviteter/${aktivitetId}/maks`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ maks_vekt: vekt })
        });

        if (response.ok) {
            showSuccess('Maks vekt oppdatert!');
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved oppdatering');
        }
    } catch (error) {
        console.error('Feil ved oppdatering av maks vekt:', error);
        showError('Kunne ikke oppdatere maks vekt');
    }
}

async function deleteStyrke(id) {
    if (!confirm('Er du sikker på at du vil slette denne treningen?')) return;
    
    try {
        const response = await fetch(`/api/styrke/treninger/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Trening slettet!');
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved sletting');
        }
    } catch (error) {
        console.error('Feil ved sletting av styrke trening:', error);
        showError('Kunne ikke slette treningen');
    }
}

// LAGIDRETT FUNCTIONS
async function loadLagidrettData() {
    try {
        // Load treninger
        const treningerResponse = await fetch('/api/lagidrett');
        const treninger = await treningerResponse.json();
        displayLagidrettHistorie(treninger);

        // Load sporter
        const sporterResponse = await fetch('/api/lagidrett/sporter');
        const sporter = await sporterResponse.json();
        displayLagidrettSporter(sporter);
    } catch (error) {
        console.error('Feil ved lasting av lagidrett data:', error);
        showError('Kunne ikke laste lagidrett data');
    }
}

function displayLagidrettSporter(sporter) {
    const container = document.getElementById('lagidrett-sporter');
    
    if (sporter.length === 0) {
        container.innerHTML = '<p class="loading">Ingen sporter registrert ennå.</p>';
        return;
    }

    container.innerHTML = sporter.map(sport => `
        <div class="sport-card">
            <h4>${sport}</h4>
            <button class="btn-secondary" onclick="loadSportStatistikk('${sport}')" style="margin-top: 10px; padding: 8px 16px; font-size: 14px;">Vis Statistikk</button>
        </div>
    `).join('');
}

function displayLagidrettHistorie(treninger) {
    const container = document.getElementById('lagidrett-historie');
    
    if (treninger.length === 0) {
        container.innerHTML = '<p class="loading">Ingen lagidrett treninger registrert ennå.</p>';
        return;
    }

    container.innerHTML = treninger.map(trening => `
        <div class="history-item">
            <button class="delete-btn" onclick="deleteLagidrett(${trening.id})" title="Slett trening">×</button>
            <div class="date">${formatDate(trening.dato)}</div>
            <div class="details">
                <strong>${trening.sport}</strong> - ${trening.tid_minutter} minutter
                ${trening.snittpuls ? `<br>Snittpuls: ${trening.snittpuls} bpm` : ''}
                ${trening.makspuls ? `<br>Makspuls: ${trening.makspuls} bpm` : ''}
                ${trening.kalorier ? `<br>Kalorier: ${trening.kalorier}` : ''}
                ${trening.kommentar ? `<br><em>${trening.kommentar}</em>` : ''}
            </div>
        </div>
    `).join('');
}

async function handleLagidrettSubmit(e) {
    e.preventDefault();
    
    const formData = {
        sport: document.getElementById('lagidrett-sport').value,
        dato: document.getElementById('lagidrett-dato').value,
        tid_minutter: parseInt(document.getElementById('lagidrett-tid').value),
        snittpuls: document.getElementById('lagidrett-snittpuls').value || null,
        makspuls: document.getElementById('lagidrett-makspuls').value || null,
        kommentar: document.getElementById('lagidrett-kommentar').value || null
    };

    // Beregn kalorier hvis ikke manuelt oppgitt og brukerprofil eksisterer
    let kalorier = document.getElementById('lagidrett-kalorier').value || null;
    if (!kalorier) {
        const beregnetKalorier = await beregnKalorier('lagidrett', {
            sport: formData.sport,
            tid_minutter: formData.tid_minutter
        });
        if (beregnetKalorier) {
            kalorier = beregnetKalorier;
        }
    }
    
    if (kalorier) {
        formData.kalorier = parseInt(kalorier);
    }

    try {
        const response = await fetch('/api/lagidrett', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            let successMessage = 'Lagidrett trening lagret!';
            if (kalorier && !document.getElementById('lagidrett-kalorier').value) {
                successMessage += ` (${kalorier} kalorier forbrent)`;
            }
            showSuccess(successMessage);
            hideLagidrettForm();
            e.target.reset();
            document.getElementById('lagidrett-dato').value = new Date().toISOString().split('T')[0];
            await loadLagidrettData();
        } else {
            throw new Error('Feil ved lagring');
        }
    } catch (error) {
        console.error('Feil ved lagring av lagidrett trening:', error);
        showError('Kunne ikke lagre treningen');
    }
}

async function deleteLagidrett(id) {
    if (!confirm('Er du sikker på at du vil slette denne treningen?')) return;
    
    try {
        const response = await fetch(`/api/lagidrett/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Trening slettet!');
            await loadLagidrettData();
        } else {
            throw new Error('Feil ved sletting');
        }
    } catch (error) {
        console.error('Feil ved sletting av lagidrett trening:', error);
        showError('Kunne ikke slette treningen');
    }
}

async function loadSportStatistikk(sport) {
    try {
        const response = await fetch(`/api/lagidrett/statistikk/${encodeURIComponent(sport)}`);
        const stats = await response.json();
        
        alert(`Statistikk for ${sport}:
        
Antall treninger: ${stats.antall_treninger}
Gjennomsnittlig tid: ${Math.round(stats.gjennomsnitt_tid)} minutter
Lengste trening: ${stats.lengste_trening} minutter
Gjennomsnittlig puls: ${Math.round(stats.gjennomsnitt_puls || 0)} bpm
Høyeste makspuls: ${stats.hoyeste_makspuls || 'N/A'} bpm
Totale kalorier: ${stats.totale_kalorier || 0}`);
    } catch (error) {
        console.error('Feil ved lasting av sport statistikk:', error);
        showError('Kunne ikke laste statistikk');
    }
}

// STATISTICS FUNCTIONS
async function loadStatistics() {
    try {
        const period = document.getElementById('stats-period')?.value || 'all';
        
        // Vis/skjul egendefinert datoperiode
        const customFilter = document.getElementById('custom-date-filter');
        if (period === 'custom') {
            customFilter.style.display = 'flex';
        } else {
            customFilter.style.display = 'none';
        }
        
        // Load all data for statistics
        const [kondisjonRes, styrkeRes, styrkeOkterRes, styrkeOvelserRes, lagidrettRes] = await Promise.all([
            fetch('/api/kondisjon'),
            fetch('/api/styrke/treninger'),
            fetch('/api/styrke/okter'),
            fetch('/api/styrke/ovelser'),
            fetch('/api/lagidrett')
        ]);

        const kondisjonData = await kondisjonRes.json();
        const styrkeData = await styrkeRes.json();
        const styrkeOkterData = await styrkeOkterRes.json();
        const styrkeOvelserData = await styrkeOvelserRes.json();
        const lagidrettData = await lagidrettRes.json();

        // Filter data based on selected period
        const filteredKondisjon = filterDataByPeriod(kondisjonData, period);
        const filteredStyrke = filterDataByPeriod(styrkeData, period);
        const filteredStyrkeOkter = filterDataByPeriod(styrkeOkterData, period);
        const filteredStyrkeOvelser = filterDataByPeriod(styrkeOvelserData, period, 'created_at');
        const filteredLagidrett = filterDataByPeriod(lagidrettData, period);

        displayStatistics(filteredKondisjon, filteredStyrke, filteredStyrkeOkter, filteredStyrkeOvelser, filteredLagidrett);
        
        // Load charts after statistics
        await loadCharts(filteredKondisjon, filteredStyrke, filteredStyrkeOkter, filteredStyrkeOvelser, filteredLagidrett);
    } catch (error) {
        console.error('Feil ved lasting av statistikk:', error);
        showError('Kunne ikke laste statistikk');
    }
}

function filterDataByPeriod(data, period, dateField = 'dato') {
    if (period === 'all') return data;
    
    const now = new Date();
    let startDate, endDate;
    
    if (period === 'custom') {
        const fromDateInput = document.getElementById('stats-from-date');
        const toDateInput = document.getElementById('stats-to-date');
        
        if (!fromDateInput.value || !toDateInput.value) {
            return data; // Returner all data hvis datoer ikke er satt
        }
        
        startDate = new Date(fromDateInput.value);
        endDate = new Date(toDateInput.value);
        endDate.setHours(23, 59, 59, 999); // Inkluder hele til-dagen
        
        return data.filter(item => {
            const itemDate = new Date(item[dateField]);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }
    
    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() + 1); // Start på mandag
            startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
            break;
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            return data;
    }
    
    return data.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= startDate;
    });
}

function displayStatistics(kondisjon, styrke, styrkeOkter, styrkeOvelser, lagidrett) {
    const period = document.getElementById('stats-period')?.value || 'all';
    const periodText = getPeriodText(period);
    
    // Beregn total tid på tvers av alle treningstyper
    const kondisjonTotalTid = kondisjon.reduce((sum, t) => sum + t.tid_minutter, 0);
    const styrkeTotalTid = styrkeOvelser.reduce((sum, ovelse) => sum + (ovelse.tid_minutter || 0), 0);
    const lagidrettTotalTid = lagidrett.reduce((sum, t) => sum + t.tid_minutter, 0);
    const grandTotalTid = kondisjonTotalTid + styrkeTotalTid + lagidrettTotalTid;
    
    // Kondisjon stats
    const kondisjonStats = document.getElementById('kondisjon-stats');
    if (kondisjon.length > 0) {
        const totalKm = kondisjon.reduce((sum, t) => sum + t.km, 0);
        const totalTid = kondisjon.reduce((sum, t) => sum + t.tid_minutter, 0);
        const totalKalorier = kondisjon.reduce((sum, t) => sum + (t.kalorier || 0), 0);
        const avgPace = totalTid / totalKm;
        
        kondisjonStats.innerHTML = `
            <div class="period-info">${periodText}</div>
            <div class="stat-item">
                <span class="stat-label">Totale treninger:</span>
                <span class="stat-value">${kondisjon.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total distanse:</span>
                <span class="stat-value">${totalKm.toFixed(1)} km</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total tid:</span>
                <span class="stat-value">${formatTime(totalTid)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Gj.snitt tempo:</span>
                <span class="stat-value">${avgPace.toFixed(1)} min/km</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total kalorier:</span>
                <span class="stat-value">${totalKalorier}</span>
            </div>
        `;
    } else {
        kondisjonStats.innerHTML = `<div class="period-info">${periodText}</div><p class="loading">Ingen kondisjon data</p>`;
    }

    // Styrke stats - prioriterer økter og inkluderer øvelsesdata
    const styrkeStats = document.getElementById('styrke-stats');
    if (styrkeOkter.length > 0 || styrkeOvelser.length > 0) {
        // Beregn statistikk fra økter og øvelser
        const totalOkter = styrkeOkter.length;
        const totalOvelser = styrkeOvelser.length;
        const totalSett = styrkeOvelser.reduce((sum, ovelse) => sum + (ovelse.sett || 0), 0);
        const totalReps = styrkeOvelser.reduce((sum, ovelse) => sum + ((ovelse.sett || 0) * (ovelse.reps || 0)), 0);
        const totalVekt = styrkeOvelser.reduce((sum, ovelse) => sum + ((ovelse.vekt || 0) * (ovelse.sett || 0) * (ovelse.reps || 0)), 0);
        const totalTid = styrkeOvelser.reduce((sum, ovelse) => sum + (ovelse.tid_minutter || 0), 0);
        const totalKalorier = styrkeOkter.reduce((sum, okt) => sum + (okt.kalorier || 0), 0);
        
        styrkeStats.innerHTML = `
            <div class="period-info">${periodText}</div>
            <div class="stat-item">
                <span class="stat-label">Totale treningsøkter:</span>
                <span class="stat-value">${totalOkter}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Totale øvelser:</span>
                <span class="stat-value">${totalOvelser}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Totale sett:</span>
                <span class="stat-value">${totalSett}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Totale reps:</span>
                <span class="stat-value">${totalReps}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total vekt løftet:</span>
                <span class="stat-value">${totalVekt.toFixed(0)} kg</span>
            </div>
            ${totalTid > 0 ? `
            <div class="stat-item">
                <span class="stat-label">Total tid:</span>
                <span class="stat-value">${formatTime(totalTid)}</span>
            </div>
            ` : ''}
            <div class="stat-item">
                <span class="stat-label">Total kalorier:</span>
                <span class="stat-value">${totalKalorier}</span>
            </div>
        `;
    } else if (styrke.length > 0) {
        // Fallback til enkeltøvelser hvis ingen økter
        const totalSett = styrke.reduce((sum, t) => sum + t.sett, 0);
        const totalReps = styrke.reduce((sum, t) => sum + (t.sett * t.reps), 0);
        const totalVekt = styrke.reduce((sum, t) => sum + (t.vekt * t.sett * t.reps), 0);
        
        styrkeStats.innerHTML = `
            <div class="period-info">${periodText}</div>
            <div class="stat-item">
                <span class="stat-label">Totale enkeltøvelser:</span>
                <span class="stat-value">${styrke.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Totale sett:</span>
                <span class="stat-value">${totalSett}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Totale reps:</span>
                <span class="stat-value">${totalReps}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total vekt løftet:</span>
                <span class="stat-value">${totalVekt.toFixed(0)} kg</span>
            </div>
        `;
    } else {
        styrkeStats.innerHTML = `<div class="period-info">${periodText}</div><p class="loading">Ingen styrke data</p>`;
    }

    // Lagidrett stats
    const lagidrettStats = document.getElementById('lagidrett-stats');
    if (lagidrett.length > 0) {
        const totalTid = lagidrett.reduce((sum, t) => sum + t.tid_minutter, 0);
        const totalKalorier = lagidrett.reduce((sum, t) => sum + (t.kalorier || 0), 0);
        const avgPuls = lagidrett.filter(t => t.snittpuls).reduce((sum, t) => sum + t.snittpuls, 0) / lagidrett.filter(t => t.snittpuls).length;
        
        lagidrettStats.innerHTML = `
            <div class="period-info">${periodText}</div>
            <div class="stat-item">
                <span class="stat-label">Totale treninger:</span>
                <span class="stat-value">${lagidrett.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total tid:</span>
                <span class="stat-value">${formatTime(totalTid)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total kalorier:</span>
                <span class="stat-value">${totalKalorier}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Gj.snitt puls:</span>
                <span class="stat-value">${avgPuls ? Math.round(avgPuls) + ' bpm' : 'N/A'}</span>
            </div>
        `;
    } else {
        lagidrettStats.innerHTML = `<div class="period-info">${periodText}</div><p class="loading">Ingen lagidrett data</p>`;
    }
    
    // NYTT: Vis totalt sammendrag
    const totalStats = document.getElementById('total-stats');
    if (totalStats && grandTotalTid > 0) {
        const totalKalorier = (kondisjon.reduce((sum, t) => sum + (t.kalorier || 0), 0)) + 
                            (styrkeOkter.reduce((sum, okt) => sum + (okt.kalorier || 0), 0)) +
                            (lagidrett.reduce((sum, t) => sum + (t.kalorier || 0), 0));
        const totalTreninger = kondisjon.length + styrkeOkter.length + lagidrett.length;
        
        totalStats.innerHTML = `
            <div class="period-info">${periodText} - Totalt sammendrag</div>
            <div class="stat-item">
                <span class="stat-label">Alle treninger:</span>
                <span class="stat-value">${totalTreninger}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total treningstid:</span>
                <span class="stat-value">${formatTime(grandTotalTid)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total kalorier:</span>
                <span class="stat-value">${totalKalorier}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Gj.snitt per økt:</span>
                <span class="stat-value">${totalTreninger > 0 ? formatTime(Math.round(grandTotalTid / totalTreninger)) : '0m'}</span>
            </div>
        `;
    }
}

function getPeriodText(period) {
    switch (period) {
        case 'today': return 'I dag';
        case 'week': return 'Denne uken';
        case 'month': return 'Denne måneden';
        case 'year': return 'Dette året';
        case 'custom': 
            const fromDate = document.getElementById('stats-from-date')?.value;
            const toDate = document.getElementById('stats-to-date')?.value;
            if (fromDate && toDate) {
                return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
            }
            return 'Egendefinert periode';
        case 'all': 
        default: return 'Totalt';
    }
}

// UTILITY FUNCTIONS
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO');
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}t ${mins}m` : `${mins}m`;
}

function calculatePace(km, minutes) {
    const paceMinutes = minutes / km;
    const mins = Math.floor(paceMinutes);
    const secs = Math.round((paceMinutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTempo(tempoPerKm) {
    if (!tempoPerKm || tempoPerKm <= 0) return '--:--';
    
    const mins = Math.floor(tempoPerKm);
    const secs = Math.round((tempoPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculate1RM(weight, reps) {
    // Brzycki formula
    return weight * (36 / (37 - reps));
}

function showSuccess(message) {
    const existingAlert = document.querySelector('.success');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = 'success';
    alert.textContent = message;
    
    const main = document.querySelector('main');
    main.insertBefore(alert, main.firstChild);
    
    setTimeout(() => alert.remove(), 3000);
}

function showError(message) {
    const existingAlert = document.querySelector('.error');
    if (existingAlert) existingAlert.remove();
    
    const alert = document.createElement('div');
    alert.className = 'error';
    alert.textContent = message;
    
    const main = document.querySelector('main');
    main.insertBefore(alert, main.firstChild);
    
    setTimeout(() => alert.remove(), 5000);
}

// FORM SHOW/HIDE FUNCTIONS
function showKondisjonForm() {
    document.getElementById('kondisjon-form').style.display = 'block';
    document.getElementById('kondisjon-form').scrollIntoView({ behavior: 'smooth' });
}

function hideKondisjonForm() {
    document.getElementById('kondisjon-form').style.display = 'none';
}

function showAktivitetForm() {
    document.getElementById('aktivitet-form').style.display = 'block';
    document.getElementById('aktivitet-form').scrollIntoView({ behavior: 'smooth' });
}

function hideAktivitetForm() {
    document.getElementById('aktivitet-form').style.display = 'none';
}

function showStyrkeOktForm() {
    console.log('showStyrkeOktForm called, aktiviteter:', aktiviteter.length); // Debug log
    if (aktiviteter.length === 0) {
        alert('Du må først opprette aktiviteter før du kan registrere treningsøkter.');
        showAktivitetForm();
        return;
    }
    const form = document.getElementById('styrke-okt-form');
    console.log('Form element:', form); // Debug log
    
    // Sjekk om formen allerede er synlig (mer robust sjekk)
    const isVisible = form.style.display === 'block' || 
                     (!form.style.display && window.getComputedStyle(form).display !== 'none');
    
    console.log('Form is visible:', isVisible, 'display style:', form.style.display); // Debug log
    
    if (!isVisible) {
        form.style.display = 'block';
        // Sett dagens dato som default
        document.getElementById('styrke-okt-dato').value = new Date().toISOString().split('T')[0];
        // Kun initialiser hvis containeren er tom
        initializeStyrkeOktFormIfEmpty();
    } else {
        // Hvis formen allerede er synlig, bare scroll til den
        console.log('Form already visible, scrolling to it'); // Debug log
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

function hideStyrkeOktForm() {
    document.getElementById('styrke-okt-form').style.display = 'none';
}

function initializeStyrkeOktFormIfEmpty() {
    const container = document.getElementById('ovelser-container');
    // Kun initialiser hvis containeren er tom
    if (container.children.length === 0) {
        console.log('Container is empty, initializing with one exercise'); // Debug log
        resetStyrkeOktForm();
    } else {
        console.log('Container has', container.children.length, 'exercises, not resetting'); // Debug log
        // Oppdater aktivitet-selects for eksisterende øvelser
        updateAktivitetSelects();
    }
}

function resetStyrkeOktForm() {
    console.log('resetStyrkeOktForm called - resetting form'); // Debug log
    console.trace('resetStyrkeOktForm stack trace'); // Stack trace for debugging
    document.getElementById('styrke-okt-form-element').reset();
    document.getElementById('styrke-okt-dato').value = new Date().toISOString().split('T')[0];
    
    // Reset til én øvelse
    const container = document.getElementById('ovelser-container');
    container.innerHTML = `
        <div class="ovelse-item">
            <div class="form-row">
                <div class="form-group">
                    <label>Aktivitet:</label>
                    <select class="ovelse-aktivitet" required>
                        <option value="">Velg aktivitet...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sett:</label>
                    <input type="number" class="ovelse-sett" min="1" required>
                </div>
                <div class="form-group">
                    <label>Reps:</label>
                    <input type="number" class="ovelse-reps" min="1" required>
                </div>
                <div class="form-group">
                    <label>Vekt (kg):</label>
                    <input type="number" class="ovelse-vekt" step="0.5" min="0" required>
                </div>
                <div class="form-group">
                    <label>Tid (min):</label>
                    <input type="number" class="ovelse-tid" min="1" placeholder="Valgfritt">
                </div>
            </div>
            <div class="form-group">
                <label>Kommentar til øvelse:</label>
                <input type="text" class="ovelse-kommentar" placeholder="Kommentar til denne øvelsen...">
            </div>
            <button type="button" class="btn-danger remove-ovelse" onclick="removeOvelse(this)" style="display: none;">Fjern Øvelse</button>
        </div>
    `;
    updateAktivitetSelects();
}

function addOvelse() {
    console.log('addOvelse called - adding new exercise'); // Debug log
    const container = document.getElementById('ovelser-container');
    const newOvelse = document.createElement('div');
    newOvelse.className = 'ovelse-item';
    newOvelse.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Aktivitet:</label>
                <select class="ovelse-aktivitet" required>
                    <option value="">Velg aktivitet...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Sett:</label>
                <input type="number" class="ovelse-sett" min="1" required>
            </div>
            <div class="form-group">
                <label>Reps:</label>
                <input type="number" class="ovelse-reps" min="1" required>
            </div>
            <div class="form-group">
                <label>Vekt (kg):</label>
                <input type="number" class="ovelse-vekt" step="0.5" min="0" required>
            </div>
            <div class="form-group">
                <label>Tid (min):</label>
                <input type="number" class="ovelse-tid" min="1" placeholder="Valgfritt">
            </div>
        </div>
        <div class="form-group">
            <label>Kommentar til øvelse:</label>
            <input type="text" class="ovelse-kommentar" placeholder="Kommentar til denne øvelsen...">
        </div>
        <button type="button" class="btn-danger remove-ovelse" onclick="removeOvelse(this)">Fjern Øvelse</button>
    `;
    
    container.appendChild(newOvelse);
    updateAktivitetSelects();
    updateRemoveButtons();
}

function removeOvelse(button) {
    button.parentElement.remove();
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const ovelseItems = document.querySelectorAll('.ovelse-item');
    ovelseItems.forEach((item, index) => {
        const removeBtn = item.querySelector('.remove-ovelse');
        if (ovelseItems.length > 1) {
            removeBtn.style.display = 'block';
        } else {
            removeBtn.style.display = 'none';
        }
    });
}

async function showOktDetails(oktId) {
    try {
        const response = await fetch(`/api/styrke/okter/${oktId}`);
        const okt = await response.json();
        
        let details = `Treningsøkt: ${okt.navn || 'Uten navn'}
Dato: ${formatDate(okt.dato)}
${okt.kommentar ? `Kommentar: ${okt.kommentar}\n` : ''}
Øvelser:
`;
        
        okt.ovelser.forEach((ovelse, index) => {
            details += `${index + 1}. ${ovelse.aktivitet_navn}: ${ovelse.sett} sett × ${ovelse.reps} reps @ ${ovelse.vekt}kg`;
            if (ovelse.tid_minutter) details += ` (${ovelse.tid_minutter} min)`;
            if (ovelse.kommentar) details += ` (${ovelse.kommentar})`;
            details += `\n   Estimert 1RM: ${calculate1RM(ovelse.vekt, ovelse.reps).toFixed(1)}kg\n`;
        });
        
        alert(details);
    } catch (error) {
        console.error('Feil ved henting av økt detaljer:', error);
        showError('Kunne ikke laste økt detaljer');
    }
}

async function deleteStyrkeOkt(id) {
    if (!confirm('Er du sikker på at du vil slette denne treningsøkten? Alle øvelser i økten vil også bli slettet.')) return;
    
    try {
        const response = await fetch(`/api/styrke/okter/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showSuccess('Treningsøkt slettet!');
            await loadStyrkeData();
        } else {
            throw new Error('Feil ved sletting');
        }
    } catch (error) {
        console.error('Feil ved sletting av treningsøkt:', error);
        showError('Kunne ikke slette treningsøkten');
    }
}

function showStyrkeForm() {
    if (aktiviteter.length === 0) {
        alert('Du må først opprette aktiviteter før du kan registrere styrke treninger.');
        showAktivitetForm();
        return;
    }
    document.getElementById('styrke-form').style.display = 'block';
    document.getElementById('styrke-form').scrollIntoView({ behavior: 'smooth' });
}

function hideStyrkeForm() {
    document.getElementById('styrke-form').style.display = 'none';
}

function showLagidrettForm() {
    document.getElementById('lagidrett-form').style.display = 'block';
    document.getElementById('lagidrett-form').scrollIntoView({ behavior: 'smooth' });
}

function hideLagidrettForm() {
    document.getElementById('lagidrett-form').style.display = 'none';
}

// BRUKER FUNCTIONS
async function loadBrukerProfil() {
    try {
        const response = await fetch('/api/bruker');
        brukerProfil = await response.json();
        displayBrukerProfil(brukerProfil);
    } catch (error) {
        console.error('Feil ved lasting av brukerprofil:', error);
        showError('Kunne ikke laste brukerprofil');
    }
}

function displayBrukerProfil(profil) {
    const container = document.getElementById('profil-innhold');
    
    if (!profil) {
        container.innerHTML = `
            <p class="loading">Ingen profil registrert ennå.</p>
            <p>Opprett din profil for å få automatisk kaloriberegning.</p>
        `;
        return;
    }

    const bmi = (profil.vekt / Math.pow(profil.hoyde / 100, 2)).toFixed(1);
    
    container.innerHTML = `
        <div class="profil-detaljer">
            <div class="profil-rad">
                <span class="profil-label">Vekt:</span>
                <span class="profil-verdi">${profil.vekt} kg</span>
            </div>
            <div class="profil-rad">
                <span class="profil-label">Høyde:</span>
                <span class="profil-verdi">${profil.hoyde} cm</span>
            </div>
            <div class="profil-rad">
                <span class="profil-label">BMI:</span>
                <span class="profil-verdi">${bmi}</span>
            </div>
            ${profil.alder ? `
            <div class="profil-rad">
                <span class="profil-label">Alder:</span>
                <span class="profil-verdi">${profil.alder} år</span>
            </div>
            ` : ''}
            ${profil.kjonn ? `
            <div class="profil-rad">
                <span class="profil-label">Kjønn:</span>
                <span class="profil-verdi">${profil.kjonn === 'mann' ? 'Mann' : 'Kvinne'}</span>
            </div>
            ` : ''}
            ${profil.aktivitetsniva ? `
            <div class="profil-rad">
                <span class="profil-label">Aktivitetsnivå:</span>
                <span class="profil-verdi">${getAktivitetsnivaTekst(profil.aktivitetsniva)}</span>
            </div>
            ` : ''}
            <div class="profil-rad">
                <span class="profil-label">Sist oppdatert:</span>
                <span class="profil-verdi">${formatDate(profil.updated_at)}</span>
            </div>
        </div>
    `;
}

function getAktivitetsnivaTekst(niva) {
    switch (niva) {
        case 'lav': return 'Lav';
        case 'moderat': return 'Moderat';
        case 'hoy': return 'Høy';
        default: return niva;
    }
}

async function handleBrukerSubmit(e) {
    e.preventDefault();
    
    const formData = {
        vekt: parseFloat(document.getElementById('bruker-vekt').value),
        hoyde: parseInt(document.getElementById('bruker-hoyde').value),
        alder: document.getElementById('bruker-alder').value ? parseInt(document.getElementById('bruker-alder').value) : null,
        kjonn: document.getElementById('bruker-kjonn').value || null,
        aktivitetsniva: document.getElementById('bruker-aktivitetsniva').value || null
    };

    try {
        const response = await fetch('/api/bruker', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccess(result.message);
            hideBrukerForm();
            await loadBrukerProfil();
        } else {
            throw new Error('Feil ved lagring av profil');
        }
    } catch (error) {
        console.error('Feil ved lagring av brukerprofil:', error);
        showError('Kunne ikke lagre profilen');
    }
}

function showBrukerForm() {
    // Forhåndsutfyll skjemaet hvis profil eksisterer
    if (brukerProfil) {
        document.getElementById('bruker-vekt').value = brukerProfil.vekt || '';
        document.getElementById('bruker-hoyde').value = brukerProfil.hoyde || '';
        document.getElementById('bruker-alder').value = brukerProfil.alder || '';
        document.getElementById('bruker-kjonn').value = brukerProfil.kjonn || '';
        document.getElementById('bruker-aktivitetsniva').value = brukerProfil.aktivitetsniva || '';
    }
    
    document.getElementById('bruker-form').style.display = 'block';
    document.getElementById('bruker-form').scrollIntoView({ behavior: 'smooth' });
}

function hideBrukerForm() {
    document.getElementById('bruker-form').style.display = 'none';
}

// KALORI BEREGNING FUNCTIONS
async function beregnKalorier(type, data) {
    if (!brukerProfil) {
        console.log('Ingen brukerprofil funnet - hopper over kaloriberegning');
        return null;
    }
    
    try {
        const response = await fetch(`/api/bruker/beregn-kalorier/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...data, vekt: brukerProfil.vekt })
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.kalorier;
        }
    } catch (error) {
        console.error('Feil ved kaloriberegning:', error);
    }
    
    return null;
}

// CHARTS FUNCTIONS
async function loadCharts(kondisjon, styrke, styrkeOkter, styrkeOvelser, lagidrett) {
    // Destroy existing charts
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};

    try {
        // Kondisjon chart - Tempo over tid
        createKondisjonChart(kondisjon);
        
        // Kalorier chart - Ukentlig kalorier
        createKalorierChart(kondisjon, styrkeOkter, lagidrett);
        
        // Frekvens chart - Treningsfrekvens
        createFrekvensChart(kondisjon, styrkeOkter, lagidrett);
        
        // Styrke chart - Vekt utvikling
        createStyrkeChart(styrkeOvelser);
    } catch (error) {
        console.error('Feil ved lasting av grafer:', error);
    }
}

function createKondisjonChart(kondisjon) {
    const ctx = document.getElementById('kondisjonChart');
    if (!ctx || kondisjon.length === 0) return;

    // Sorter data etter dato
    const sortedData = kondisjon.sort((a, b) => new Date(a.dato) - new Date(b.dato));
    
    // Beregn tempo for hver trening
    const labels = sortedData.map(trening => formatDate(trening.dato));
    const tempoData = sortedData.map(trening => (trening.tid_minutter / trening.km).toFixed(2));

    charts.kondisjon = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tempo (min/km)',
                data: tempoData,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Tempo (min/km)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function createKalorierChart(kondisjon, styrkeOkter, lagidrett) {
    const ctx = document.getElementById('kalorierChart');
    if (!ctx) return;

    // Kombiner alle treninger med kalorier
    const alleData = [
        ...kondisjon.map(t => ({ dato: t.dato, kalorier: t.kalorier || 0, type: 'Kondisjon' })),
        ...styrkeOkter.map(t => ({ dato: t.dato, kalorier: t.kalorier || 0, type: 'Styrke' })),
        ...lagidrett.map(t => ({ dato: t.dato, kalorier: t.kalorier || 0, type: 'Lagidrett' }))
    ];

    // Grupper etter uker
    const weeklyData = {};
    alleData.forEach(item => {
        if (item.kalorier > 0) {
            const date = new Date(item.dato);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay() + 1); // Start på mandag
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = { kondisjon: 0, styrke: 0, lagidrett: 0 };
            }
            weeklyData[weekKey][item.type.toLowerCase()] += item.kalorier;
        }
    });

    const weeks = Object.keys(weeklyData).sort();
    const kondisjonData = weeks.map(week => weeklyData[week].kondisjon);
    const styrkeData = weeks.map(week => weeklyData[week].styrke);
    const lagidrettData = weeks.map(week => weeklyData[week].lagidrett);

    charts.kalorier = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks.map(week => formatDate(week)),
            datasets: [
                {
                    label: 'Kondisjon',
                    data: kondisjonData,
                    backgroundColor: '#667eea'
                },
                {
                    label: 'Styrke',
                    data: styrkeData,
                    backgroundColor: '#764ba2'
                },
                {
                    label: 'Lagidrett',
                    data: lagidrettData,
                    backgroundColor: '#f093fb'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Uke'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Kalorier'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

function createFrekvensChart(kondisjon, styrkeOkter, lagidrett) {
    const ctx = document.getElementById('frekvensChart');
    if (!ctx) return;

    const totalKondisjon = kondisjon.length;
    const totalStyrke = styrkeOkter.length;
    const totalLagidrett = lagidrett.length;

    charts.frekvens = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Kondisjon', 'Styrke', 'Lagidrett'],
            datasets: [{
                data: [totalKondisjon, totalStyrke, totalLagidrett],
                backgroundColor: ['#667eea', '#764ba2', '#f093fb'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            }
        }
    });
}

function createStyrkeChart(styrkeOvelser) {
    const ctx = document.getElementById('styrkeChart');
    if (!ctx || styrkeOvelser.length === 0) return;

    // Grupper øvelser etter aktivitet
    const aktivitetData = {};
    styrkeOvelser.forEach(ovelse => {
        const aktivitet = ovelse.aktivitet_navn || 'Ukjent';
        if (!aktivitetData[aktivitet]) {
            aktivitetData[aktivitet] = [];
        }
        aktivitetData[aktivitet].push({
            dato: ovelse.created_at || ovelse.dato,
            vekt: ovelse.vekt
        });
    });

    // Ta den mest aktive aktiviteten
    const topAktivitet = Object.entries(aktivitetData)
        .sort((a, b) => b[1].length - a[1].length)[0];

    if (!topAktivitet) return;

    const [aktivitetNavn, data] = topAktivitet;
    const sortedData = data.sort((a, b) => new Date(a.dato) - new Date(b.dato));
    
    const labels = sortedData.map(item => formatDate(item.dato));
    const vektData = sortedData.map(item => item.vekt);

    charts.styrke = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${aktivitetNavn} (kg)`,
                data: vektData,
                borderColor: '#764ba2',
                backgroundColor: 'rgba(118, 75, 162, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Vekt (kg)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// ============ PWA FUNCTIONS ============

function initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrert:', registration);
            })
            .catch(error => {
                console.log('Service Worker feil:', error);
            });
    }

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });

    // Create install button
    const installButton = document.createElement('button');
    installButton.className = 'pwa-install';
    installButton.innerHTML = '📱 Installer App';
    installButton.onclick = installPWA;
    document.body.appendChild(installButton);
}

function showInstallButton() {
    const installBtn = document.querySelector('.pwa-install');
    if (installBtn) {
        installBtn.classList.add('show');
    }
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('PWA ble installert');
                document.querySelector('.pwa-install').classList.remove('show');
            }
            deferredPrompt = null;
        });
    }
}

// ============ MÅL OG BADGES FUNCTIONS ============

async function loadMal() {
    await Promise.all([
        loadAktiveMal(),
        loadBadges(),
        loadMaanedligFremgang()
    ]);
}

async function loadAktiveMal() {
    try {
        const response = await fetch('/api/mal/aktive');
        const mal = await response.json();
        
        if (!response.ok) {
            throw new Error(mal.error || 'Kunne ikke laste mål');
        }
        
        displayMal(mal);
    } catch (error) {
        console.error('Feil ved lasting av mål:', error);
        document.getElementById('aktive-mal').innerHTML = `<p class="error">Feil ved lasting av mål: ${error.message}</p>`;
    }
}

function displayMal(mal) {
    const container = document.getElementById('aktive-mal');
    
    if (mal.length === 0) {
        container.innerHTML = '<p class="no-data">Ingen aktive mål. Opprett ditt første mål!</p>';
        return;
    }
    
    container.innerHTML = mal.map(maal => {
        const progress = (maal.nuvaerende_verdi / maal.maal_verdi) * 100;
        const progressCapped = Math.min(progress, 100);
        
        return `
            <div class="mal-card">
                <div class="mal-header">
                    <span class="mal-type">${formatMalType(maal.type)}</span>
                    <span class="mal-status ${maal.status}">${formatMalStatus(maal.status)}</span>
                </div>
                
                ${maal.beskrivelse ? `<div class="mal-beskrivelse">${maal.beskrivelse}</div>` : ''}
                
                <div class="mal-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressCapped}%"></div>
                    </div>
                    <div class="progress-text">
                        ${maal.nuvaerende_verdi} / ${maal.maal_verdi} ${maal.enhet} (${Math.round(progress)}%)
                    </div>
                </div>
                
                <div class="mal-frist">
                    Frist: ${formatDate(maal.frist)}
                </div>
                
                <div style="margin-top: 15px;">
                    <button class="btn-secondary btn-sm" onclick="slettMal(${maal.id})">Slett</button>
                </div>
            </div>
        `;
    }).join('');
}

async function loadBadges() {
    try {
        const response = await fetch('/api/mal/badges');
        const badges = await response.json();
        
        if (!response.ok) {
            throw new Error(badges.error || 'Kunne ikke laste badges');
        }
        
        displayBadges(badges);
        checkForNewBadges(); // Sjekk om bruker har oppnådd nye badges
    } catch (error) {
        console.error('Feil ved lasting av badges:', error);
        document.getElementById('badges').innerHTML = `<p class="error">Feil ved lasting av badges: ${error.message}</p>`;
    }
}

function displayBadges(badges) {
    const container = document.getElementById('badges');
    
    const allBadges = [...badges.oppnaadde, ...badges.tilgjengelige];
    
    if (allBadges.length === 0) {
        container.innerHTML = '<p class="no-data">Ingen badges tilgjengelig.</p>';
        return;
    }
    
    container.innerHTML = allBadges.map(badge => `
        <div class="badge-card ${badge.oppnadd_at ? 'oppnadd' : ''}">
            <span class="badge-ikon">${badge.ikon}</span>
            <div class="badge-navn">${badge.navn}</div>
            <div class="badge-beskrivelse">${badge.beskrivelse}</div>
            ${badge.oppnadd_at ? `<div class="badge-dato">Oppnådd: ${formatDate(badge.oppnadd_at)}</div>` : ''}
        </div>
    `).join('');
}

async function loadMaanedligFremgang() {
    try {
        const response = await fetch('/api/mal/fremgang');
        const fremgang = await response.json();
        
        if (!response.ok) {
            throw new Error(fremgang.error || 'Kunne ikke laste fremgang');
        }
        
        displayMaanedligFremgang(fremgang);
    } catch (error) {
        console.error('Feil ved lasting av fremgang:', error);
        document.getElementById('maanedlig-fremgang').innerHTML = `<p class="error">Feil ved lasting av fremgang: ${error.message}</p>`;
    }
}

function displayMaanedligFremgang(fremgang) {
    const container = document.getElementById('maanedlig-fremgang');
    
    container.innerHTML = `
        <div class="fremgang-card">
            <div class="fremgang-tall">${fremgang.kondisjon?.antall || 0}</div>
            <div class="fremgang-label">Kondisjon økter</div>
            <div class="fremgang-detalj">${(fremgang.kondisjon?.total_km || 0).toFixed(1)} km totalt</div>
        </div>
        
        <div class="fremgang-card">
            <div class="fremgang-tall">${fremgang.styrke?.antall || 0}</div>
            <div class="fremgang-label">Styrke økter</div>
            <div class="fremgang-detalj">${fremgang.styrke?.kalorier || 0} kalorier</div>
        </div>
        
        <div class="fremgang-card">
            <div class="fremgang-tall">${fremgang.lagidrett?.antall || 0}</div>
            <div class="fremgang-label">Lagidrett økter</div>
            <div class="fremgang-detalj">${fremgang.lagidrett?.total_tid || 0} minutter</div>
        </div>
        
        <div class="fremgang-card">
            <div class="fremgang-tall">${((fremgang.kondisjon?.kalorier || 0) + (fremgang.styrke?.kalorier || 0) + (fremgang.lagidrett?.kalorier || 0))}</div>
            <div class="fremgang-label">Total kalorier</div>
            <div class="fremgang-detalj">denne måneden</div>
        </div>
    `;
}

function showMalForm() {
    document.getElementById('mal-form').style.display = 'block';
    document.getElementById('mal-form-element').reset();
    
    // Set default date to 30 days from now
    const frist = new Date();
    frist.setDate(frist.getDate() + 30);
    document.getElementById('mal-frist').value = frist.toISOString().split('T')[0];
}

function hideMalForm() {
    document.getElementById('mal-form').style.display = 'none';
}

function updateMalFields() {
    const malType = document.getElementById('mal-type').value;
    const detaljerContainer = document.getElementById('mal-detaljer');
    const malEnhet = document.getElementById('mal-enhet');
    
    // Clear previous content
    detaljerContainer.innerHTML = '';
    detaljerContainer.style.display = 'none';
    
    switch (malType) {
        case 'kondisjon_distanse':
            malEnhet.textContent = 'km';
            break;
        case 'kondisjon_tid':
            malEnhet.textContent = 'min/km';
            detaljerContainer.innerHTML = `
                <label for="mal-distanse">Distanse (km):</label>
                <input type="number" id="mal-distanse" step="0.1" min="0.1" placeholder="5.0">
            `;
            detaljerContainer.style.display = 'block';
            break;
        case 'styrke_vekt':
            malEnhet.textContent = 'kg';
            detaljerContainer.innerHTML = `
                <label for="mal-aktivitet">Velg øvelse:</label>
                <select id="mal-aktivitet" required>
                    <option value="">Velg øvelse...</option>
                    ${aktiviteter.map(a => `<option value="${a.id}">${a.navn}</option>`).join('')}
                </select>
            `;
            detaljerContainer.style.display = 'block';
            break;
        case 'styrke_volum':
            malEnhet.textContent = 'kg (total vekt)';
            break;
        case 'lagidrett_tid':
            malEnhet.textContent = 'minutter';
            break;
        case 'frekvens':
            malEnhet.textContent = 'økter per uke';
            break;
        case 'kalorier':
            malEnhet.textContent = 'kalorier';
            break;
        default:
            malEnhet.textContent = '';
    }
}

async function handleMalSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const malData = {
        type: formData.get('mal-type') || document.getElementById('mal-type').value,
        beskrivelse: formData.get('mal-beskrivelse') || document.getElementById('mal-beskrivelse').value,
        maal_verdi: parseFloat(formData.get('mal-maal') || document.getElementById('mal-maal').value),
        enhet: document.getElementById('mal-enhet').textContent,
        frist: formData.get('mal-frist') || document.getElementById('mal-frist').value
    };
    
    // Add specific details based on goal type
    const aktivitetDetaljer = {};
    if (malData.type === 'kondisjon_tid') {
        aktivitetDetaljer.distanse = parseFloat(document.getElementById('mal-distanse').value);
    } else if (malData.type === 'styrke_vekt') {
        aktivitetDetaljer.aktivitet_id = parseInt(document.getElementById('mal-aktivitet').value);
    }
    
    if (Object.keys(aktivitetDetaljer).length > 0) {
        malData.aktivitet_detaljer = JSON.stringify(aktivitetDetaljer);
    }
    
    try {
        const response = await fetch('/api/mal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(malData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Kunne ikke opprette mål');
        }
        
        alert('Mål opprettet!');
        hideMalForm();
        await loadAktiveMal();
        
    } catch (error) {
        console.error('Feil ved oppretting av mål:', error);
        alert('Feil ved oppretting av mål: ' + error.message);
    }
}

async function slettMal(malId) {
    if (!confirm('Er du sikker på at du vil slette dette målet?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/mal/${malId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Kunne ikke slette mål');
        }
        
        alert('Mål slettet!');
        await loadAktiveMal();
        
    } catch (error) {
        console.error('Feil ved sletting av mål:', error);
        alert('Feil ved sletting av mål: ' + error.message);
    }
}

async function checkForNewBadges() {
    // This function checks if user has achieved any new badges
    // and automatically awards them
    
    try {
        // Get current statistics
        const kondisjonResponse = await fetch('/api/kondisjon');
        const kondisjonData = await kondisjonResponse.json();
        
        const styrkeResponse = await fetch('/api/styrke/okter');
        const styrkeData = await styrkeResponse.json();
        
        const lagidrettResponse = await fetch('/api/lagidrett');
        const lagidrettData = await lagidrettResponse.json();
        
        // Check various badge criteria
        await checkFirstTimeBadges(kondisjonData, styrkeData, lagidrettData);
        await checkDistanceBadges(kondisjonData);
        await checkSingleDistanceBadges(kondisjonData);
        await checkTempoBadges(kondisjonData);
        await checkStrenthBadges(styrkeData);
        await checkLagidrettBadges(lagidrettData);
        await checkCalorieBadges(kondisjonData, styrkeData, lagidrettData);
        await checkTimeBadges(kondisjonData, styrkeData, lagidrettData);
        await checkSessionBadges(kondisjonData, styrkeData, lagidrettData);
        await checkStreakBadges();
        
    } catch (error) {
        console.error('Feil ved sjekk av badges:', error);
    }
}

async function checkFirstTimeBadges(kondisjon, styrke, lagidrett) {
    if (kondisjon.length > 0) await awardBadgeIfNotExists('first_kondisjon');
    if (styrke.length > 0) await awardBadgeIfNotExists('first_styrke');
    if (lagidrett.length > 0) await awardBadgeIfNotExists('first_lagidrett');
}

async function checkDistanceBadges(kondisjon) {
    const totalKm = kondisjon.reduce((sum, session) => sum + (session.km || 0), 0);
    
    if (totalKm >= 500) await awardBadgeIfNotExists('total_500k');
    else if (totalKm >= 200) await awardBadgeIfNotExists('total_200k');
    else if (totalKm >= 100) await awardBadgeIfNotExists('total_100k');
    else if (totalKm >= 50) await awardBadgeIfNotExists('total_50k');
    else if (totalKm >= 21) await awardBadgeIfNotExists('total_21k');
    else if (totalKm >= 10) await awardBadgeIfNotExists('total_10k');
    else if (totalKm >= 5) await awardBadgeIfNotExists('total_5k');
}

async function checkSingleDistanceBadges(kondisjon) {
    const maxSingleKm = Math.max(...kondisjon.map(session => session.km || 0));
    
    if (maxSingleKm >= 21) await awardBadgeIfNotExists('single_21k');
    else if (maxSingleKm >= 15) await awardBadgeIfNotExists('single_15k');
    else if (maxSingleKm >= 10) await awardBadgeIfNotExists('single_10k');
    else if (maxSingleKm >= 5) await awardBadgeIfNotExists('single_5k');
}

async function checkTempoBadges(kondisjon) {
    const tempoSessions = kondisjon.filter(session => {
        const tempo = session.tid_minutter / session.km; // min/km
        return tempo > 0 && tempo < 10; // realistic tempo
    });
    
    const bestTempo = Math.min(...tempoSessions.map(session => session.tid_minutter / session.km));
    
    if (bestTempo <= 3.5) await awardBadgeIfNotExists('tempo_330');
    else if (bestTempo <= 4.0) await awardBadgeIfNotExists('tempo_4min');
    else if (bestTempo <= 4.5) await awardBadgeIfNotExists('tempo_430');
    else if (bestTempo <= 5.0) await awardBadgeIfNotExists('tempo_5min');
}

async function checkStrenthBadges(styrke) {
    if (styrke.length >= 200) await awardBadgeIfNotExists('styrke_200');
    else if (styrke.length >= 100) await awardBadgeIfNotExists('styrke_100');
    else if (styrke.length >= 50) await awardBadgeIfNotExists('styrke_50');
    
    // Check total weight lifted (need to calculate from exercises)
    try {
        const ovelsesResponse = await fetch('/api/styrke/ovelser');
        const ovelsesData = await ovelsesResponse.json();
        
        const totalWeight = ovelsesData.reduce((sum, ovelse) => {
            return sum + (ovelse.vekt * ovelse.reps * ovelse.sett);
        }, 0);
        
        if (totalWeight >= 10000) await awardBadgeIfNotExists('total_10000kg');
        else if (totalWeight >= 5000) await awardBadgeIfNotExists('total_5000kg');
        else if (totalWeight >= 1000) await awardBadgeIfNotExists('total_1000kg');
        
        // Check total sets and reps
        const totalSets = ovelsesData.reduce((sum, ovelse) => sum + ovelse.sett, 0);
        const totalReps = ovelsesData.reduce((sum, ovelse) => sum + (ovelse.reps * ovelse.sett), 0);
        
        if (totalSets >= 500) await awardBadgeIfNotExists('sets_500');
        if (totalReps >= 5000) await awardBadgeIfNotExists('reps_5000');
        
    } catch (error) {
        console.error('Feil ved sjekk av styrke statistikk:', error);
    }
}

async function checkLagidrettBadges(lagidrett) {
    if (lagidrett.length >= 50) await awardBadgeIfNotExists('lagidrett_50');
    else if (lagidrett.length >= 25) await awardBadgeIfNotExists('lagidrett_25');
    else if (lagidrett.length >= 10) await awardBadgeIfNotExists('lagidrett_10');
    
    // Check for different sports
    const uniqueSports = [...new Set(lagidrett.map(session => session.sport))];
    if (uniqueSports.length >= 5) await awardBadgeIfNotExists('sports_5');
    else if (uniqueSports.length >= 3) await awardBadgeIfNotExists('sports_3');
}

async function checkCalorieBadges(kondisjon, styrke, lagidrett) {
    const totalKalorier = [
        ...kondisjon,
        ...styrke,
        ...lagidrett
    ].reduce((sum, session) => sum + (session.kalorier || 0), 0);
    
    if (totalKalorier >= 100000) await awardBadgeIfNotExists('kalorier_100k');
    else if (totalKalorier >= 50000) await awardBadgeIfNotExists('kalorier_50k');
    else if (totalKalorier >= 25000) await awardBadgeIfNotExists('kalorier_25k');
    else if (totalKalorier >= 10000) await awardBadgeIfNotExists('kalorier_10k');
    else if (totalKalorier >= 1000) await awardBadgeIfNotExists('kalorier_1k');
    
    // Check for single session high calories
    const maxSingleCalories = Math.max(...[...kondisjon, ...styrke, ...lagidrett].map(session => session.kalorier || 0));
    if (maxSingleCalories >= 1000) await awardBadgeIfNotExists('single_1000cal');
}

async function checkTimeBadges(kondisjon, styrke, lagidrett) {
    const totalMinutes = [
        ...kondisjon.map(s => s.tid_minutter || 0),
        ...styrke.map(s => s.tid_minutter || 0),
        ...lagidrett.map(s => s.tid_minutter || 0)
    ].reduce((sum, time) => sum + time, 0);
    
    const totalHours = totalMinutes / 60;
    
    if (totalHours >= 200) await awardBadgeIfNotExists('time_200h');
    else if (totalHours >= 100) await awardBadgeIfNotExists('time_100h');
    else if (totalHours >= 50) await awardBadgeIfNotExists('time_50h');
    else if (totalHours >= 10) await awardBadgeIfNotExists('time_10h');
    
    // Check for long single sessions
    const maxSingleMinutes = Math.max(...[...kondisjon, ...styrke, ...lagidrett].map(session => session.tid_minutter || 0));
    if (maxSingleMinutes >= 180) await awardBadgeIfNotExists('long_3h');
    else if (maxSingleMinutes >= 120) await awardBadgeIfNotExists('long_2h');
}

async function checkSessionBadges(kondisjon, styrke, lagidrett) {
    const totalSessions = kondisjon.length + styrke.length + lagidrett.length;
    
    if (totalSessions >= 500) await awardBadgeIfNotExists('sessions_500');
    else if (totalSessions >= 365) await awardBadgeIfNotExists('sessions_365');
    else if (totalSessions >= 100) await awardBadgeIfNotExists('sessions_100');
}

async function checkStreakBadges() {
    // This would require more complex logic to track consecutive days
    // For now, we'll implement basic streak checking
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Get all sessions from last 30 days
        const allSessions = [];
        
        const kondisjonResponse = await fetch('/api/kondisjon');
        const kondisjonData = await kondisjonResponse.json();
        allSessions.push(...kondisjonData.filter(s => new Date(s.dato) >= thirtyDaysAgo));
        
        const styrkeResponse = await fetch('/api/styrke/okter');
        const styrkeData = await styrkeResponse.json();
        allSessions.push(...styrkeData.filter(s => new Date(s.dato) >= thirtyDaysAgo));
        
        const lagidrettResponse = await fetch('/api/lagidrett');
        const lagidrettData = await lagidrettResponse.json();
        allSessions.push(...lagidrettData.filter(s => new Date(s.dato) >= thirtyDaysAgo));
        
        // Group by date
        const sessionsByDate = {};
        allSessions.forEach(session => {
            const date = session.dato.split('T')[0]; // Get just the date part
            sessionsByDate[date] = true;
        });
        
        const uniqueDates = Object.keys(sessionsByDate).sort();
        
        // Simple streak calculation (could be improved)
        if (uniqueDates.length >= 30) await awardBadgeIfNotExists('streak_30');
        else if (uniqueDates.length >= 14) await awardBadgeIfNotExists('streak_14');
        else if (uniqueDates.length >= 7) await awardBadgeIfNotExists('streak_7');
        
    } catch (error) {
        console.error('Feil ved sjekk av streak badges:', error);
    }
}

async function awardBadgeIfNotExists(kriterium) {
    try {
        // Get badge ID from kriterium
        const badgeResponse = await fetch('/api/mal/badges');
        const badges = await badgeResponse.json();
        
        const badge = [...badges.oppnaadde, ...badges.tilgjengelige]
            .find(b => b.kriterium === kriterium);
        
        if (!badge) return;
        
        // Check if already awarded
        const alreadyAwarded = badges.oppnaadde.find(b => b.kriterium === kriterium);
        if (alreadyAwarded) return;
        
        // Award badge
        const response = await fetch(`/api/mal/badge/${badge.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                detaljer: `Automatisk tildelt: ${new Date().toISOString()}`
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showBadgeNotification(result.badge);
        }
        
    } catch (error) {
        console.error('Feil ved tildeling av badge:', error);
    }
}

function showBadgeNotification(badge) {
    // Create a notification for new badge
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
        <div class="badge-notification-content">
            <span class="badge-ikon">${badge.ikon}</span>
            <div>
                <strong>Ny Badge!</strong><br>
                ${badge.navn}
            </div>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd700, #ffed4e);
        color: #333;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideIn 0.5s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 5000);
}

// Helper functions for goal display
function formatMalType(type) {
    const types = {
        'kondisjon_distanse': 'Kondisjon Distanse',
        'kondisjon_tid': 'Kondisjon Tid',
        'styrke_vekt': 'Styrke Vekt',
        'styrke_volum': 'Styrke Volum',
        'lagidrett_tid': 'Lagidrett Tid',
        'frekvens': 'Treningsfrekvens',
        'kalorier': 'Kalorier'
    };
    return types[type] || type;
}

function formatMalStatus(status) {
    const statuses = {
        'aktiv': 'Aktiv',
        'fullfort': 'Fullført',
        'utlopt': 'Utløpt'
    };
    return statuses[status] || status;
}

// Add CSS for badge notification animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .badge-notification-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .badge-notification .badge-ikon {
        font-size: 1.5em;
    }
`;
document.head.appendChild(style);

// ============ REKORDER FUNCTIONS ============

async function loadRekorder() {
    try {
        // Last kondisjon rekorder
        const response = await fetch('/api/rekorder');
        const rekorder = await response.json();
        
        if (!response.ok) {
            throw new Error(rekorder.error || 'Kunne ikke laste rekorder');
        }
        
        displayRekorder(rekorder);
        loadRekordStatistikk();
        
        // Last styrke rekorder
        await loadStyrkeRekorder();
        
    } catch (error) {
        console.error('Feil ved lasting av rekorder:', error);
        ['3km', '5km', '10km', '15km'].forEach(distanse => {
            document.getElementById(`rekord-${distanse}`).innerHTML = 
                `<p class="error">Feil ved lasting: ${error.message}</p>`;
        });
    }
}

function displayRekorder(rekorder) {
    const distanser = ['3km', '5km', '10km', '15km'];
    
    distanser.forEach(distanse => {
        const container = document.getElementById(`rekord-${distanse}`);
        const rekord = rekorder[distanse];
        
        if (!rekord) {
            container.innerHTML = `
                <div class="no-rekord">
                    <p>Ingen data ennå</p>
                    <small>Løp ${distanse.replace('km', '')} km for å sette din første rekord!</small>
                </div>
            `;
            return;
        }
        
        const tid = formatTime(rekord.beste_tid_minutter);
        const tempo = formatTempo(rekord.tempo_per_km);
        const statusClass = rekord.type === 'eksakt' ? 'eksakt' : 'estimert';
        const statusText = rekord.type === 'eksakt' ? 'Eksakt' : 'Estimert';
        
        container.innerHTML = `
            <span class="rekord-tid">${tid}</span>
            <div class="rekord-tempo">${tempo} min/km</div>
            <div class="rekord-dato">${formatDate(rekord.dato)}</div>
            <span class="rekord-status ${statusClass}">${statusText}</span>
            ${rekord.basert_pa ? `<div class="rekord-detaljer">Basert på ${rekord.basert_pa}</div>` : ''}
        `;
    });
}

async function loadRekordStatistikk() {
    try {
        // Hent kondisjon data for å beregne statistikk
        const response = await fetch('/api/kondisjon');
        const kondisjonData = await response.json();
        
        if (!response.ok) {
            throw new Error('Kunne ikke laste kondisjon data');
        }
        
        const stats = beregneRekordStatistikk(kondisjonData);
        displayRekordStatistikk(stats);
        
    } catch (error) {
        console.error('Feil ved lasting av rekord statistikk:', error);
        document.getElementById('rekord-stats').innerHTML = 
            `<p class="error">Kunne ikke laste statistikk</p>`;
    }
}

function beregneRekordStatistikk(kondisjonData) {
    if (kondisjonData.length === 0) {
        return {
            totalOkter: 0,
            totalKm: 0,
            besteTempo: 0,
            lengsteDistanse: 0
        };
    }
    
    const totalOkter = kondisjonData.length;
    const totalKm = kondisjonData.reduce((sum, okt) => sum + (okt.km || 0), 0);
    const alleTempo = kondisjonData.map(okt => okt.tid_minutter / okt.km).filter(tempo => tempo > 0);
    const besteTempo = alleTempo.length > 0 ? Math.min(...alleTempo) : 0;
    const lengsteDistanse = Math.max(...kondisjonData.map(okt => okt.km || 0));
    
    return {
        totalOkter,
        totalKm: totalKm.toFixed(1),
        besteTempo: besteTempo.toFixed(2),
        lengsteDistanse: lengsteDistanse.toFixed(1)
    };
}

function displayRekordStatistikk(stats) {
    const container = document.getElementById('rekord-stats');
    
    container.innerHTML = `
        <div class="rekord-stats-grid">
            <div class="stat-item">
                <span class="stat-value">${stats.totalOkter}</span>
                <span class="stat-label">Totale økter</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalKm}</span>
                <span class="stat-label">Totale km</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.besteTempo}</span>
                <span class="stat-label">Beste tempo (min/km)</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.lengsteDistanse}</span>
                <span class="stat-label">Lengste løp (km)</span>
            </div>
        </div>
    `;
}

async function refreshRekorder() {
    // Vis loading state
    ['3km', '5km', '10km', '15km'].forEach(distanse => {
        document.getElementById(`rekord-${distanse}`).innerHTML = '<p class="loading">Oppdaterer...</p>';
    });
    
    document.getElementById('rekord-stats').innerHTML = '<p class="loading">Oppdaterer statistikk...</p>';
    document.getElementById('styrke-rekorder-grid').innerHTML = '<p class="loading">Oppdaterer styrkerekorder...</p>';
    
    // Last inn på nytt
    await loadRekorder();
}

// STYRKE REKORDER FUNCTIONS
async function loadStyrkeRekorder() {
    try {
        const response = await fetch('/api/rekorder/styrke');
        const styrkeRekorder = await response.json();
        
        if (!response.ok) {
            throw new Error(styrkeRekorder.error || 'Kunne ikke laste styrkerekorder');
        }
        
        displayStyrkeRekorder(styrkeRekorder);
        
    } catch (error) {
        console.error('Feil ved lasting av styrkerekorder:', error);
        document.getElementById('styrke-rekorder-grid').innerHTML = 
            `<p class="error">Feil ved lasting: ${error.message}</p>`;
    }
}

function displayStyrkeRekorder(rekorder) {
    const container = document.getElementById('styrke-rekorder-grid');
    
    if (!rekorder || rekorder.length === 0) {
        container.innerHTML = `
            <div class="no-rekord" style="grid-column: 1 / -1;">
                <p>Ingen styrkerekorder ennå</p>
                <small>Registrer styrketreninger for å se dine rekorder!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = rekorder.map(rekord => `
        <div class="rekord-card">
            <div class="rekord-header">
                <h3>💪 ${rekord.aktivitet_navn}</h3>
                <span class="rekord-type">Styrke</span>
            </div>
            <div class="rekord-content">
                <div class="rekord-main">
                    <div class="rekord-value">
                        <span class="value">${rekord.beste_vekt_ovelse || 0}</span>
                        <span class="unit">kg</span>
                    </div>
                    <div class="rekord-label">Maks vekt</div>
                </div>
                
                <div class="rekord-details">
                    ${rekord.beste_vekt_dato ? `
                        <p><strong>Satt:</strong> ${formatDate(rekord.beste_vekt_dato)}</p>
                        <p><strong>Utført:</strong> ${rekord.beste_vekt_sett}×${rekord.beste_vekt_reps}</p>
                    ` : ''}
                    
                    ${rekord.beste_1rm ? `
                        <p><strong>Estimert 1RM:</strong> ${Math.round(rekord.beste_1rm)} kg</p>
                    ` : ''}
                    
                    <p><strong>Antall økter:</strong> ${rekord.antall_okter || 0}</p>
                    <p><strong>Totale øvelser:</strong> ${rekord.antall_ovelser || 0}</p>
                    
                    ${rekord.gjennomsnitt_vekt ? `
                        <p><strong>Gj.snitt vekt:</strong> ${Math.round(rekord.gjennomsnitt_vekt)} kg</p>
                    ` : ''}
                </div>
                
                ${rekord.maks_vekt && rekord.maks_vekt !== rekord.beste_vekt_ovelse ? `
                    <div class="rekord-note">
                        <small>Manuell maks: ${rekord.maks_vekt} kg</small>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}
