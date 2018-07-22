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
 * Aktuelle Version unter: https://github.com/Mic-M/iobroker.logfile-script
 *
 * Siehe auch: https://forum.iobroker.net/viewtopic.php?f=21&t=15514
 *
 * Change Log:
 *  0.3  Mic - Added filtering, blacklist, and several fixes
 *  0.2  Mic - Bug fix: corrected wrong function name
 *  0.1  Mic - Initial release
 *
 * To Do:
 *  - Wenn z.B. Schedule auf alle 2 Minuten, dann fehlt das Log zwischen
 *    23:58 und 0:00, da ab 0:00 Uhr ein neues Logfile auf dem Server erstellt
 *    wird. Ab 0:00 + x Minuten (lt. Schedule) + Puffer ist also auch noch das
 *    Logfile vom Vortag mit auszulesen.
 *  - Globales ausfiltern, also komplette Entfernung unerwünschter Log-Einträge
 *    über alle States hinweg.
 *******************************************************************************/

/*******************************************************************************
 * Konfiguration: Pfade
 ******************************************************************************/
// Pfad, unter dem die States in den Objekten angelegt werden.
const L_STATE_PATH = 'javascript.'+ instance + '.' + 'mylog';

// Pfad zu dem Log-Verzeichnis auf dem Linux-Rechner.
// Der Standard-Pfad ist '/opt/iobroker/log/'.
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
const L_BLACKLIST_GLOBAL = ['', '', '', ''];

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


/*******************************************************************************
 * Konfiguration: Datenpunkte und Filter
 ******************************************************************************/
// Dies ist das Herzstück dieses Scripts: hier werden die Datenpunkte
// konfiguriert, die erstellt werden sollen. Hierbei können wir entsprechend
// Filter setzen, also Wörter/Begriffe, die in Logeinträgen enthalten sein
// sollen und in den Datenpunkten aufgenommen werden.
//
// id:          Hier Begriff ohne Leerzeichen, z.B. "error", "sonoff", etc.
//             Die ID wird dann Teil der ID der Datenpunkte.
// filter_all: ALLE Begriffe müssen in der Logzeile enthalten sein. Ist einer
//             der Begriffe nicht enthalten, dann wird der komplette Logeintrag
//             auch nicht übernommen.
//             Leeres Array eingeben [] falls hier filtern nicht gewünscht.
// filter_any: Mindestens einer der gelisteten Begriffe muss enthalten sein.
//             Leeres Array eingeben [] falls hier filtern nicht gewünscht.
// blacklist: Wenn einer dieser Begriffe im Logeintrag enthalten ist,
//                   so wird der komplette Logeintrag nicht übernommen, egal was
//                   vorher in filter_all oder filter_any definiert ist.
//                   Mindestens 3 Zeichen erforderlich, sonst wird es nicht
//                   berücksichtigt.
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
  },
  {
    id:          'debug',
    filter_all:  [' - debug: '], // nur Logeinträge mit Level 'debug'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
  },
  {
    id:          'info',
    filter_all:  [' - info: '],  // nur Logeinträge mit Level 'info'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
  },
  {
    id:          'warn',
    filter_all:  [' - warn: '],  // nur Logeinträge mit Level 'warn'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
  },
  {
    id:          'error',
    filter_all:  [' - error: '],  // nur Logeinträge mit Level 'error'
    filter_any:  ['', ''],
    blacklist:   ['', ''],
  },
  {
    id:          'warnanderror',
    filter_all:  ['', ''],
    filter_any:  [' - error: ', ' - warn: '],
    blacklist:   ['javascript.0 ^', 'no playback content', ''],
  },
  // Beispiel für individuellen Eintrag. Hier wird Euer Hubschrauber-Landeplatz
  // überwacht :-) Wir wollen nur Einträge vom Adapter 'hubschr.0'.
  // Dabei sollen entweder Wetterwarnungen, Alarme, oder UFOs gemeldet werden.
  // Alles unter Windstärke "5 Bft" interessiert uns dabei nicht, daher haben
  // wir '0 Bft' bis '4 Bft' auf die Blackliste gesetzt.
  {
    id:          'hubschrauberlandeplatz',
    filter_all:  ['hubschr.0'],
    filter_any:  ['wetterwarnung', 'alarm', 'ufo'],
    blacklist:   ['0 Bft', '1 Bft', '2 Bft', '3 Bft', '4 Bft'],
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

// Der folgende Kommentar "jshint maxerr:1000" wird verwendet wegen
// "too many errors (XX% scanned)".
// Bitte gegebenenfalls löschen...
/* jshint maxerr:1000 */


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

    // Schedule script accordingly
    // We use setTimeout() to execute 5s later and avoid error message on initial start if states not yet created.

    setTimeout(function() {
        schedule(L_SCHEDULE, function () {
            L_UpdateLog();
        });
    }, 5000);
}

/**
 * Main function. Process content of today's logfile (e.g. /opt/iobroker/log/iobroker.2018-07-19.log)
 */
function L_UpdateLog() {

    // Path and filename to log file
    var strLogPathFinal = L_LOG_PATH;
    if (strLogPathFinal.slice(-1) !== '/') strLogPathFinal = strLogPathFinal + '/';
    var strFullLogPath = strLogPathFinal + L_LOG_FILENAME;
    if (L_LOG_FILENAME === '') strFullLogPath = strLogPathFinal + 'iobroker.' + L_GetCurrentISODate() + '.log';
    if (LOG_DEBUG) L_Log('Path and Filename: ' + '>' + strFullLogPath + '<');

    // Reads the log file entry, result will be string in variable "data"
    fs = require('fs');
    fs.readFile(strFullLogPath, 'utf8', function (err,data) {
        if (err) {
            return L_Log(err, 'error');
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
            if (L_IsValueEmptyNullUndefined(arrSplitLogLine) === false) {

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
        arrayFilterIds.push(L_FILTER[i].id);
    }

    // Loop through the log filter ids
    for (var lpFilterId of arrayFilterIds) {
        // Log filter id(all, error, etc.) = lpFilterId
        // Content of Log Level = arrayLogInput[lpFilterId]
        var strLoopLogContent = arrayLogInput[lpFilterId];

        // Get full path to state
        var strStateFullPath = L_STATE_PATH + '.' + 'log' + prepStateNameInclCapitalizeFirst(lpFilterId);

        // Get state contents of loop filter id and append it
        var strStateLogContent = getState(strStateFullPath).val;
        if (L_IsValueEmptyNullUndefined(strStateLogContent) === false) {
            strLoopLogContent = strLoopLogContent + strStateLogContent; // "\n" not needed, always added above
        }

        // Don't continue if no log entries
        if (L_IsValueEmptyNullUndefined(strLoopLogContent) === false) {
            // Convert to array for easier handling
            var myArray = strLoopLogContent.split(/\r?\n/);

            // Remove duplicates
            myArray = L_arrayRemoveDuplicates(myArray);

            // Remove empty values
            myArray = L_cleanArray(myArray);

            // Sort array descending
            myArray = L_SortLogByDate(myArray, 'desc');

            // Just keep the first x elements of the array
            myArray = myArray.slice(0, L_NO_OF_ENTRIES);
            var myArrayJSON = myArray.slice(0, L_NO_OF_ENTRIES_JSON);

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
            var jsonArr = [];
            for (var j = 0; j < myArrayJSON.length; j++) {
                // We aplly regex here to get 3 elements in array: datetime, level, message
                var arrSplitLogLine = L_SplitLogLine(myArrayJSON[j], REGEX_LOG);
                if (L_IsValueEmptyNullUndefined(arrSplitLogLine) === false) {
                    var strLogMsg = arrSplitLogLine.message;
                    // Reduce the length for each log message per configuration
                    strLogMsg = strLogMsg.substr(0, L_LEN);
                    // Build the final Array
                    jsonArr.push({
                        date: L_ReformatLogDate(arrSplitLogLine.datetime, L_DATE_FORMAT),
                        level: arrSplitLogLine.level,
                        source: arrSplitLogLine.source,
                        msg: strLogMsg,
                    });
                }

            }
            setState(strStateFullPath + 'JSON', JSON.stringify(jsonArr));
        }
    }
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
 * @return: Array with 4 elements: datetime (e.g. 2018-07-22 11:47:53.019),
 *          level (e.g. info), source (e.g. javascript.0)
 *          and message (e.g. script.js....)
 *          Returns an empty array if no match
 */
function L_SplitLogLine(strLog, strRegex) {

    var returnArray = [];

    var m;
    do {
        m = strRegex.exec(strLog);
        if (m) {
            returnArray.datetime = m[1];
            returnArray.level = m[3];
            returnArray.source = m[5];
            returnArray.message = m[7];
        } else {
            // No hits, we return empty array
        }
    } while (m);

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
                statesArray.push({ id:'log' + strIDClean, name:'Filtered Log - ' + strIDClean, type:"string"});
                statesArray.push({ id:'log' + strIDClean + 'JSON', name:'Filtered Log - ' + strIDClean + ' - JSON', type:"string"});
            }
        }
    }

    for (var s=0; s < statesArray.length; s++) {
        createState(L_STATE_PATH + '.' + statesArray[s].id, {
            "name": statesArray[s].name,
            "desc": statesArray[s].name,
            "type": statesArray[s].type,
            "def": '',
            "read": true,
            "write": true
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
        L_Log('Function [' + arguments.callee.toString().match(/function ([^\(]+)/)[1] + '] - no number/string provided', 'error');
    }

}


/**
 * Reformats a log date string accordingly
 * @param {date}    strDate   The date to convert
 * @param {string}  format      e.g. 'yyyy-mm-dd HH:MM:SS'.
 *
 */
function L_ReformatLogDate(strDate, format) {

    strResult = format;
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
function L_Log(strMessage, strType) {
    strMsgFinal = '[L] ' + strMessage + '';
    if (strType === "error") {
        log(strMsgFinal, "error");
    } else if (strType === "warn") {
        log(strMsgFinal, "warn");
    } else {
        log(strMsgFinal, "info");
    }
}

