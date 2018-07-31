/*******************************************************************************
 * ---------------------------
 * Log Script für ioBroker zum Aufbereiten des Logs für Visualisierungen (vis)
 * ---------------------------
 *
 * Das Script liest regelmäßig (einstellbar, z.B. alle 2 Minuten) die tägliche
 * Log-Datei des ioBrokers aus und setzt das Ergebnis in Datenpunkte, aufgeteilt
 * je nach Einstellung unten.
 * Neue Log-Einträge werden in den Datenpunkten regelmäßig ergänzt.
 * Es stehen auch JSON-Datenpunkte zur Verfügung, mit diesen kann im vis eine
 * Tabelle ausgegeben werden (z.B. über das Widget 'basic - Tabelle')-
 *
 * Aktuelle Version:    https://github.com/Mic-M/iobroker.logfile-script
 * Support:             https://forum.iobroker.net/viewtopic.php?f=21&t=15514
 *
 * Change Log:
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
 *
 * To Do:
 *  - Wenn z.B. Schedule auf alle 2 Minuten, dann fehlt das Log zwischen
 *    23:58 und 0:00, da ab 0:00 Uhr ein neues Logfile auf dem Server erstellt
 *    wird. Ab 0:00 + x Minuten (lt. Schedule) + Puffer ist also auch noch das
 *    Logfile vom Vortag mit auszulesen.
 *  - Log-Datum wird derzeit im Format "2018-07-22 12:45:02.769" erwartet. 
 *    Müsste das für andere Datumsformate anpassen. Umsetzung noch zu überlegen.
 *    Ggf. ist die Syntax des Datums über Linux-Rechner verfügbar. Oder über
 *    Konfiguration lösen. 
 *******************************************************************************/

/*******************************************************************************
 * Konfiguration: Pfade
 ******************************************************************************/
// Pfad, unter dem die States in den Objekten angelegt werden.
const L_STATE_PATH = 'javascript.'+ instance + '.' + 'mylog';

// Pfad zu dem Log-Verzeichnis auf dem Linux-Rechner.
// Der Standard-Pfad auf Raspberry: '/opt/iobroker/log/'.
const L_LOG_PATH = '/opt/iobroker/log/';

// Leer lassen! Nur setzen, falls ein eigener Filename für das Logfile verwendet wird
const L_LOG_FILENAME = '';

/*******************************************************************************
 * Konfiguration: Alle Logeinträge - Global
 ******************************************************************************/
// Zahl: Maximale Anzahl der letzten Logeinträge in den Datenpunkten. Alle älteren werden entfernt.
// Bitte nicht allzu viele behalten, denn das kostet Performance.
const L_NO_OF_ENTRIES = 100;

// Sortierung der Logeinträge: D für descending (absteigend, also neuester oben), oder A für ascending (aufsteigend, also ältester oben)
// Empfohlen ist "D", damit neueste Einträge immer oben stehen.
const L_SORT_ORDER = 'D';

// Wie oft sollen die Log-Datenpunkte aktualisiert werden? Benutze den "Cron"-Button oben rechts für komfortable Einstellung
// Bitte nicht jede Sekunde laufen lassen, alle paar Minuten sollte locker reichen.
const L_SCHEDULE  = "*/2 * * * *"; // alle 2 Minuten

// Blacklist - falls einer dieser Begriffe enthalten ist, dann wird der Log-Eintrag
// nicht aufgenommen. Praktisch, um penetrante Logeinträge zu eliminieren.
// Mindestens 3 Zeichen erforderlich, sonst wird es nicht berücksichtigt.
// Datenpunkt-Inhalte bei Änderung ggf. vorher löschen, diese werden nicht nachträglich gefiltert.
const L_BLACKLIST_GLOBAL = ['<==Disconnect system.user.admin from ::ffff:', '', '', ''];

// Entferne zusätzliche Leerzeichen, Tab-Stops, Zeilenumbrüche
// Wird empfohlen. Falls nicht gewünscht, auf false setzen.
const L_CLEAN_LOG = true;

/*******************************************************************************
 * Konfiguration: JSON-Log (für Ausgabe z.B. im vis)
 ******************************************************************************/
// Datumsformat für JSON Log. Z.B. volles z.B. Datum mit 'yyyy-mm-dd HH:MM:SS' oder nur Uhrzeit mit "HH:MM:SS". Die Platzhalter yyyy, mm, dd usw.
// werden jeweils ersetzt. yyyy = Jahr, mm = Monat, dd = Tag, HH = Stunde, MM = Minute, SS = Sekunde. Auf Groß- und Kleinschreibung achten!
// Die Verbinder (-, :, Leerzeichen, etc.) können im Prinzip frei gewählt werden.
// Beispiele: 'HH:MM:SS' für 19:37:25, 'HH:MM' für 19:37, 'mm.dd HH:MM' für '25.07. 19:37'
const L_DATE_FORMAT = 'HH:MM:SS';

// Max. Anzahl Zeichen der Log-Meldung im JSON Log.
const L_LEN = 100;

// Zahl: Maximale Anzahl der letzten Logeinträge in den Datenpunkten. Alle älteren werden entfernt.
// Speziell für das JSON-Log zur Visualisierung, hier brauchen wir ggf. weniger als für L_NO_OF_ENTRIES gesamt.
const L_NO_OF_ENTRIES_JSON = 60;

// Füge CSS-Klasse hinzu je nach Log-Level (error, warn, info, etc.), um Tabellen-Text zu formatieren.
// Beispiel für Info: ersetzt "xxx" durch "<span class='log-info'>xxx</span>""
// Analog für error: log-error, warn: log-warn, etc.
// Beim Widget "basic - Table" im vis können im Reiter "CSS" z.B. folgende Zeilen hinzugefügt werden,
// um Warnungen in oranger und Fehler in roter Farbe anzuzeigen.
// .log-warn { color: orange; }
// .log-error { color: red; }
const L_APPLY_CSS = true;

// L_APPLY_CSS wird nur für die Spalte "level" (also error, info) angewendet, aber nicht für die 
// restlichen Spalten wie Datum, Log-Eintrag, etc.
// Falls alle Zeilen formatiert werden sollen: auf false setzen.
const L_APPLY_CSS_LIMITED_TO_LEVEL = true;


/*******************************************************************************
 * Konfiguration: Datenpunkte und Filter
 ******************************************************************************/
// Dies ist das Herzstück dieses Scripts: hier werden die Datenpunkte
// konfiguriert, die erstellt werden sollen. Hierbei können wir entsprechend
// Filter setzen, also Wörter/Begriffe, die in Logeinträgen enthalten sein
// sollen und in den Datenpunkten aufgenommen werden.
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
// filter_all, filter_any und blacklist werden gleichzeitig ausgeführt.
// Bei den Filtern bitte beachten: Datenpunkt-Inhalte bei Änderung ggf. vorher
// löschen, diese werden nicht nachträglich gefiltert.
//
// Die Filter-Einträge können natürlich beliebig geändert und erweitert werden, 
// bitte aber den Aufbau beibehalten.
//
const L_FILTER = [
  {
    id:          'all',    // wir wollen hier alle Logeinträge, keine Filterung
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
  {
    id:          'warnanderror',
    filter_all:  ['', ''],
    filter_any:  [' - error: ', ' - warn: '],
    blacklist:   ['javascript.0 ^', 'no playback content', ''],
    clean:       ['', '', ''],
    columns:     ['date','level','source','msg'],
  },
  // Beispiel für individuellen Eintrag. Hier wird Euer Hubschrauber-Landeplatz
  // überwacht :-) Wir wollen nur Einträge vom Adapter 'hubschr.0'.
  // Dabei sollen entweder Wetterwarnungen, Alarme, oder UFOs gemeldet werden.
  // Alles unter Windstärke "5 Bft" interessiert uns dabei nicht, daher haben
  // wir '0 Bft' bis '4 Bft' auf die Blackliste gesetzt.
  // Außerdem entfernen wir von der Log-Zeile die Zeichenfolgen '****', '!!!!' 
  // und 'ufo gesichtet', der Rest bleibt aber bestehen.
  // Zudem haben wir unter columns die Spaltenreihenfolge geändert. 'level'
  // herausgenommen, und Quelle ganz vorne.
  {
    id:          'hubschrauberlandeplatz',
    filter_all:  ['hubschr.0'],
    filter_any:  ['wetterwarnung', 'alarm', 'ufo'],
    blacklist:   ['0 Bft', '1 Bft', '2 Bft', '3 Bft', '4 Bft'],
    clean:       ['****', '!!!!', 'ufo gesichtet'],
    columns:     ['level','date','msg'],
  }, 

];



/*******************************************************************************
 * Konfiguration: Konsolen-Ausgaben
 ******************************************************************************/
// Auf true setzen, wenn zur Fehlersuche einige Meldungen ausgegeben werden sollen.
// Ansonsten bitte auf false stellen.
const LOG_DEBUG = false;

// Auf true setzen, wenn ein paar Infos im Log ausgegeben werden dürfen, bei false bleiben die Infos weg.
const LOG_INFO = false;

/*******************************************************************************
 * Experten-Konfiguration
 ******************************************************************************/
// Regex für die Aufteilung des Logs in 1-Datum/Zeit, 3-Level, 5-Quelle und 7-Logtext.
// Ggf. anzupassen bei anderem Datumsformat im Log. Wir erwarten ein Format
// wie '2018-07-22 12:45:02.769  - info: javascript.0 Stop script script.js.ScriptAbc'
const REGEX_LOG = /([0-9_.\-:\s]*)(\s+\- )(silly|debug|info|warn|error|)(: )([a-z0-9.\-]*)(\s)(.*)/g;

// Debug: Falls auf true, dann werden die Datenpunkte nicht ausgelesen, sondern von 
// der Log-Datei immer neu gesetzt.
const DEBUG_IGNORE_STATES = false;


/*******************************************************************************
 * Ab hier nichts mehr ändern / Stop editing here!
 ******************************************************************************/

/**
 * Executed on every script start. Also sets the schedule.
 */
init();
function init() {
 
    // Create states
    L_createStates();

    // Now we call the main update function. This is redundant since we set a schedule further below,
    // however it is useful if we change something in the script and save it, so that we see the changes
    // after 5 seconds and not after the time the schedule is set.
    // We use setTimeout() to execute 5s later and avoid error message on initial start if states not yet created.
    setTimeout(function() { L_UpdateLog(); }, 5000);

    // Schedule script accordingly.
    // We execute 30 seconds later since we called the function right before.
    setTimeout(function() {
        schedule(L_SCHEDULE, function () {  // apply schedule
           L_UpdateLog();
        });
    }, 30000);

    // Set current date to state if button is pressed
    for (var i = 0; i < L_FILTER.length; i++) {
        var strIDCleanFinal = L_STATE_PATH + '.' + 'log' + prepStateNameInclCapitalizeFirst(L_FILTER[i].id) + 'JSONclear';
        on({id: strIDCleanFinal, change: "any", val: true}, function(obj) {
            var currentDate = new Date();
            setState(obj.id + 'DateTime', currentDate.toString());
        }); // warning on the left can be ignored, we need a function here...
    }

}

/**
 * Main function. Process content of today's logfile (e.g. /opt/iobroker/log/iobroker.2018-07-19.log)
 */
function L_UpdateLog() {

    if (DEBUG_IGNORE_STATES) L_Log2('DEBUG_IGNORE_STATES is set to true!', "warn");

    // Path and filename to log file
    var strLogPathFinal = L_LOG_PATH;
    if (strLogPathFinal.slice(-1) !== '/') strLogPathFinal = strLogPathFinal + '/';
    var strFullLogPath = strLogPathFinal + L_LOG_FILENAME;
    if (L_LOG_FILENAME === '') strFullLogPath = strLogPathFinal + 'iobroker.' + L_GetCurrentISODate() + '.log';
    if (LOG_DEBUG) L_Log('Path and Filename: ' + '>' + strFullLogPath + '<');

    // Reads the log file entry, result will be string in variable "data"
    var fs = require('fs');
    fs.readFile(strFullLogPath, 'utf8', function (err,data) {
        if (err) {
            return L_Log2(err, 'error');
        }

        // get log entries into array, these are separated by new line in the file...
        var logArray = data.split(/\r?\n/);

        // We process each log entry line

        // We add one element per each filter to the Array ('all', 'error', etc.)
        var logArrayProcessed = [];
        for (var j = 0; j < L_FILTER.length; j++) {
            logArrayProcessed[L_FILTER[j].id] = '';
        }
        for (var i = 0; i < logArray.length; i++) {
            var loopElement = logArray[i];

            // Clean up
            loopElement = loopElement.replace(/\u001b\[.*?m/g, ''); // Remove color escapes - https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
            if (loopElement.substr(0,9) === 'undefined') loopElement = loopElement.substr(9,99999); // sometimes, a log line starts with the term "undefined", so we remove it.
            if (L_CLEAN_LOG) loopElement = loopElement.replace(/\s\s+/g, ' '); // Remove white space, tab stops, new line

            // Check against global blacklist
            if(L_StringContainsTerms(loopElement, L_BLACKLIST_GLOBAL, 'blacklist')) loopElement = '';

            /////////////////
            // Split log levels.
            ////////////////
            // We apply regex here. This will also eliminate all log lines without proper info
            // like date/time, log level, and entry.
            var arrSplitLogLine = L_SplitLogLine(loopElement, REGEX_LOG);
            if (arrSplitLogLine !== false) {

                /////////////////
                // We apply our filters.
                /////////////////
                if (L_IsValueEmptyNullUndefined(L_FILTER) === false) {
                    
                    // Now let's iterate again over the filter array elements
                    // We check if both the "all" and "any" filters  apply. If yes, - and blacklist false - we add the log line.
                    for (var k = 0; k < L_FILTER.length; k++) {
                        if ( (L_StringContainsTerms(loopElement, L_FILTER[k].filter_all, 'every') === true)
                            && (L_StringContainsTerms(loopElement, L_FILTER[k].filter_any, 'some') === true)
                            && (L_StringContainsTerms(loopElement, L_FILTER[k].blacklist, 'blacklist') === false)
                            ){
                                logArrayProcessed[L_FILTER[k].id] = logArrayProcessed[L_FILTER[k].id] + loopElement + "\n";
                        }
                        // Now we remove terms if desired
                        if (L_IsValueEmptyNullUndefined(L_FILTER[k].clean) === false) {
                            for (var lpTerm of L_FILTER[k].clean) {
                                if (lpTerm !== '') {
                                    logArrayProcessed[L_FILTER[k].id] = logArrayProcessed[L_FILTER[k].id].replace(lpTerm, '');
                                }
                            }
                        }
                    }
                } // if
            } // if

        } // for loop

        // Process further
        L_processLogAndSetToState(logArrayProcessed);

        if (LOG_INFO) L_Log('Log-Datenpunkte aktualisiert');


    }); //  fs.readFile

}



/**
 * Further processes the log array
 */
function L_processLogAndSetToState(arrayLogInput) {

    // Build log levels array and add filters (like 'all', 'alerts', etc.)
    var arrayFilterIds = [];
    for (var i = 0; i < L_FILTER.length; i++) {
        arrayFilterIds.push(L_FILTER[i].id); // each filter id into array
    }

    // Loop through the log filter ids

    for (var k = 0; k < arrayFilterIds.length; k++) {

        // Log filter id(all, error, etc.) = arrayFilterIds[k]
        // Content of Log Level = arrayLogInput[arrayFilterIds[k]]
        var strLoopLogContent = arrayLogInput[arrayFilterIds[k]];

        // Get full path to state
        var strStateFullPath = L_STATE_PATH + '.' + 'log' + prepStateNameInclCapitalizeFirst(arrayFilterIds[k]);

        // Get state contents of loop filter id and append it
        var strStateLogContent = getState(strStateFullPath).val;
        if (!DEBUG_IGNORE_STATES) {
            if (L_IsValueEmptyNullUndefined(strStateLogContent) === false) {
                strLoopLogContent = strLoopLogContent + strStateLogContent; // "\n" not needed, always added above
            }
        }

        if (L_IsValueEmptyNullUndefined(strLoopLogContent) === false) {
            // Convert to array for easier handling
            var myArray = strLoopLogContent.split(/\r?\n/);

            // Remove duplicates
            myArray = L_arrayRemoveDuplicates(myArray);

            // Remove empty values
            myArray = L_cleanArray(myArray);

            // Sort array descending
            myArray = L_SortLogByDate(myArray, 'desc');

            // Separate ID for JSON
            var myArrayJSON = myArray;
            
            // This is to clear the log
            // Let's remove elements if current date in state "logXXXJSONclearDateTime" is greater than log date.
            var strDateFromState = getState(strStateFullPath + 'JSONclearDateTime').val;
            if (L_IsValueEmptyNullUndefined(strDateFromState) === false) {
                if (strDateFromState !== 0) { // we set it to 0 via vis widget if we want to clear the state
                    myArrayJSON = L_clearArrayByDate(myArrayJSON, strDateFromState);              
                }
            }
            
            // Just keep the first x elements of the array
            myArray = myArray.slice(0, L_NO_OF_ENTRIES);
            myArrayJSON = myArrayJSON.slice(0, L_NO_OF_ENTRIES_JSON);

            // Sort ascending if desired
            if (L_SORT_ORDER === 'A') {
                myArray = myArray.reverse();
                myArrayJSON = myArrayJSON.reverse();
            }

            // ** Finally set the states

            ///////////////////////////////
            // -1- Full Log, String, separated by "\n"
            ///////////////////////////////
            var strResult = myArray.join("\n");
            setState(strStateFullPath, strResult);

            ///////////////////////////////
            // -2- JSON, with elements date and msg
            ///////////////////////////////
      
            // Let's put together the JSON
            var jsonArr = [];
            for (var j = 0; j < myArrayJSON.length; j++) {
                // +++
                // We apply regex here to get 4 elements in array: datetime, level, source, message
                // +++
                var arrSplitLogLine = L_SplitLogLine(myArrayJSON[j], REGEX_LOG);
                if (arrSplitLogLine !== false) {
                    var strLogMsg = arrSplitLogLine.message;
                    // Reduce the length for each log message per configuration
                    strLogMsg = strLogMsg.substr(0, L_LEN);
                    // ++++++
                    // Build the final Array
                    // ++++++
                    // We need this section to generate the JSON with the columns (which ones, and order) as specified in L_FILTER

                    var objectJSONentry = {}; // object (https://stackoverflow.com/a/13488998)
                    if (L_IsValueEmptyNullUndefined(L_FILTER[k].columns)) L_Log2('Columns not specified in L_FILTER', 'error');
                    // Prepare CSS
                    if (L_APPLY_CSS) {
                        var strCSS1 = "<span class='log-" + arrSplitLogLine.level + "'>";
                        var strCSS2 = '</span>';
                        var strCSS1_level = strCSS1;
                        var strCSS2_level = strCSS1;
                        if (L_APPLY_CSS_LIMITED_TO_LEVEL) {
                            strCSS1 = '';
                            strCSS2 = '';
                        }
                    }

                    for (var lpCol of L_FILTER[k].columns) {
                        switch (lpCol) {
                            case 'date' :
                                objectJSONentry.date = strCSS1 + L_ReformatLogDate(arrSplitLogLine.datetime, L_DATE_FORMAT) + strCSS2;
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
            if (L_IsValueEmptyNullUndefined(myArrayJSON) === false) {
                setState(strStateFullPath + 'JSON', JSON.stringify(jsonArr));
                setState(strStateFullPath + 'JSONcount', myArrayJSON.length);
            } else {
                // Is empty here if for example L_clearArrayByDate had no hits
                setState(strStateFullPath + 'JSON', '');
                setState(strStateFullPath + 'JSONcount', 0);                
            }
        } else {
            // No log available, so we clean it.
            setState(strStateFullPath, '');
            setState(strStateFullPath + 'JSON', '');
            setState(strStateFullPath + 'JSONcount', 0);
        }
    }
}

/**
 * Clear array: if strDate is greater or equal than log date, we remove the entire log entry
 */
function L_clearArrayByDate(inputArray, strDate) {
    var dtState = new Date(strDate); // the date provided from the state

    var newArray = [];
    for (var lpLog of inputArray) {
        var dtLog = new Date(lpLog.substr(0,23));
        if (dtLog >= dtState) {
            newArray.push(lpLog);            
        }

  }
  return newArray;
}



/**
 * Checks if the string provided contains either every or some terms.
 * @param {string} strInput - The string on which we run this search
 * @param {array} arrayTerms - The terms we are searching, e.g. ["hue", "error", "raspberry"]
 * @param {string} type - 'every': all terms must match to be true,
 *                        'some': at least one term (or more) must match
 *                        'blacklist': different here: function will always
 *                         return FALSE, but if one of the arrayTerms contains
 *                         minimum 3 chars and is found in provided string,
 *                         we return TRUE (= blacklisted item found).
 * @return true, if it contains ALL words, false if not all words (or none)
 *         Also, will return true if arrayTerms is not array or an empty array
 * @source https://stackoverflow.com/questions/36283767/javascript-select-the-string-if-it-matches-multiple-words-in-array
 */
function L_StringContainsTerms(strInput, arrayTerms, type) {
    if(type === 'blacklist') {
        if (Array.isArray(arrayTerms)) {
            var arrayTermsNew = [];
            for (var lpTerm of arrayTerms) {
                if (lpTerm.length >= 3) {
                    arrayTermsNew.push(lpTerm);
                }
            }
            if(L_IsValueEmptyNullUndefined(arrayTermsNew) === false) {
                var bResultBL = arrayTermsNew.some(function(word) {
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
                var bResultEvery = arrayTerms.every(function(word) {
                    return strInput.indexOf(word) > -1;
                });
                return bResultEvery;
            } else if(type === 'some') {
                var bResultSome = arrayTerms.some(function(word) {
                    return strInput.indexOf(word) > -1;
                });
                return bResultSome;
            }

        } else {
            return true; // we return true if the arrayTerms given is not an array
        }
    }
}


/**
 * Splits a given log line into an array with 4 elements.
 * @param {string} strLog   Log line like '2018-07-22 11:47:53.019  - info: javascript.0 script.js ...'
 * @param {string} strRegex RegEx
 * @param {boolean} validity check: true for yes, false for no
 * @return: Array with 4 elements: datetime (e.g. 2018-07-22 11:47:53.019),
 *          level (e.g. info), source (e.g. javascript.0)
 *          and message (e.g. script.js....)
 *          Returns FALSE if no match
 */
function L_SplitLogLine(strLog, strRegex) {

    // At first we split into array
    var returnArray = [];
    var m;
    do {
        m = strRegex.exec(strLog);
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




/**
 * Create all States we need at this time.
 */
function L_createStates() {

    var statesArray = [];
    if (L_IsValueEmptyNullUndefined(L_FILTER) === false) {
        for(var i = 0; i < L_FILTER.length; i++) {
            if (L_FILTER[i].id !== '') {
                var strIDClean = prepStateNameInclCapitalizeFirst(L_FILTER[i].id);
                if (LOG_DEBUG) L_Log('clean ID: ' + '>' + strIDClean + '<');
                statesArray.push({ id:'log' + strIDClean, name:'Filtered Log - ' + strIDClean, type:"string", role: "log", def: ""});
                statesArray.push({ id:'log' + strIDClean + 'JSON', name:'Filtered Log - ' + strIDClean + ' - JSON', type:"string", role: "log", def: ""});
                statesArray.push({ id:'log' + strIDClean + 'JSONcount', name:'Filtered Log - Count of JSON ' + strIDClean, role: "log", type:"number", def: 0});
                statesArray.push({ id:'log' + strIDClean + 'JSONclear', name:'Clear JSON log ' + strIDClean, role: "button", type:"boolean", def: false});
                statesArray.push({ id:'log' + strIDClean + 'JSONclearDateTime', name:'Clear JSON log - Date/Time ' + strIDClean, role: "log", type:"string", def: ''});
            }
        }
    }

    for (var s=0; s < statesArray.length; s++) {
        createState(L_STATE_PATH + '.' + statesArray[s].id, {
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
 * Will just keep lower case letters, numbers, '-' and '_' and removes the rest
 * Also, capitalize first Letter.
 */
function prepStateNameInclCapitalizeFirst(stringInput) {
    var strProcess = stringInput;
    strProcess = strProcess.replace(/([^a-z0-9_\-]+)/gi, '');
    strProcess = strProcess.toLowerCase();
    strProcess = strProcess.charAt(0).toUpperCase() + strProcess.slice(1);
    return strProcess;

}

/**
 * Clean Array: Will remove all falsy values: undefined, null, 0, false, NaN and "" (empty string)
 * @source - https://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
 *
 */
function L_cleanArray(inputArray) {
  var newArray = [];
  for (var i = 0; i < inputArray.length; i++) {
    if (inputArray[i]) {
      newArray.push(inputArray[i]);
    }
  }
  return newArray;
}


/**
 * Remove Duplicates from Array
 * @source - https://stackoverflow.com/questions/23237704/nodejs-how-to-remove-duplicates-from-array
 */
function L_arrayRemoveDuplicates(inputArray) {
    var uniqueArray;
    uniqueArray = inputArray.filter(function(elem, pos) {
        return inputArray.indexOf(elem) == pos;
    });
    return uniqueArray;
}


/**
 * Sorts the log array by date. We expect the first 23 chars of each element being a date in string format.
 * @param {array}   arrayInput
 * @param {string}  order        asc or desc for ascending or descending order
 */
function L_SortLogByDate(arrayInput, order) {
    var result = arrayInput.sort(function(a,b){
            // Turn your strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            a = new Date(a.substr(0,23));
            b = new Date(b.substr(0,23));
            if (order === "asc") {
                return a - b;
            } else {
                return b - a;
            }

    });

    return result;
}



/**
 * Returns the current date in ISO format "YYYY-MM-DD".
 * @return  {string}    Date in ISO format
 */
function L_GetCurrentISODate() {
    var currDate = new Date();
    return currDate.getFullYear() + '-' + L_ZeroPad((currDate.getMonth() + 1), 2) + '-' + L_ZeroPad(currDate.getDate(), 2);
}


/**
 * Fügt Vornullen zu einer Zahl hinzu, macht also z.B. aus 7 eine "007".
 * zeroPad(5, 4);    // wird "0005"
 * zeroPad('5', 6);  // wird "000005"
 * zeroPad(1234, 2); // wird "1234"
 * @param  {string|number}  num     Zahl, die Vornull(en) bekommen soll
 * @param  {number}         places  Anzahl Stellen.
 * @return {string}         Zahl mit Vornullen wie gewünscht.
 */
function L_ZeroPad(num, places) {
    if (L_IsNumber(num)) {
        // isNumber will also be true for a string which is actually a number, like '123'.
        var zero = places - num.toString().length + 1;
        return Array(+(zero > 0 && zero)).join("0") + num;
    } else {
        // No number provided, so we through an eror
        L_Log2('Function [' + arguments.callee.toString().match(/function ([^\(]+)/)[1] + '] - no number/string provided', 'error');
    }

}


/**
 * Reformats a log date string accordingly
 * @param {date}    strDate   The date to convert
 * @param {string}  format      e.g. 'yyyy-mm-dd HH:MM:SS'.
 *
 */
function L_ReformatLogDate(strDate, format) {

    var strResult = format;
    strResult = strResult.replace('yyyy', strDate.substr(0,4));
    strResult = strResult.replace('mm', strDate.substr(5,2));
    strResult = strResult.replace('dd', strDate.substr(8,2));
    strResult = strResult.replace('HH', strDate.substr(11,2));
    strResult = strResult.replace('MM', strDate.substr(14,2));
    strResult = strResult.replace('SS', strDate.substr(17,2));

    return strResult;

}



/**
 * Prüft ob Variableninhalt eine Zahl ist.
 * @param {any} Variable, die zu prüfen ist auf Zahl
 * @return true falls Zahl, false falls nicht.
 * isNumber ('123'); // true
 * isNumber ('123abc'); // false
 * isNumber (5); // true
 * isNumber ('q345'); // false
 * isNumber(null); // false
 * isNumber(undefined); // false
 * isNumber(false); // false
 * isNumber('   '); // false
 * @source https://stackoverflow.com/questions/1303646/check-whether-variable-is-number-or-string-in-javascript
 */
function L_IsNumber(n) {
    return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}


/**
 * Checks if Array or String is not undefined, null or empty.
 * @param inputVar - Input Array or String, Number, etc.
 * @return true if it is undefined/null/empty, false if it contains value(s)
 * Array or String containing just whitespaces or >'< or >"< is considered empty
 */
function L_IsValueEmptyNullUndefined(inputVar) {
    if (typeof inputVar !== 'undefined' && inputVar !== null) {
        var strTemp = JSON.stringify(inputVar);
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
 * Logs a message
 * @param string strMessage - die Message
 * @param string strType - don't add if [info], use "warn" for [warn] and "error" for [error]
 */
function L_Log(strMessage) {
    L_Log2(strMessage, 'info');
}
function L_Log2(strMessage, strType) {
    var strMsgFinal = '[L] ' + strMessage + '';
    if (strType === "error") {
        log(strMsgFinal, "error");
    } else if (strType === "warn") {
        log(strMsgFinal, "warn");
    } else {
        log(strMsgFinal, "info");
    }
}
