/*******************************************************************************
 * ---------------------------
 * Log Script für ioBroker zum Aufbereiten des Logs für Visualisierungen (vis), oder um
 * auf Log-Ereignisse zu reagieren.
 * ---------------------------
 *
 * Das Script nimmt jeden neuen Logeintrag des ioBrokers und wendet entsprechend gesetzte
 * Filter an, um den Eintrag dann in den entsprechenden Datenpunkten dieses Scripts abzulegen.
 
 * Es stehen auch JSON-Datenpunkte zur Verfügung, mit diesen kann im vis eine
 * Tabelle ausgegeben werden (z.B. über das Widget 'basic - Table')-
 *
 * Aktuelle Version:    https://github.com/Mic-M/iobroker.logfile-script
 * Support:             https://forum.iobroker.net/topic/13971/vorlage-log-datei-aufbereiten-f%C3%BCr-vis-javascript
 *
 * Change Log:
 *  1.02 alpha  Mic  - fix restarting at 0:00 (note: restarting is needed due to log file name change)
 *  1.01 alpha  Mic  - fix: creating new file system log file only if not yet existing
 *  1.00 alpha  Mic  - Entirely recoded to implement node-tail (https://github.com/lucagrulla/node-tail).
 *  ----------------------------------------------------------------------------------------------------
 *  0.8.1 Mic - Fix: L_SORT_ORDER_DESC was not defined (renamed constant name was not changed in config)
 *  0.8 Mic - Fix: Script caused a "file not found" error if executed right at or shortly after midnight.
 *  0.7 Mic - Fix: States "...clearDateTime" will not get an initial date value on first script start,
 *                 also fix for "on({id: ".
 *  0.6 Mic + Put 0.5.1 BETA into stable
 *          + New option L_APPLY_CSS. If true, it will add <span class='log-info'>xxx</span>
 *            to each log string. 'log-info' for level info, 'log-error' for error, etc.
 *            This makes it easy to format a JSON table with CSS.
 *  0.5.1 BETA Mic + New States "Clear JSON log ..." and "Clear JSON log - Date/Time ...".
 *                   When the button "Clear JSON log" is pushed, the current date/time
 *                   will be set into the date/time state. Once refreshed
 *                   (per schedule in the script, e.g. after 2 minutes), the JSON
 *                   will be cleaned and display just newer logs.
 *                   Use Case: In vis, you can now add a button "clear log" or
 *                   "Mark as read". If you hit the button, the log will be
 *                   cleared and just new log items will be displayed.
 *                   *** THIS IS STILL BEING TESTED *** therefore a beta release...
 *  0.5  Mic + New parameter 'clean' to remove certain strings
 *             from the log line.
 *           + New parameter 'columns' for JSON output to specify which columns
 *             to be shown, and in which order.
 *           + New state "JSONcount" to have the number of log lines in state
 *           - Fixed a few issues
 *  0.4  Mic - Bug fix: improved validation of log line consistency
 *  0.3  Mic + Added filtering and blacklist
 *           - Several fixes
 *  0.2  Mic - Bug fix: corrected wrong function name
 *  0.1  Mic * Initial release
 *******************************************************************************/

/*******************************************************************************
 * WICHTIG - INSTALLATION
 ******************************************************************************/
/**
 * --------------------------------------------------------------------------
 * Dieses Script benötigt node-tail (https://github.com/lucagrulla/node-tail).
 * --------------------------------------------------------------------------
 * Option 1: Hinzufügen im JavaScript-Adapter:
 *    1. Im ioBroker links auf "Instanzen" klicken, dort den JS-Adapter wählen, etwa javascript.0
 *    2. Unter "Zusätzliche NPM-Module" einfach "tail" (ohne Anführungszeichen) eingeben
 *    3. Speichern
 * 
 * Option 2: Installation in der Konsole:
 *    Wer das nicht im JS-Adapter hinzufügen möchte, kann auch so vorgehen:
 *    1. cd /opt/iobroker/node_modules/iobroker.js-controller/
 *    2. npm install tail
 */



/*******************************************************************************
 * Konfiguration: Pfade
 ******************************************************************************/
// Pfad, unter dem die States (Datenpunkte) in den Objekten angelegt werden.
// Kann man so bestehen lassen.
const LOG_STATE_PATH = 'javascript.'+ instance + '.' + 'Log-Script';

// Pfad zum Log-Verzeichnis auf dem Server.
// Standard-Pfad unter Linux: '/opt/iobroker/log/'. Wenn das bei dir auch so ist, dann einfach belassen.
const LOG_FS_PATH = '/opt/iobroker/log/';

/*******************************************************************************
 * Konfiguration: Alle Logeinträge - Global
 ******************************************************************************/

// Zahl: Maximale Anzahl der letzten Logeinträge in den Datenpunkten. Alle älteren werden entfernt.
// Bitte nicht allzu viele behalten, denn das kostet Performance.
const LOG_NO_OF_ENTRIES = 100;

// Sortierung der Logeinträge: true für descending (absteigend, also neuester oben), oder false für ascending (aufsteigend, also ältester oben)
// Empfohlen ist true, damit neueste Einträge immer oben stehen.
const L_SORT_ORDER_DESC = true;

/**
 * Schwarze Liste (Black list)
 * Falls einer dieser Satzteile/Begriffe in einer Logzeile enthalten ist, dann wird der Log-Eintrag
 * komplett ignoriert, egal was weiter unten eingestellt wird.
 * Dies dient dazu, um penetrante Logeinträge gar nicht erst zu berücksichtigen.
 * Bitte beachten: 
 * 1. Mindestens 3 Zeichen erforderlich, sonst wird es nicht berücksichtigt (würde auch wenig Sinn ergeben).
 * 2. Bestehende Datenpunkt-Inhalte dieses Scripts bei Anpassung dieser Option werden nicht nachträglich neu gefiltert,
 *    sondern nur alle neu hinzugefügten Log-Einträge ab Speichern des Scripts werden berücksichtigt.
 */
const BLACKLIST_GLOBAL = [
    '<==Disconnect system.user.admin from ::ffff:', 
    'system.adapter.ical.0 terminated with code 0 (OK)', 
    '', 
    '', 
    '', 
    '',     
];

/*******************************************************************************
 * Konfiguration: Datenpunkte und Filter
 ******************************************************************************/
// Dies ist das Herzstück dieses Scripts: hier werden die Datenpunkte konfiguriert, die erstellt werden sollen. 
// Hierbei kannst du entsprechend Filter setzen, also Wörter/Begriffe, die in Logeinträgen enthalten sein
// müssen, damit sie in den jeweiligen Datenpunkten aufgenommen werden.
//
// id:         Hier Begriff ohne Leerzeichen, z.B. "error", "sonoff", etc.
//             Die ID wird dann Teil der ID der Datenpunkte.
// filter_all: ALLE Begriffe müssen in der Logzeile enthalten sein. Ist einer
//             der Begriffe nicht enthalten, dann wird der komplette Logeintrag
//             auch nicht übernommen.
//             Leeres Array eingeben [] falls hier filtern nicht gewünscht.
// filter_any: Mindestens einer der gelisteten Begriffe muss enthalten sein.
//             Leeres Array eingeben [] falls hier filtern nicht gewünscht.
// blacklist:  Wenn einer dieser Begriffe im Logeintrag enthalten ist,
//             so wird der komplette Logeintrag nicht übernommen, egal was
//             vorher in filter_all oder filter_any definiert ist.
//             Mindestens 3 Zeichen erforderlich, sonst wird es nicht
//             berücksichtigt.
//             HINWEIS: BLACKLIST_GLOBAL wird vorher schon geprüft und ignoriert.
//                      Hier kannst du einfach nur noch eine individuelle Blackliste definieren.
// clean:      Der Log-Eintrag wird um diese Zeichenfolgen bereinigt, d.h. diese
//             werden entfernt, aber die restliche Zeile bleibt bestehen. Z.B.
//             um unerwünschte Zeichenfolgen zu entfernen oder Log-Ausgaben
//             zu kürzen.
// columns:    Nur für JSON (für vis). 
//             Folgende Spalten gibt es: 'date','level','source','msg'
//             Hier können einzelne Spalten entfernt oder die Reihenfolge
//             verändert werden.
//             Bitte keine anderen Werte eintragen.
//
// WEITERE HINWEISE: 
// 1. Bestehende Datenpunkt-Inhalte dieses Scripts bei Anpassung dieser Option werden nicht nachträglich neu gefiltert,
//    sondern nur alle neu hinzugefügten Log-Einträge ab Speichern des Scripts werden berücksichtigt.
// 2. Die Filter-Einträge können natürlich beliebig geändert und erweitert werden, bitte aber den Aufbau beibehalten.

const LOG_FILTER = [
/*
  {
    id:          'all',    // Beispiel "all": hier kommen alle Logeinträge rein, keine Filterung
    filter_all:  ['', ''], // wird ignoriert, wenn leer
    filter_any:  ['', ''], // wird ignoriert, wenn leer
    blacklist:   ['', ''], // wird ignoriert, wenn leer
    clean:       ['', '', ''], // wird ignoriert, wenn leer
    columns:     ['date','level','source','msg'],  // Spaltenreihenfolge für JSON (Tabelle in vis)
  },
  {
    id:          'debug',
    filter_all:  [' - debug: '], // nur Logeinträge mit Level 'debug'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
  {
    id:          'info',
    filter_all:  [' - info: '],  // nur Logeinträge mit Level 'info'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
  {
    id:          'warn',
    filter_all:  [' - warn: '],  // nur Logeinträge mit Level 'warn'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
  {
    id:          'error',
    filter_all:  [' - error: '],  // nur Logeinträge mit Level 'error'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
*/

  // Beispiel für individuellen Eintrag. Hier wird euer Hubschrauber-Landeplatz
  // überwacht :-) Wir wollen nur Einträge vom Adapter 'hubschr.0'.
  // Dabei sollen entweder Wetterwarnungen, Alarme, oder UFOs gemeldet werden.
  // Alles unter Windstärke "5 Bft" interessiert uns dabei nicht, daher haben
  // wir '0 Bft' bis '4 Bft' auf die Blackliste gesetzt.
  // Außerdem entfernen wir von der Log-Zeile die Zeichenfolgen '****', '!!!!' 
  // und 'ufo gesichtet', der Rest bleibt aber bestehen.
  // Zudem haben wir unter columns die Spaltenreihenfolge geändert. 'level'
  // herausgenommen, und Quelle ganz vorne.
/*
  {
    id:          'hubschrauberlandeplatz',
    filter_all:  ['hubschr.0'],
    filter_any:  ['wetterwarnung', 'alarm', 'ufo'],
    blacklist:   ['0 Bft', '1 Bft', '2 Bft', '3 Bft', '4 Bft'],
    clean:       ['****', '!!!!', 'ufo gesichtet'],
    columns:     ['level','date','msg'],
  }, 
*/
  {
    id:          'info',
    filter_all:  [' - info: '],
    filter_any:  ['', ''],
    blacklist:   ['', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },

   {
    id:          'error',
    filter_all:  [' - error: ', ''],
    filter_any:  [''],
    blacklist:   ['', '', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
   {
    id:          'warnanderror',
    filter_all:  ['', ''],
    filter_any:  [' - error: ', ' - warn: '],
    blacklist:   ['', 'no playback content', 'Ignore! Actual secret is '],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },

];


/*******************************************************************************
 * Konfiguration: JSON-Log (für Ausgabe z.B. im vis)
 ******************************************************************************/
// Datumsformat für JSON Log. Z.B. volles z.B. Datum mit 'yyyy-mm-dd HH:MM:SS' oder nur Uhrzeit mit "HH:MM:SS". Die Platzhalter yyyy, mm, dd usw.
// werden jeweils ersetzt. yyyy = Jahr, mm = Monat, dd = Tag, HH = Stunde, MM = Minute, SS = Sekunde. Auf Groß- und Kleinschreibung achten!
// Die Verbinder (-, :, Leerzeichen, etc.) können im Prinzip frei gewählt werden.
// Beispiele: 'HH:MM:SS' für 19:37:25, 'HH:MM' für 19:37, 'mm.dd HH:MM' für '25.07. 19:37'
const JSON_DATE_FORMAT = 'HH:MM:SS';

// Max. Anzahl Zeichen der Log-Meldung im JSON Log.
const JSON_LEN = 100;

// Zahl: Maximale Anzahl der letzten Logeinträge in den Datenpunkten. Alle älteren werden entfernt.
// Speziell für das JSON-Log zur Visualisierung, hier brauchen wir ggf. weniger als für L_NO_OF_ENTRIES gesamt.
const JSON_NO_ENTRIES = 60;

// Füge CSS-Klasse hinzu je nach Log-Level (error, warn, info, etc.), um Tabellen-Text zu formatieren.
// Beispiel für Info: ersetzt "xxx" durch "<span class='log-info'>xxx</span>""
// Analog für error: log-error, warn: log-warn, etc.
// Beim Widget "basic - Table" im vis können im Reiter "CSS" z.B. folgende Zeilen hinzugefügt werden,
// um Warnungen in oranger und Fehler in roter Farbe anzuzeigen.
// .log-warn { color: orange; }
// .log-error { color: red; }
const JSON_APPLY_CSS = true;

// JSON_APPLY_CSS wird nur für die Spalte "level" (also error, info) angewendet, aber nicht für die 
// restlichen Spalten wie Datum, Log-Eintrag, etc.
// Falls alle Zeilen formatiert werden sollen: auf false setzen.
const JSON_APPLY_CSS_LIMITED_TO_LEVEL = true;




/*******************************************************************************
 * Konfiguration: Konsolen-Ausgaben
 ******************************************************************************/
// Auf true setzen, wenn zur Fehlersuche einige Meldungen ausgegeben werden sollen.
// Ansonsten bitte auf false stellen.
const LOG_DEBUG = false;

// Auf true setzen, wenn ein paar Infos dieses Scripts im Log ausgegeben werden dürfen, bei false bleiben die Infos komplett weg.
const LOG_INFO = true;




/*******************************************************************************
 * Experten-Konfiguration
 ******************************************************************************/
// Leer lassen! Nur setzen, falls ein eigener Filename für das Logfile verwendet wird für Debug.
const DEBUG_CUSTOM_FILENAME = '';

// Regex für die Aufteilung des Logs in 1-Datum/Zeit, 3-Level, 5-Quelle und 7-Logtext.
// Ggf. anzupassen bei anderem Datumsformat im Log. Wir erwarten ein Format
// wie z.B.: '2018-07-22 12:45:02.769  - info: javascript.0 Stop script script.js.ScriptAbc'
const REGEX_LOG = /([0-9_.\-:\s]*)(\s+\- )(silly|debug|info|warn|error|)(: )([a-z0-9.\-]*)(\s)(.*)/g;

// Debug: Ignore. Wenn dieses String in der Logzeile enthalten ist, dann ignorieren wir es.
// Dient dazu, dass wir während des Scripts ins Log schreiben können, ohne dass das dieses Script berücksichtigt.
const DEBUG_IGNORE_STR = '[LOGSCRIPT_IGNORE]'; // Muss ein  individuelles String sein. Sonst gibt es ggf. eine Endlos-Schleife.



// Debug: Prüfen, ob jede Logzeile erfasst wird, in dem wir diese direkt danach noch mal ins Log schreiben.
// Bitte nur auf Anweisung vom Entwickler einschalten. Sonst wird jeder Logeintrag noch einmal wiederholt, 
// mit führendem DEBUG_EXTENDED_STR am Anfang und max. DEBUG_EXTENDED_NO_OF_CHARS an Anzahl Zeichen.
const DEBUG_EXTENDED = false;
const DEBUG_EXTENDED_STR = '[LOGSCRIPT_DEBUG_EXTENDED]'; // Muss ein  individuelles String sein. Sonst gibt es ggf. eine Endlos-Schleife.
const DEBUG_EXTENDED_NO_OF_CHARS = 120;



/*************************************************************************************************************************
 * Ab hier nichts mehr ändern / Stop editing here!
 *************************************************************************************************************************/

/****************************
 * Global variables.
 ****************************/
// This script requires tail. https://github.com/lucagrulla/node-tail
let G_Tail = require('tail').Tail; // Please ignore the red wavy underline. The JavaScript editor does not recognize if node-tail is installed
let G_tailOptions= {separator: /[\r]{0,1}\n/, fromBeginning: false}
let G_tail; // being set later

// Schedule for every midnight. So not set at this point.
let G_Schedule; // being set later

/***************************
 * This is executed on every script (re)start.
 * We do some timing here with setTimeout() to avoid warnings like if states not yet exist, etc.
 ***************************/
init();
function init() {
    
    // Create our states, if not yet existing.
    createLogStates();

    // Subscribe on changes: Pressed button "clearJSON"
    setTimeout(subscribeClearJson, 4000);

    // Start main function
    setTimeout(main, 3000);

    // Every midnight at 0:00, we have a new log file. So, we schedule accordingly.
    let strCron = '0 0 * * *' // At 00:00 every day.
    clearSchedule(G_Schedule);
    setTimeout(function(){
        G_Schedule = schedule(strCron, main);
    }, 20000);

}


/**
 * Main Function.
 * 
 * It tailes the ioBroker log, so we get every new log entry as string.
 * Requires https://github.com/lucagrulla/node-tail
 */
function main() {

    // First, we end the tailing. 
    endTailingProcess();

    // Next, we start the tailing process.
    setTimeout(startTailingProcess, 2500);

    // Finally, we continue.
    setTimeout(function() {
    
        if (LOG_INFO) log('Start/continue monitoring ioBroker log...')

        G_tail.on('line', function(newLogEntry) {
            // Check if we have DEBUG_IGNORE_STR in the new log line
            if(! newLogEntry.includes(DEBUG_IGNORE_STR)) {

                // Cleanse and apply blacklist
                newLogEntry = cleanseLogLine(newLogEntry);

                if ( (! isLikeEmpty(newLogEntry)) && (newLogEntry.length > 30) ) { // Avoid log lines with just a few chars

                    if (LOG_DEBUG) log (DEBUG_IGNORE_STR + '===============================================================');
                    if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'New Log Entry, Len (' + newLogEntry.length + '), content: [' + newLogEntry + ']');

                    // Apply the filters as set in LOG_FILTER and split up log levels into elements of an array
                    let logEntryFilteredArray = applyFilter(newLogEntry);

                    // Further process and finally set states with our results.
                    processLogArrayAndSetStates(logEntryFilteredArray);

                    // That's it.

                    // This is for debugging purposes, and it will log every new log entry once again. See DEBUG_EXTENDED option above.
                    if (DEBUG_EXTENDED) {
                        if (! newLogEntry.includes(DEBUG_EXTENDED_STR)) { // makes sure no endless loop here.
                            log(DEBUG_EXTENDED_STR + newLogEntry.substring(0, DEBUG_EXTENDED_NO_OF_CHARS));
                        }
                    }
                }
            }
        });

        G_tail.on('error', function(error) {
            // Error Handling
            log('Tail error', error);
            if (error.includes('ENOENT: no such file or directory')) {
                // It looks like the log file was deleted. So we restart process.
                // Will also create a new log file if not existing.
                restartTailingProcess();
                log('Tail process re-started due to file/directory not found error. It will create a new log file if it has been deleted.', 'warn')
            } else {
                log('Tailing process ended by the log script due to this error.', 'warn');
                endTailingProcess();
            }
        });

    }, 5000);

}



/**
 * Start new tailing process
 */
function startTailingProcess() {
    // Path to iobroker log file
    let strFsFullPath = getCurrentFullFsLogPath();
    // Create a new log file. It will created if it is not yet existing.
    // This will avoid an error if right after midnight the log file is not yet there
    const fs = require('fs');
    if (fs.existsSync(strFsFullPath)) {
        // File is existing
    } else {
        // File is not existing, so we create it.
        if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Log file is not existing, so we need to create a blank file.');
        fs.writeFile(strFsFullPath, '', function(err) {
            if(err) return log(err);
        }); 
    }

    // Now start new tailing instance
    if(LOG_INFO) log('Start new Tail process. File path to current log: [' + strFsFullPath + ']');
    G_tail = new G_Tail(strFsFullPath, G_tailOptions);

}

/************************
 * Restart Tail.
 ************************/
function restartTailingProcess() {
    // End tailing
    endTailingProcess();
    // Start new TAIL process, as we have a new log file every 0:00.
    startTailingProcess();
}

/**************
 * End the tailing process
 **************/
function endTailingProcess() {
    /**
     * End the tailing gracefully.
     * Exit process: see here: https://stackoverflow.com/questions/5266152/how-to-exit-in-node-js/37592669#37592669
     */

    // Properly set the exit code while letting the process exit gracefully.
        if ( typeof G_tail !== 'undefined' && G_tail ) {
            G_tail.unwatch(); // just in case.
            G_tail.exitCode = 1;
            if(LOG_DEBUG) log('Properly end the existing Tail process.');
        } else {
            if(LOG_DEBUG) log('Tail process was not active, so nothing to stop.');
        }
}


/***************
 * Being executed if this ioBroker Script stops. 
 * This is to end the Tale. Not sure, if we indeed need it, but just in case...
 */
onStop(function myScriptStop () {
    endTailingProcess();
}, 0);


/**
 * Create all States we need at this time.
 */
function createLogStates() {

    let logCleanIDs = '';
    let statesArray = [];
    if (isLikeEmpty(LOG_FILTER) === false) {
        for(let i = 0; i < LOG_FILTER.length; i++) {
            if (LOG_FILTER[i].id !== '') {
                let strIDClean = cleanseStatePath(LOG_FILTER[i].id);
                logCleanIDs += ((logCleanIDs === '') ? '' : '; ') + strIDClean;

                statesArray.push({ id:'log' + strIDClean + '.log', name:'Filtered Log - ' + strIDClean, type:"string", role: "state", def: ""});
                statesArray.push({ id:'log' + strIDClean + '.logJSON', name:'Filtered Log - ' + strIDClean + ' - JSON', type:"string", role: "state", def: ""});
                statesArray.push({ id:'log' + strIDClean + '.logJSONcount', name:'Filtered Log - Count of JSON ' + strIDClean, role: "state", type:"number", def: 0});
                statesArray.push({ id:'log' + strIDClean + '.clearJSON', name:'Clear JSON log ' + strIDClean, role: "button", type:"boolean", def: false});
                statesArray.push({ id:'log' + strIDClean + '.clearJSONtime', name:'Clear JSON log - Date/Time ' + strIDClean, role: "state", type:"string", def: ''});
            }
        }
        if (LOG_DEBUG) log('createLogStates(): Clean IDs: ' + logCleanIDs);
    }

    for (let s=0; s < statesArray.length; s++) {

        createState(LOG_STATE_PATH + '.' + statesArray[s].id, {
            'name': statesArray[s].name,
            'desc': statesArray[s].name,
            'type': statesArray[s].type,
            'read': true,
            'write': true,
            'role': statesArray[s].role,
            'def': statesArray[s].def,
        });
    }
}


/**
 * Cleanse the log line
 * @param {string}   logLine    The log line to be cleansed.
 * @return {string}             The cleaned log line
 */
function cleanseLogLine(logLine) {
    let logLineResult = logLine.replace(/\u001b\[.*?m/g, ''); // Remove color escapes - https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
    if (logLineResult.substr(0,9) === 'undefined') logLineResult = logLineResult.substr(9,99999); // sometimes, a log line starts with the term "undefined", so we remove it.
    logLineResult = logLineResult.replace(/\s\s+/g, ' '); // Remove white space, tab stops, new line
    if(strMatchesTerms(logLineResult, BLACKLIST_GLOBAL, 'blacklist')) logLineResult = ''; // Check against global blacklist


    return logLineResult;
}



/**
 * This function applies the filters as set in LOG_FILTER.
 * Also, it splits up the log levels into elements of an array we return by this function.
 * @param {string} strLogEntry
 * @return {array}  split up log levels as elements within this array
 */
function applyFilter(strLogEntry) {

    // We add one element per each filter to the Array ('all', 'error', etc.)
    let logArrayProcessed = [];
    for (let j = 0; j < LOG_FILTER.length; j++) {
        logArrayProcessed[LOG_FILTER[j].id] = '';
    }

    // We apply regex here. This will also eliminate all log lines without proper info
    // like date/time, log level, and entry.
    let arrSplitLogLine = splitLogLineIntoArray(strLogEntry, REGEX_LOG);
    if (arrSplitLogLine !== false) {

        if (isLikeEmpty(LOG_FILTER) === false) {
                    
            // Now let's iterate over the filter array elements
            // We check if both the "all" and "any" filters  apply. If yes, - and blacklist false - we add the log line.
            for (let k = 0; k < LOG_FILTER.length; k++) {
                if ( (strMatchesTerms(strLogEntry, LOG_FILTER[k].filter_all, 'every') === true)
                && (strMatchesTerms(strLogEntry, LOG_FILTER[k].filter_any, 'some') === true)
                && (strMatchesTerms(strLogEntry, LOG_FILTER[k].blacklist, 'blacklist') === false) ) {
                    logArrayProcessed[LOG_FILTER[k].id] = logArrayProcessed[LOG_FILTER[k].id] + strLogEntry + "\n";
                }
                
                // Now we remove terms if desired
                if (isLikeEmpty(LOG_FILTER[k].clean) === false) {
                    for (let lpTerm of LOG_FILTER[k].clean) {
                        if (lpTerm !== '') {
                            logArrayProcessed[LOG_FILTER[k].id] = logArrayProcessed[LOG_FILTER[k].id].replace(lpTerm, '');
                        }
                    }
                }
            }
        }
    }
    return logArrayProcessed;
}


/************************************************************************************************
 * Further processes the log array and set states accordingly.
 * 
 * @param                     arrayLogInput     Either the Array of the log input, or '[REBUILD_LOG_STATES]' if
 *                            you just want to rebuild without adding a new log line (for example
 *                            for Json clear date/time)
 *                            Array is like: ['info':'logtext', 'error':'logtext'] etc.
 * return: none
 ************************************************************************************************/
function processLogArrayAndSetStates(arrayLogInput) {

    let justRebuild = (arrayLogInput === '[REBUILD_LOG_STATES]') ? true : false;

    // Build array from LOG_FILTER (like 'info', 'error', 'warnanderror', etc.)
    let arrayFilterIds = [];
    for (let i = 0; i < LOG_FILTER.length; i++) {
        arrayFilterIds.push(LOG_FILTER[i].id); // each LOG_FILTER id into array
    }

    // Loop through the LOG_FILTER ids
    for (let k = 0; k < arrayFilterIds.length; k++) {

        // some variables
        let lpFilterId = arrayFilterIds[k]; // Filter ID from LOG_FILTER, like 'error', 'info', 'custom', etc.
        let lpStatePath1stPart = LOG_STATE_PATH + '.log' + cleanseStatePath(lpFilterId); // Get Path to state
        let lpNewLogLine = arrayLogInput[lpFilterId]; // Current log line of provided array element of 'error', 'info', 'custom' etc.
        let lpNewFinalLog;

        // Let's check first if we have any log content for the given filter id.
        let isLoopItemEmpty = (isLikeEmpty(lpNewLogLine)) ? true : false;

        if (isLoopItemEmpty && !justRebuild) {

            // We do nothing. No rebuild needed, and loop item is empty.
            if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Filter  [' + lpFilterId + ']: No match.');

        } else {

            let strCurrentStateLog = getState(lpStatePath1stPart + '.log').val; // Get state contents of loop item

            if (justRebuild) {
                // Not adding new log line, we just rebuild so take the existing log
                lpNewFinalLog = strCurrentStateLog;
                if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Just rebuilding log, no new log line to be added. Loop Filter ID: [' + lpFilterId + '], lpNewLogLine: [' + lpNewLogLine + ']');

            } else {

                if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Filter [' + lpFilterId + ']: Match! New Log Line length: (' + lpNewLogLine.length + ')');

                // Append new log line to state value
                if (isLikeEmpty(strCurrentStateLog)) {
                    lpNewFinalLog = lpNewLogLine; 
                } else {
                    lpNewFinalLog = lpNewLogLine + strCurrentStateLog; // "\n" not needed, always added above
                }
            }
        }

        if ( (! isLikeEmpty(lpNewFinalLog)) && (! isLoopItemEmpty) ) {

            // Convert to array for easier handling
            let lpNewFinalLogArray = lpNewFinalLog.split(/\r?\n/);

            // Remove duplicates
            lpNewFinalLogArray = arrayRemoveDublicates(lpNewFinalLogArray);

            // Remove empty values
            lpNewFinalLogArray = cleanArray(lpNewFinalLogArray);

            // Sort array descending
            lpNewFinalLogArray = sortLogArrayByDate(lpNewFinalLogArray, 'desc');

            // We need a separate array for JSON
            let lpNewFinalLogArrayJSON = lpNewFinalLogArray;

            // Let's remove elements if current date in state ".clearJSONtime" is greater than log date.
            let strTimeFromState = getState(lpStatePath1stPart + '.clearJSONtime').val;
            if (! isLikeEmpty(strTimeFromState)) {
                if (strTimeFromState !== 0) { // we set it to 0 via vis widget if we want to clear the state
                    lpNewFinalLogArrayJSON = clearJsonByDate(lpNewFinalLogArrayJSON, strTimeFromState);              
                }
            }

            // Just keep the first x elements of the array
            lpNewFinalLogArray = lpNewFinalLogArray.slice(0, LOG_NO_OF_ENTRIES);
            lpNewFinalLogArrayJSON = lpNewFinalLogArrayJSON.slice(0, JSON_NO_ENTRIES);

            // Sort ascending if desired
            if (!L_SORT_ORDER_DESC) {
                lpNewFinalLogArray = lpNewFinalLogArray.reverse();
                lpNewFinalLogArrayJSON = lpNewFinalLogArrayJSON.reverse();
            }

            // ** Finally set the states

            ///////////////////////////////
            // -1- Full Log, String, separated by "\n"
            ///////////////////////////////

            let strResult = lpNewFinalLogArray.join("\n");
            if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'New length to be set into state: (' + strResult.length + '), state: [' + lpStatePath1stPart + '.log' + ']');
            setState(lpStatePath1stPart + '.log', strResult);
            
            ///////////////////////////////
            // -2- JSON, with elements date and msg
            ///////////////////////////////
      
            // Let's put together the JSON
            let jsonArr = [];
            for (let j = 0; j < lpNewFinalLogArrayJSON.length; j++) {
                // +++
                // We apply regex here to get 4 elements in array: datetime, level, source, message
                // +++
                let arrSplitLogLine = splitLogLineIntoArray(lpNewFinalLogArrayJSON[j], REGEX_LOG);
                if (arrSplitLogLine !== false) {
                    let strLogMsg = arrSplitLogLine.message;
                    // Reduce the length for each log message per configuration
                    strLogMsg = strLogMsg.substr(0, JSON_LEN);
                    // ++++++
                    // Build the final Array
                    // ++++++
                    // We need this section to generate the JSON with the columns (which ones, and order) as specified in LOG_FILTER

                    let objectJSONentry = {}; // object (https://stackoverflow.com/a/13488998)
                    if (isLikeEmpty(LOG_FILTER[k].columns)) log('Columns not specified in LOG_FILTER', 'warn');
                    // Prepare CSS
                    let strCSS1, strCSS2;
                    let strCSS1_level, strCSS2_level;
                    if (JSON_APPLY_CSS) {
                        strCSS1 = "<span class='log-" + arrSplitLogLine.level + "'>";
                        strCSS2 = '</span>';
                        strCSS1_level = strCSS1;
                        strCSS2_level = strCSS1;
                        if (JSON_APPLY_CSS_LIMITED_TO_LEVEL) {
                            strCSS1 = '';
                            strCSS2 = '';
                        }
                    }

                    for (let lpCol of LOG_FILTER[k].columns) {
                        switch (lpCol) {
                            case 'date' :
                                objectJSONentry.date = strCSS1 + formatLogDateStr(arrSplitLogLine.datetime, JSON_DATE_FORMAT) + strCSS2;
                                break;
                            case 'level' :
                                objectJSONentry.level = strCSS1_level + arrSplitLogLine.level + strCSS2_level;
                                break;
                            case 'source' :
                                objectJSONentry.source = strCSS1 + arrSplitLogLine.source + strCSS2;
                                break;
                            case 'msg' :
                                objectJSONentry.msg = strCSS1 + strLogMsg + strCSS2;
                                break;
                            default:
                                //nothing;
                        }
                    }
                    // Ok, so now we have the JSON entry.
                    jsonArr.push(objectJSONentry);
                }

            }
            if (! isLikeEmpty(lpNewFinalLogArrayJSON)) {
                setState(lpStatePath1stPart + '.logJSON', JSON.stringify(jsonArr));
                setState(lpStatePath1stPart + '.logJSONcount', lpNewFinalLogArrayJSON.length);
            } 
        }
    }
}


/**
 * This will allow to set Json log to zero if button is pressed.
 */
function subscribeClearJson() {
    // Set current date to state if button is pressed
    let logSubscribe = '';
    for (let i = 0; i < LOG_FILTER.length; i++) {
        let lpFilterId = cleanseStatePath(LOG_FILTER[i].id);
        let lpStateFirstPart = LOG_STATE_PATH + '.log' + lpFilterId;
        logSubscribe += ( (logSubscribe === '') ? '' : ', ') + lpFilterId;
        on({id: lpStateFirstPart + '.clearJSON', change: 'any', val: true}, function(obj) {
            // Set state
            if (LOG_DEBUG) log('State button [' + obj.id + '] was pressed.');
            let currentDate = new Date();
            setState(obj.id + 'time', currentDate.toString());
            // Rebuild
            setTimeout(function() {
                processLogArrayAndSetStates('[REBUILD_LOG_STATES]');
            }, 1000); 
        });
    }
    if (LOG_DEBUG) log('Subscribing to Clear JSON Buttons: ' + logSubscribe)
}


/*************************************************************************************************************************
 * Script specific supporting functions
 *************************************************************************************************************************/

/**
 * Reformats a log date string accordingly
 * @param {string}    strDate   The date to convert
 * @param {string}  format      e.g. 'yyyy-mm-dd HH:MM:SS'.
 *
 */
function formatLogDateStr(strDate, format) {

    let strResult = format;
    strResult = strResult.replace('yyyy', strDate.substr(0,4));
    strResult = strResult.replace('mm', strDate.substr(5,2));
    strResult = strResult.replace('dd', strDate.substr(8,2));
    strResult = strResult.replace('HH', strDate.substr(11,2));
    strResult = strResult.replace('MM', strDate.substr(14,2));
    strResult = strResult.replace('SS', strDate.substr(17,2));

    return strResult;

}

/**
 * Sorts the log array by date. We expect the first 23 chars of each element being a date in string format.
 * @param {array} inputArray       Array to process
 * @param {string}  order          'asc' or 'desc' for ascending or descending order
 */
function sortLogArrayByDate(inputArray, order) {
    var result = inputArray.sort(function(a,b){
            // Turn your strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            a = new Date(a.substr(0,23));
            b = new Date(b.substr(0,23));
            if (order === 'asc') {
                return a - b;
            } else {
                return b - a;
            }

    });

    return result;
}


/**
 * Splits a given log entry into an array with 4 elements.
 * @param {string} strLog   Log line like '2018-07-22 11:47:53.019  - info: javascript.0 script.js ...'
 * @param {RegExp} regExp RegEx
 * @return: {array}  Array with 4 elements: 
 *          0. datetime (e.g. 2018-07-22 11:47:53.019),
 *          1. level (e.g. info)
 *          2. source (e.g. javascript.0)
 *          3. message (e.g. script.js....)
 *          Returns FALSE if no match
 */
function splitLogLineIntoArray(strLog, regExp) {

    // At first we split into array
    let returnArray = {}

    let m;
    do {
        m = regExp.exec(strLog);
        if (m) {
            returnArray.datetime = m[1];
            returnArray.level = m[3];
            returnArray.source = m[5];
            returnArray.message = m[7];
        } 
    } while (m);

    // Now we check if we have valid entries we want
    if ((returnArray.datetime === undefined)
        || (returnArray.level === undefined)
        || (returnArray.source === undefined)
        || (returnArray.message === undefined)
    ){
        return false; // no valid hits
    }

    // We can return the array now, since it meets all requirements
    return returnArray;

}


/*************
 * Get the file system path and filename of the current log file.
 * 
 * ioBroker creates a log file every midnight at 0:00 under '/opt/iobroker/log/'
 * Syntax of the log file is: iobroker.YYYY-MM-DD.log
 * This function returns the full path to the log file, considering the current date/time when this function is called.
 * @return {string}      Path and file name to log file.
 */
function getCurrentFullFsLogPath() {
    let strLogPathFinal = LOG_FS_PATH;
    if (strLogPathFinal.slice(-1) !== '/') strLogPathFinal = strLogPathFinal + '/';
    let strFullLogPath = strLogPathFinal + DEBUG_CUSTOM_FILENAME;
    if (DEBUG_CUSTOM_FILENAME === '') strFullLogPath = strLogPathFinal + 'iobroker.' + getCurrentISODate() + '.log';
    return strFullLogPath;
}

/**
 * Clear array: if strDate is greater or equal than log date, we remove the entire log entry
 */
function clearJsonByDate(inputArray, strDate) {
    let dtState = new Date(strDate); // the date provided from the state

    let newArray = [];
    for (let lpLog of inputArray) {
        let dtLog = new Date(lpLog.substr(0,23));
        if (dtLog >= dtState) {
            newArray.push(lpLog);            
        }

  }
  return newArray;
}





/*************************************************************************************************************************
 * General supporting functions
 *************************************************************************************************************************/

/**
 * Remove Duplicates from Array
 * Source - https://stackoverflow.com/questions/23237704/nodejs-how-to-remove-duplicates-from-array
 * @param {array} inputArray       Array to process
 * @return {array}  Array without duplicates.
 */
function arrayRemoveDublicates(inputArray) {
    let uniqueArray;
    uniqueArray = inputArray.filter(function(elem, pos) {
        return inputArray.indexOf(elem) == pos;
    });
    return uniqueArray;
}

/**
 * Clean Array: Removes all falsy values: undefined, null, 0, false, NaN and "" (empty string)
 * Source: https://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
 * @param {array} inputArray       Array to process
 * @return {array}  Cleaned array
 */
function cleanArray(inputArray) {
  var newArray = [];
  for (let i = 0; i < inputArray.length; i++) {
    if (inputArray[i]) {
      newArray.push(inputArray[i]);
    }
  }
  return newArray;
}


/**
 * Checks if Array or String is not undefined, null or empty.
 * @param inputVar - Input Array or String, Number, etc.
 * @return true if it is undefined/null/empty, false if it contains value(s)
 * Array or String containing just whitespaces or >'< or >"< is considered empty
 */
function isLikeEmpty(inputVar) {
    if (typeof inputVar !== 'undefined' && inputVar !== null) {
        let strTemp = JSON.stringify(inputVar);
        strTemp = strTemp.replace(/\s+/g, ''); // remove all whitespaces
        strTemp = strTemp.replace(/\"+/g, "");  // remove all >"<
        strTemp = strTemp.replace(/\'+/g, "");  // remove all >'<
        if (strTemp !== '') {
            return false;
        } else {
            return true;
        }
    } else {
        return true;
    }
}

/**
 * Returns the current date in ISO format "YYYY-MM-DD".
 * @return  {string}    Date in ISO format
 */
function getCurrentISODate() {
    let currDate = new Date();
    return currDate.getFullYear() + '-' + zeroPad((currDate.getMonth() + 1), 2) + '-' + zeroPad(currDate.getDate(), 2);
}

/**
 * Fügt Vornullen zu einer Zahl hinzu, macht also z.B. aus 7 eine "007". 
 * zeroPad(5, 4);    // wird "0005"
 * zeroPad('5', 6);  // wird "000005"
 * zeroPad(1234, 2); // wird "1234" :)
 * @param  {string|number}  num     Zahl, die Vornull(en) bekommen soll
 * @param  {number}         places  Anzahl Stellen.
 * @return {string}         Zahl mit Vornullen wie gewünscht.
 */
function zeroPad(num, places) {
    let zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;        


} 




/**
 * Will just keep lower case letters, numbers, '-' and '_' and removes the rest
 * Also, capitalize first Letter.
 */
function cleanseStatePath(stringInput) {
    let strProcess = stringInput;
    strProcess = strProcess.replace(/([^a-z0-9_\-]+)/gi, '');
    strProcess = strProcess.toLowerCase();
    strProcess = strProcess.charAt(0).toUpperCase() + strProcess.slice(1);
    return strProcess;

}


/**
 * Checks if the string provided contains either every or some terms.
 * Source: https://stackoverflow.com/questions/36283767/javascript-select-the-string-if-it-matches-multiple-words-in-array
 * @param {string} strInput - The string on which we run this search
 * @param {array} arrayTerms - The terms we are searching, e.g. ["hue", "error", "raspberry"]
 * @param {string} type - 'every': all terms must match to be true,
 *                        'some': at least one term (or more) must match
 *                        'blacklist': different here: function will always
 *                         return FALSE, but if one of the arrayTerms contains
 *                         minimum 3 chars and is found in provided string,
 *                         we return TRUE (= blacklisted item found).
 * @return {boolean}       true, if it contains ALL words, false if not all words (or none)
 *                         Also, will return true if arrayTerms is not array or an empty array
 */
function strMatchesTerms(strInput, arrayTerms, type) {
    if(type === 'blacklist') {
        if (Array.isArray(arrayTerms)) {
            let arrayTermsNew = [];
            for (let lpTerm of arrayTerms) {
                if (lpTerm.length >= 3) {
                    arrayTermsNew.push(lpTerm);
                }
            }
            if(isLikeEmpty(arrayTermsNew) === false) {
                let bResultBL = arrayTermsNew.some(function(word) {
                    return strInput.indexOf(word) > -1;
                });
                return bResultBL;
            } else {
                return false; // return false if no items to be blacklisted
            }
        } else {
            return false; // we return false if the arrayTerms given is not an array. Want to make sure if we really should blacklist...
        }

    } else {
        if (Array.isArray(arrayTerms)) {
            if(type === 'every') {
                let bResultEvery = arrayTerms.every(function(word) {
                    return strInput.indexOf(word) > -1;
                });
                return bResultEvery;
            } else if(type === 'some') {
                let bResultSome = arrayTerms.some(function(word) {
                    return strInput.indexOf(word) > -1;
                });
                return bResultSome;
            }

        } else {
            return true; // we return true if the arrayTerms given is not an array
        }
    }
}
