/*************************************************************************************************************************
 * ---------------------------
 * Log Script für ioBroker zum Aufbereiten des Logs für Visualisierungen (vis), oder um
 * auf Log-Ereignisse zu reagieren.
 * ---------------------------
 *
 * Das Script nimmt jeden neuen Logeintrag des ioBrokers und wendet entsprechend gesetzte
 * Filter an, um den Eintrag dann in den entsprechenden Datenpunkten dieses Scripts abzulegen.
 
 * Es stehen auch JSON-Datenpunkte zur Verfügung, mit diesen kann im vis eine
 * Tabelle ausgegeben werden (z.B. über das Widget 'basic - Table' oder 'materialdesign - Table').
 *
 * Aktuelle Version: https://github.com/Mic-M/iobroker.logfile-script
 * Support:          https://forum.iobroker.net/topic/13971/vorlage-log-datei-aufbereiten-f%C3%BCr-vis-javascript
 * Autor:            Mic (ioBroker) | Mic-M (github)
 * -----------------------------------------------------------------------------------------------------------------------
 * VORAUSSETZUNGEN
 * 1.) Nur falls Datenpunkte unterhalb '0_userdata.0' abgelegt werden sollen:
 *     In der Instanz des JavaScript-Adapters die Option [Erlaube das Kommando "setObject"] aktivieren.
 *     Siehe auch: https://github.com/Mic-M/iobroker.createUserStates
 * 2.) Dieses Script benötigt die JavaScript-Adapter-Version 4.3.0 (2019-10-09) oder höher.
 *     Wer eine ältere Version einsetzt: Bitte Script-Version 2.0.2 verwenden.
 * =====================================================================================
 * -----------------------------------------------------------------------------------------------------------------------
 * Change Log:
 *  4.0.1 Mic   - Add "jsonDateFormat: 'dd.mm. hh:mm'," to FILTER_LOG, id 'all'.
 *  4.0 Mic     + To allow individual settings per each defined LOG_FILTER, the following global 
 *                settings were moved to LOG_FILTER:
 *                 * JSON_DATE_FORMAT                   -> jsonDateFormat
 *                 * JSON_LEN                           -> jsonLogLength
 *                 * JSON_NO_ENTRIES                    -> jsonMaxLines
 *                 * JSON_APPLY_CSS_LIMITED_TO_LEVEL    -> jsonCssToLevel
 *                 * L_SORT_ORDER_DESC                  -> sortDescending
 *              + Code improvements
 *              + Renamed LOG_NO_OF_ENTRIES to MAX_LOG_LINES
 *  ---------------------------------------------------------------------------------------------------- 
 *  3.4 Mic     + Support both '0_userdata.0' and 'javascript.x' for state creation
 *  3.3 Mic     - Fix state path
 *  3.2 Mic     + Create all states under 0_userdata.0, and no longer under javascript.<instance> (like javascript.0)
 *  3.1 Mic     + Change to stable as tests were successful
 *              + Add new option REMOVE_PID: The js-controller version 2.0+ adds the PID number inside brackets 
 *                to the beginning of the message. Setting REMOVE_PID = false will remove it.
 *  3.0Alpha Mic + Major Change: JavaScript adapter 4.3+ now provides onLog() function: 
 *                 https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#onlog 
 *                 We are using this new function to streamline this log script tremendously and to remove node-tail.
 *  ---------------------------------------------------------------------------------------------------- 
 *  2.0.2 Mic   + Changed certain functions to async to get rid of setTimout() and for the sake of better error handling.
 *              + startTailingProcess(): ensure the tailing starts if the file is present (wait to be created)
 *  2.0.1a Mic  Removed constant MERGE_LOGLINES_ACTIVE
 *  2.0.0a Mic  Major improvements and fixes:
 *              + Change from instant state update to schedule (STATE_UPDATE_SCHEDULE). The instant update, so once
 *                new log entries coming in, caused several issues (setting and getting state values (getState() and 
 *                setState()) within <1ms simply does not work.
 *              - Fix issue with merging log lines
 *              + Moved global option MERGE_LOGLINES_ACTIVE to LOG_FILTER, for allowing turning on/off for each filter id.
 *              + Several other code improvements
 *              Note: For upgrading from previous version: replace script entirely, re-enter all your options, 
 *                    and delete all existing states prior to first activation of this script.
 *  ---------------------------------------------------------------------------------------------------- 
 *  1.5.1 Mic - Set option MERGE_LOGLINES_ACTIVE to 'false' as default, as users reported issues. See 
 *              https://forum.iobroker.net/post/288772 . Also option MERGE_LOGLINES_ACTIVE being marked as "experimental"
 *              in the comments. Requires further investigation.
 *  1.5  Mic - Fix issue with option MERGE_LOGLINES_ACTIVE
 *  1.4  Mic + New option MERGE_LOGLINES_TXT for an individual (e.g. localized) string other than 'entries'.
             - Fix JSON span class closing
 *  1.3  Mic + New option MERGE_LOGLINES_ACTIVE: Merge Loglines with same log message to only one line and adds leading
 *             '[123 entries]' to log message.
 *  1.2  Mic - Fixed issue #6 (Button javascript.0.Log-Script.logXxxx.clearJSON not working reliably)
 *  1.1  Mic + 1. 1.0x script seems to work reliable per user feedback and my own test, so pushing into 1.1 stable.
 *           + New state '.logMostRecent': provides just the most recent log entry to work with "on /
 *             subscribe" on this state and trigger actions accordingly.
 *  1.02 alpha  Mic  - fix restarting at 0:00 (note: restarting is needed due to log file name change)
 *  1.01 alpha  Mic  - fix: creating new file system log file only if not yet existing
 *  1.00 alpha  Mic  + Entirely recoded to implement node-tail (https://github.com/lucagrulla/node-tail).
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
 ************************************************************************************************************************/

/*******************************************************************************
 * Konfiguration: Pfade
 ******************************************************************************/
// Pfad, unter dem die States (Datenpunkte) in den Objekten angelegt werden.
// Es wird die Anlage sowohl unterhalb '0_userdata.0' als auch 'javascript.x' unterstützt.
const LOG_STATE_PATH = '0_userdata.0.Log-Script';


// Pfad zum Log-Verzeichnis auf dem Server.
// Standard-Pfad unter Linux: '/opt/iobroker/log/'. Wenn das bei dir auch so ist, dann einfach belassen.
const LOG_FS_PATH = '/opt/iobroker/log/';

/*******************************************************************************
 * Konfiguration: Alle Logeinträge - Global
 ******************************************************************************/

// Zahl: Maximale Anzahl der letzten Logeinträge in den Datenpunkten. Alle älteren werden entfernt.
// Bitte nicht allzu viele behalten, denn das kostet Performance.
const MAX_LOG_LINES = 100;

// Der js-Controller Version 2.0 oder größer fügt Logs teils vorne die PID in Klammern hinzu, 
// also z.B. "(12234) Terminated (15): Without reason". 
// Mit dieser Option lassen sich die PIDs aus den Logzeilen entfernen.
const REMOVE_PID = true;

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
    '<==Disconnect system.user.admin from ::ffff:', // web.0 Adapter
    'system.adapter.ical.0 terminated with code 0 (OK)', 
    'bring.0 Cannot get translations: RequestError',
    ' reconnected. Old secret ', // Sonoff
    'Popup-News readed...', // info.0 Adapter
    '[warn] Projects disabled : set editorTheme.projects.enabled=true to enable', // see https://forum.iobroker.net/topic/12260/
	'',
	'',
];

/**
 * Zusatz-Einstellung für Option "merge" für LOG_FILTER (unter "Konfiguration: Datenpunkte und Filter"):
 * In MERGE_LOGLINES_TXT kann hier ein anderes Wort eingetragen werden, z.B. 'entries' oder 'Zeilen', damit [123 entries] 
 * oder [123 Zeilen] vorangestellt wird anstatt [123 Einträge].
 * HINWEIS: Falls MERGE_LOGLINES_TXT geändert wird: bitte alle Datenpunkte des Scripts löschen und dann Script neu starten.
 */
const MERGE_LOGLINES_TXT = 'Einträge';

/**
 *  Für JSON-Tabelle: Füge CSS-Klasse hinzu je nach Log-Level (debug, silly, info, warn und error), um Tabellen-Text zu formatieren.
 *  Beispiel für Log-Level "debug": ersetzt "xxx" durch "<span class='log-debug'>xxx</span>""
 *  Es wird jeweils "log-" vorangestellt, also: debug -> log-debug, silly -> log-silly, info -> log-info, etc.
 *  Etwa für Widget "basic - Table" im vis können im Reiter "CSS" z.B. folgende Zeilen hinzugefügt werden,
 *  um Warnungen in oranger und Fehler in roter Farbe anzuzeigen.
 *         .log-warn { color: orange; }
 *         .log-error { color: red; }
 *  Tipp: In LOG_FILTER kann dann bei den einzelnen Filtern mittels "jsonCssToLevel" eingestellt werden, dass das CSS
 *        nur  für die Spalte "level" (also debug, error, info) und nicht auf alle Spalten angewendet wird.
 */
const JSON_APPLY_CSS = true;


/*******************************************************************************
 * Konfiguration: Datenpunkte und Filter
 ******************************************************************************
 * Dies ist das Herzstück dieses Scripts: hier werden die Datenpunkte konfiguriert, die erstellt werden sollen. 
 * Hierbei kannst du entsprechend Filter setzen, also z.B. Wörter/Begriffe, die in Logeinträgen enthalten sein
 * müssen, damit sie in den jeweiligen Datenpunkten aufgenommen werden.
 * --------------------------------------------------------------------------------------------------------------------------
 * id:              Ein Begriff ohne Leerzeichen, z.B. "error", "sonoff", homematic, etc. Die ID wird dann Teil der
 *                  Datenpunkte, z.B. "javascript.0.Log-Script.logHomematic.log" mit automatisch vorangestelltem "log".
 * --------------------------------------------------------------------------------------------------------------------------
 * filter_all:      ALLE Begriffe müssen in der Logzeile enthalten sein. Ist einer der Begriffe nicht enthalten, dann wird der 
 *                  komplette Logeintrag auch nicht übernommen. Leeres Array [] eingeben, falls hier filtern nicht gewünscht.
 * --------------------------------------------------------------------------------------------------------------------------
 * filter_any:      Mindestens einer der gelisteten Begriffe muss enthalten sein. Leeres Array [] eingeben, falls hier filtern
 *                  nicht gewünscht.
 * --------------------------------------------------------------------------------------------------------------------------
 * blacklist:       Schwarze Liste: Wenn einer dieser Begriffe im Logeintrag enthalten ist, so wird der komplette Logeintrag 
 *                  nicht übernommen, egal was vorher in filter_all oder filter_any definiert ist.
 *                  Mindestens 3 Zeichen erforderlich, sonst wird es nicht berücksichtigt.
 *                  HINWEIS: BLACKLIST_GLOBAL wird vorher schon angewendet, hier kannst du einfach nur noch eine individuelle 
 *                  Blackliste pro id definieren.
 * --------------------------------------------------------------------------------------------------------------------------
 * clean:           Der Log-Eintrag wird um diese Zeichenfolgen bereinigt, d.h. diese werden entfernt, aber die restliche Zeile 
 *                  bleibt bestehen. Z.B. um unerwünschte Zeichenfolgen zu entfernen oder Log-Ausgaben zu kürzen.
 * --------------------------------------------------------------------------------------------------------------------------
 * merge:           Log-Einträge mit gleichem Text zusammenfassen. Beispiel:
 *                      -----------------------------------------------------------------------------------
 *                      2019-08-17 20:00:00.335 - info: javascript.0 script.js.Wetter: Wetterdaten abrufen.
 *                      2019-08-17 20:15:00.335 - info: javascript.0 script.js.Wetter: Wetterdaten abrufen.
 *                      2019-08-17 20:30:00.335 - info: javascript.0 script.js.Wetter: Wetterdaten abrufen.
 *                      -----------------------------------------------------------------------------------
 *                  Daraus wird dann nur noch eine Logzeile mit letztem Datum/Uhrzeit und hinzufügen von "[3 Einträge]":
 *                      -----------------------------------------------------------------------------------
 *                      2019-08-17 20:30:00.335 - info: javascript.0 [3 Einträge] script.js.Wetter: Wetterdaten abrufen.
 *                      -----------------------------------------------------------------------------------
 *                  Zum aktivieren: true eintragen, zum deaktivieren: false eintragen.
 * --------------------------------------------------------------------------------------------------------------------------
 * sortDescending:  Wenn true: Sortiert die Logeinträge absteigend, also neuester oben. 
 *                  Wenn false: Sortiert die Logeinträge aufsteigend, also ältester oben. 
 * --------------------------------------------------------------------------------------------------------------------------
 * jsonColumns:     Nur für JSON (für vis). 
 *                  Folgende Spalten gibt es: 'date','level','source','msg'. Hier können einzelne Spalten entfernt oder die 
 *                  Reihenfolge verändert werden. Bitte keine anderen Spalten eintragen, sondern nur 'date','level','source','msg'.
 * --------------------------------------------------------------------------------------------------------------------------
 * jsonDateFormat:  Datumsformat für JSON Log. Z.B. volles Datum mit 'YYYY-MM-DD HH:MM:SS' oder nur Uhrzeit mit "HH:MM:SS". Die 
 *                  Platzhalter YYYY, MM, DD usw. werden jeweils ersetzt.
 *                  YYYY = Jahr 4stellig (z.B. 2019), YY = Jahr 2stellig (z.B. 19), MM = Monat, DD = Tag, HH = Stunde, MM = Minute, 
 *                  SS = Sekunde. Groß- oder Kleinschreibung ist egal, d.h. YYYY ist das gleiche wie yy.
 *                  Die Verbinder (-, :, Leerzeichen, etc.) können im Prinzip frei gewählt werden.
 *                  Beispiele: 'HH:MM:SS' für 19:37:25, 'HH:MM' für 19:37, 'DD.MM. HH:MM' für '25.07. 19:37'
 * --------------------------------------------------------------------------------------------------------------------------
 * jsonLogLength:   Maximale Anzahl Zeichen jeder einzelnen Log-Meldung im JSON-Log. Alles was länger ist, wird abgeschnitten.
 * --------------------------------------------------------------------------------------------------------------------------
 * jsonMaxLines:    Maximale Anzahl der letzten Logeinträge im JSON-Log. Alle älteren werden entfernt.
 *                  Falls in MAX_LOG_LINES z.B. "100" gesetzt wird, wird hier bei 100 der Cut gemacht, selbst wenn in 
 *                  jsonMaxLines etwa 250 eingetragen wird. D.h. im Bedarf zuerst MAX_LOG_LINES anpassen/erhöhen.
 * --------------------------------------------------------------------------------------------------------------------------
 * jsonCssToLevel:  Wenn true, dann wird JSON_APPLY_CSS nur für die Spalte "level" (also debug, error, info) angewendet, 
 *                  aber nicht für die restlichen Spalten wie Datum, Log-Eintrag, etc.
                    Falls alle Spalten das CSS bekommen sollen: auf false setzen.
 * --------------------------------------------------------------------------------------------------------------------------
 *
 * WEITERER HINWEIS: 
 * Bestehende Datenpunkt-Inhalte dieses Scripts bei Anpassung dieser Option werden nicht nachträglich neu 
 * gefiltert, sondern nur alle neu hinzugefügten Log-Einträge ab Speichern des Scripts werden berücksichtigt.
 * --------------------------------------------------------------------------------------------------------------------------
 */
const LOG_FILTER = [

  // Beispiel für individuellen Eintrag. Hier wird euer Hubschrauber-Landeplatz überwacht :-) Wir wollen nur Einträge 
  // vom Adapter 'hubschr.0'. Dabei sollen entweder Wetterwarnungen, Alarme, oder UFOs gemeldet werden. Alles unter 
  // Windstärke "5 Bft" interessiert uns dabei nicht, daher haben wir '0 Bft' bis '4 Bft' auf die Blackliste gesetzt.
  // Außerdem entfernen wir von der Log-Zeile die Zeichenfolgen '****', '!!!!' und 'ufo gesichtet', der Rest bleibt 
  // aber bestehen. Zudem haben wir unter jsonColumns die Spaltenreihenfolge geändert. 'level' herausgenommen, und Quelle 
  // ganz vorne.
/*
  {
    id:             'hubschrauberlandeplatz',
    filter_all:     ['hubschr.0'],
    filter_any:     ['wetterwarnung', 'alarm', 'ufo'],
    blacklist:      ['0 Bft', '1 Bft', '2 Bft', '3 Bft', '4 Bft'],
    clean:          ['****', '!!!!', 'ufo gesichtet'],
    merge:          true,
    sortDescending: true,
    jsonDateFormat: 'dd.mm. hh:mm',       
    jsonColumns:    ['source','date','msg'],
    jsonLogLength:  100,
    jsonMaxLines:   10,
    jsonCssToLevel: true,
  }, 
*/

/*
  {
    id:             'all',    // Beispiel "all": hier kommen alle Logeinträge rein, keine Filterung
    filter_all:     ['', ''], // wird ignoriert, wenn leer
    filter_any:     ['', ''], // wird ignoriert, wenn leer
    blacklist:      ['', ''], // wird ignoriert, wenn leer
    clean:          ['', '', ''], // wird ignoriert, wenn leer
    merge:          true,
    sortDescending: true,
    jsonDateFormat: 'dd.mm. hh:mm',       
    jsonColumns:    ['date','level','source','msg'],  // Spaltenreihenfolge für JSON (Tabelle in vis)
    jsonLogLength:  100,
    jsonMaxLines:   10,
    jsonCssToLevel: true,
  },
*/
  {
    id:             'info',
    filter_all:     [' - info: '], // nur Logeinträge mit Level 'info'
    filter_any:     ['', ''],
    blacklist:      ['', ''],
    clean:          ['', '', ''],
    merge:          true,
    sortDescending: true,
    jsonDateFormat: 'dd.mm. hh:mm',
    jsonColumns:    ['date','level','source','msg'],
    jsonLogLength:  100,
    jsonMaxLines:   60,
    jsonCssToLevel: true,
  },
  {
    id:             'error',
    filter_all:     [' - error: ', ''],  // nur Logeinträge mit Level 'error'
    filter_any:     [''],
    blacklist:      ['', '', ''],
    clean:          ['', '', ''],
    merge:          true,
    sortDescending: true,
    jsonColumns:    ['date','level','source','msg'],
    jsonDateFormat: 'dd.mm. hh:mm',
    jsonLogLength:  100,
    jsonMaxLines:   60,
    jsonCssToLevel: true,
  },
  {
    id:             'warnanderror',
    filter_all:     ['', ''],
    filter_any:     [' - error: ', ' - warn: '],  // nur Logeinträge mit Levels 'warn' und 'error'
    blacklist:      ['', 'no playback content', 'Ignore! Actual secret is '],
    clean:          ['', '', ''],
    merge:          true,
    sortDescending: true,
    jsonDateFormat: 'dd.mm. hh:mm',
    jsonColumns:    ['date','level','source','msg'],
    jsonLogLength:  100,
    jsonMaxLines:   60,
    jsonCssToLevel: true,
  },
  {
    // Beispiel, um einen bestimmten Adapter zu überwachen.
    // Hier werden alle Fehler und Warnungen des Homematic-Adapters hm-rpc.0 gelistet.
    id:             'homematic',
    filter_all:     ['hm-rpc.0', ''],  // hm-rpc.0 muss enthalten sein.
    filter_any:     [' - error: ', ' - warn: '],  // entweder error oder warn
    blacklist:      ['', '', ''],
    clean:          ['', '', ''],
    merge:          true,
    sortDescending: true,
    jsonDateFormat: 'dd.mm. hh:mm',
    jsonColumns:    ['date','level','source','msg'],
    jsonLogLength:  100,
    jsonMaxLines:   60,
    jsonCssToLevel: true,
  },

];


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

// Wie oft Datenpunkte aktualisieren?
// Neu reinkommende Logeinträge werden erst mal gesammelt (in Variable G_NewLogLinesArrayToProcess). Diese werden dann 
// regelmäßig in den Datenpunkten geschrieben. Sinnvoll ist hier nicht kürzer als 2-3 Sekunden, und nicht länger als 
// ein paar Minuten. Zu kurzes Intervall: Script kommt nicht mehr nach. Zu lange: falls viele Logeinträge reinkommen, 
// kann sich vieles "aufstauen" zur Abarbeitung. Benutze den "Cron"-Button oben rechts für komfortable Einstellung.
const STATE_UPDATE_SCHEDULE = '*/20 * * * * *'; // alle 20 Sekunden


// Leer lassen! Nur setzen, falls ein eigener Filename für das Logfile verwendet wird für Debug.
const DEBUG_CUSTOM_FILENAME = '';

// Regex für die Aufteilung des Logs in 1-Datum/Zeit, 3-Level, 5-Quelle und 7-Logtext.
// Ggf. anzupassen bei anderem Datumsformat im Log. Wir erwarten ein Format
// wie z.B.: '2018-07-22 12:45:02.769  - info: javascript.0 Stop script script.js.ScriptAbc'
// Da als String, wurden alle Backslashes "\" mit einem zweiten Backslash escaped.
const LOG_PATT =  '([0-9_.\\-:\\s]*)(\\s+\\- )(silly|debug|info|warn|error|)(: )([a-z0-9.\\-]*)(\\s)(.*)';

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


/*************************************************************************************************************************
 * Global variables and constants
 *************************************************************************************************************************/

// Final state path
const FINAL_STATE_LOCATION = validateStatePath(LOG_STATE_PATH, false);
const FINAL_STATE_PATH = validateStatePath(LOG_STATE_PATH, true);


// Merge loglines: define pattern (and escape the merge text)
// We added an additional backslash '\' to each backslash as these need to be escaped.
const MERGE_REGEX_PATT = '^\\[(\\d+)\\s' + escapeRegExp(MERGE_LOGLINES_TXT) + '\\]\\s(.*)';

// Log Handler variable for ioBroker function onLog()
let G_LogHandler;  // being set later

// Schedule for logfile update
let G_Schedule_StateUpdate; // being set later

// We add here all the new log lines to be processed regularly (per STATE_UPDATE_SCHEDULE);
let G_NewLogLinesArrayToProcess = [];

/*************************************************************************************************************************
 * init - This is executed on every script (re)start.
 *************************************************************************************************************************/
init();
function init() {

    // Unsubscribe log handler
    onLogUnregister(G_LogHandler);
    
    // Create all script states
    createUserStates(FINAL_STATE_LOCATION, false, buildNeededStates(), function() {
        // -- All states created, so we continue by using callback

        // Subscribe on changes: Pressed button "clearJSON"
        subscribeClearJson();

        // Subscribe to log handler
        G_LogHandler = onLog('*', data => { // please disregard the red squiggly underline under '*', see Github issue: https://github.com/ioBroker/ioBroker.javascript/issues/457
            processNewLogLine(data);
        });

        // Schedule writing changes into states
        clearSchedule(G_Schedule_StateUpdate);
        G_Schedule_StateUpdate = schedule(STATE_UPDATE_SCHEDULE, processNewLogsPerSchedule);

        // Message
        if (LOG_INFO) log('Start monitoring of the ioBroker log...', 'info');

    });

}

function processNewLogLine(data) {
    
    // Convert to Log Line
    // TODO: This is a quick implementation of new function onLog().
    //       We need to entirely rewrite script later to fully use the data object.
    //       However, at this time, we convert it to a standard log line being expected.

    // First, remove PID if desired
    let msg = data.message;
    if (REMOVE_PID) msg = removePID(msg);

    // Now convert to log line
    let newLogEntry = timestampToLogDate(data.ts) + '  - [32m' + data.severity + '[39m: ' + msg;

    // Check if we have DEBUG_IGNORE_STR in the new log line
    if(! newLogEntry.includes(DEBUG_IGNORE_STR)) {

        if (newLogEntry.length > 45) {  // a log line with less than 45 chars is not a valid log line.

            // Cleanse and apply blacklist
            newLogEntry = cleanseLogLine(newLogEntry);

            // Push result into logArrayFinal
            G_NewLogLinesArrayToProcess.push(newLogEntry);

            // some debugging
            if (LOG_DEBUG) log (DEBUG_IGNORE_STR + '===============================================================');
            if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'New Log Entry, Len (' + newLogEntry.length + '), content: [' + newLogEntry + ']');

            // This is for debugging purposes, and it will log every new log entry once again. See DEBUG_EXTENDED option above.
            if (DEBUG_EXTENDED) {
                if (! newLogEntry.includes(DEBUG_EXTENDED_STR)) { // makes sure no endless loop here.
                    log(DEBUG_EXTENDED_STR + newLogEntry.substring(0, DEBUG_EXTENDED_NO_OF_CHARS));
                        
                }
            }
        }
    }

}

/**
 * Called per schedule STATE_UPDATE_SCHEDULE.
 * It processes G_NewLogLinesArrayToProcess
 */
function processNewLogsPerSchedule() {
    if (! isLikeEmpty (G_NewLogLinesArrayToProcess) ) {

        // We use array spreads '...' to copy array. If not, array is changed by reference and not value.
        // That means, if we change the target array, it will also change the source array.
        // See https://stackoverflow.com/questions/7486085/copy-array-by-value
        let logArrayToProcess = [...G_NewLogLinesArrayToProcess];
        G_NewLogLinesArrayToProcess.length = 0; // emptying array. https://stackoverflow.com/questions/4804235/difference-between-array-length-0-and-array

        /**
         * Apply the filters as set in LOG_FILTER and split up log levels into elements of an array
         * logArrayToProcessFiltered will look as follows:
         *   logArrayToProcessFiltered = [
         *     ['info':'15.08.2019 09:27:55.476 info adapt.0 some log', 'error':''],
         *     ['info':'15.08.2019 09:33:58.522 info adapt.0 some more log', 'error':''],
         *     ['info':'', 'error':'15.08.2019 09:37:55.807 error adapt.0 some error log']
         *   ]
         */
        let logArrayToProcessFiltered = [];
        for (let lpEntry of logArrayToProcess) {
            let logEntryFilteredArray = applyFilter(lpEntry);
            logArrayToProcessFiltered.push(logEntryFilteredArray);
        }

        // Further process and finally set states with our results.
        processLogArrayAndSetStates(logArrayToProcessFiltered);

    }
}



/*************************************************************************************************************************
 * Filtering
 *************************************************************************************************************************/

/**
 * This function applies the filters as set in LOG_FILTER.
 * Also, it splits up the log levels into elements of an array we return by this function.
 * @param {string} strLogEntry
 * @return {array}  split up log levels as elements within this array, like: ['info':'logtext', 'error':'logtext'] etc.
 */
function applyFilter(strLogEntry) {
    // We add one element per each filter to the Array ('all', 'error', etc.)
    let logArrayProcessed = [];
    for (let j = 0; j < LOG_FILTER.length; j++) {
        logArrayProcessed[LOG_FILTER[j].id] = '';
    }

    // We apply regex here. This will also eliminate all log lines without proper info
    // like date/time, log level, and entry.
    let arrSplitLogLine = logLineSplit(strLogEntry);
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

/*************************************************************************************************************************
 * Further processing
 *************************************************************************************************************************/

/**
 * Further processes the log array and set states accordingly.
 * 
 * @param  arrayLogInput             The Array of the log input.
 *                                   Array is like: 
 *                                   [
 *                                      ['info':'15.08.2019 09:27:55.476 info adapt.0 some log', 'error':''],
 *                                      ['info':'15.08.2019 09:33:58.522 info adapt.0 some more log', 'error':''],
 *                                      ['info':'', 'error':'15.08.2019 09:37:55.807 error adapt.0 some error log'],
 *                                   ]
 **/
function processLogArrayAndSetStates(arrayLogInput) {

    /*****************
     * [1] Build array from LOG_FILTER. Looks like: arrayFilterIds = ['info', 'error', 'warn'].
     * Also, build result array to keep our results. Lools like resultArr = [info: '', error: '', warn: '']
     *****************/
    let arrayFilterIds = [];
    let resultArr = [];
    for (let i = 0; i < LOG_FILTER.length; i++) {
        arrayFilterIds.push(LOG_FILTER[i].id); // each LOG_FILTER id into array
        resultArr[LOG_FILTER[i].id] = '';
    }
    /*****************
     * [2] Process element by element, so ['info':'log test', 'error':'log test'] of given array.
     * We fill the result array accordingly.
     *****************/
    for (let lpElement of arrayLogInput) {

        // Loop thru our new array arrayFilterIds and fill result array
        for (let k = 0; k < arrayFilterIds.length; k++) {

            // some variables
            let lpFilterId = arrayFilterIds[k]; // Filter ID from LOG_FILTER, like 'error', 'info', 'custom', etc.
            let lpNewLogLine = lpElement[lpFilterId]; // Current log line of provided array element of 'error', 'info', 'custom' etc.

            if (isLikeEmpty(lpNewLogLine)) {
                // No log content for the given filter id.
                if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Filter  [' + lpFilterId + ']: No match.');
            } else {

                if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Filter [' + lpFilterId + ']: Match! New Log Line length: (' + lpNewLogLine.length + ')');

                // Append new log line to result array
                if (isLikeEmpty(resultArr[lpFilterId])) {
                    resultArr[lpFilterId] = lpNewLogLine; 
                } else {
                    resultArr[lpFilterId] = lpNewLogLine + resultArr[lpFilterId]; // "\n" not needed, always added above
                }
            }
        }
    }

    /*****************
     * [3] We merge with the current state.
     *****************/
    for (let k = 0; k < arrayFilterIds.length; k++) {
        let lpFilterId = arrayFilterIds[k]; // Filter ID from LOG_FILTER, like 'error', 'info', 'custom', etc.
        let lpStatePath1stPart = FINAL_STATE_PATH + '.log' + cleanseStatePath(lpFilterId); // Get Path to state
        let lpNewFinalLog = resultArr[lpFilterId];

        if (! isLikeEmpty(lpNewFinalLog) )  {

            // Get state value
			let strCurrentStateLog = getState(lpStatePath1stPart + '.log').val; // Get state contents of loop item
            
            // Add state log lines to our final log
            if (! isLikeEmpty(strCurrentStateLog)) {
                lpNewFinalLog = lpNewFinalLog + strCurrentStateLog; // "\n" not needed, always added above
            }            

            // Convert to array for easier handling
            let lpNewFinalLogArray = lpNewFinalLog.split(/\r?\n/);

            // Remove duplicates
            lpNewFinalLogArray = arrayRemoveDublicates(lpNewFinalLogArray);

            // Remove empty values
            lpNewFinalLogArray = cleanArray(lpNewFinalLogArray);

            // Sort array descending
            lpNewFinalLogArray = sortLogArrayByDate(lpNewFinalLogArray, 'desc');

            // Merge Loglines if multiple values and add leading '[123 entries]' to log message
            let doMerge = getConfigValuePerKey(LOG_FILTER, 'id', lpFilterId, 'merge');
            if (doMerge || doMerge === 'true') {    // also check for string 'true' in case user used string
                lpNewFinalLogArray = mergeLogLines(lpNewFinalLogArray);
            }

            // We need a separate array for JSON
            let lpNewFinalLogArrayJSON = lpNewFinalLogArray;

            // Let's remove elements if time of when button '.clearJSON' was pressed is greater than log date.
            lpNewFinalLogArrayJSON = clearJsonByDate(lpNewFinalLogArrayJSON, lpStatePath1stPart + '.clearJSON');              

            // Just keep the first x elements of the log. JSON log length is being set individually.
            lpNewFinalLogArray = lpNewFinalLogArray.slice(0, MAX_LOG_LINES);
            lpNewFinalLogArrayJSON = lpNewFinalLogArrayJSON.slice(0, getConfigValuePerKey(LOG_FILTER, 'id', lpFilterId, 'jsonMaxLines'));

            // Get just the most recent log entry into string
            let lpMostRecent = lpNewFinalLogArray[0];

            // Sort ascending if desired
            if (!getConfigValuePerKey(LOG_FILTER, 'id', lpFilterId, 'sortDescending')) {
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
                // Get 4 elements in array: datetime, level, source, message
                let arrSplitLogLine = logLineSplit(lpNewFinalLogArrayJSON[j]);
                if (arrSplitLogLine !== false) {
                    let strLogMsg = arrSplitLogLine.message;
                    // Reduce the length for each log message per "jsonLogLength"
                    strLogMsg = strLogMsg.substr(0, LOG_FILTER[k].jsonLogLength);
                    // ++++++
                    // Build the final Array
                    // ++++++
                    // We need this section to generate the JSON with the columns (which ones, and order) as specified in LOG_FILTER
                    let objectJSONentry = {}; // object (https://stackoverflow.com/a/13488998)
                    if (isLikeEmpty(LOG_FILTER[k].jsonColumns)) log('Columns not specified in "jsonColumns".', 'warn');
                    // Prepare CSS
                    let strCSS1, strCSS2;
                    let strCSS1_level, strCSS2_level;
                    if (JSON_APPLY_CSS) {
                        strCSS1 = "<span class='log-" + arrSplitLogLine.level + "'>";
                        strCSS2 = '</span>';
                        strCSS1_level = strCSS1;
                        strCSS2_level = strCSS2;
                        if (LOG_FILTER[k].jsonCssToLevel) {
                            strCSS1 = '';
                            strCSS2 = '';
                        }
                    }

                    for (let lpCol of LOG_FILTER[k].jsonColumns) {
                        switch (lpCol) {
                            case 'date' :
                                objectJSONentry.date = strCSS1 + formatLogDateStr(arrSplitLogLine.datetime, LOG_FILTER[k].jsonDateFormat) + strCSS2;
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
        let lpStateFirstPart = FINAL_STATE_PATH + '.log' + lpFilterId;
        logSubscribe += ( (logSubscribe === '') ? '' : ', ') + lpFilterId;
        on({id: lpStateFirstPart + '.clearJSON', change: 'any', val: true}, function(obj) {
            let stateBtnPth = obj.id // e.g. [javascript.0.Log-Script.logInfo.clearJSON]
            let firstPart = stateBtnPth.substring(0, stateBtnPth.length-10); // get first part of obj.id, like "javascript.0.Log-Script.logInfo"
            let filterID = firstPart.slice(firstPart.lastIndexOf('.') + 1); // gets the filter id, like "logInfo"
            if (LOG_DEBUG) log(DEBUG_IGNORE_STR + 'Clear JSON states for [' + filterID + '].');
            // We clear the according JSON states
            setState(firstPart + '.logJSON', '[]');
            setState(firstPart + '.logJSONcount', 0);

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
 * @param {string}    format    e.g. 'yyyy-mm-dd HH:MM:SS'. Both upper case and lower case letters are allowed.
 * @return {string}             Returns the resulting date string
 */
function formatLogDateStr(strDate, format) {

    let strResult = format.toLowerCase();
    strResult = strResult.replace('yyyy', strDate.substr(0,4));
    strResult = strResult.replace('yy', strDate.substr(2,2));
    strResult = strResult.replace('mm', strDate.substr(5,2));
    strResult = strResult.replace('dd', strDate.substr(8,2));
    strResult = strResult.replace('hh', strDate.substr(11,2));
    strResult = strResult.replace('mm', strDate.substr(14,2));
    strResult = strResult.replace('ss', strDate.substr(17,2));

    return strResult;

}

/**
 * Cleanse the log line
 * @param {string}   logLine    The log line to be cleansed.
 * @return {string}             The cleaned log line
 */
function cleanseLogLine(logLine) {
    // Remove color escapes - https://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
    let logLineResult = logLine.replace(/\u001b\[.*?m/g, ''); 
    // Sometimes, a log line starts with the term "undefined", so we remove it.
    if (logLineResult.substr(0,9) === 'undefined') logLineResult = logLineResult.substr(9,99999);
    // Remove white space, tab stops, new line
    logLineResult = logLineResult.replace(/\s\s+/g, ' ');
    // Check against global blacklist
    if(strMatchesTerms(logLineResult, BLACKLIST_GLOBAL, 'blacklist')) logLineResult = '';


    return logLineResult;
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
 * @param {string}  inputValue  Log line like '2018-07-22 11:47:53.019  - info: javascript.0 script.js ...'
 * @return {object}   Array with 4 elements: 
 *                     0. datetime (e.g. 2018-07-22 11:47:53.019),
 *                     1. level (e.g. info)
 *                     2. source (e.g. javascript.0)
 *                     3. message (e.g. script.js....)
 *                     Returns FALSE if no match or input value not valid
 */
function logLineSplit(inputValue) {

    // Get RegEx ready
    let mRegEx = new RegExp(LOG_PATT, 'g');

    // Split
    let returnObj = {}
    let m;
    do {
        m = mRegEx.exec(inputValue);
        if (m) {
            returnObj.datetime = m[1];
            returnObj.spaceAt2 = m[2];
            returnObj.level = m[3];
            returnObj.spaceAt4 = m[4];
            returnObj.source = m[5];
            returnObj.spaceAt6 = m[6];
            returnObj.message = m[7];
        } 
    } while (m);

    // Now we check if we have valid entries we want
    if ((returnObj.datetime === undefined)
        || (returnObj.level === undefined)
        || (returnObj.source === undefined)
        || (returnObj.message === undefined)
    ) {
       return false; // no valid hits
    }
    // We can return the array now, since it meets all requirements
    return returnObj;

}

/**
 * Merges date/time, level, source and message to a logline
 * @param  {array}    inputValue   Array with 4 elements: date/time, level, source, message
 * @return {string}   Merged log line as string. Empty string '', if input value not valid.
																			  
 */
function logLineMerge(inputValue) {

    if (inputValue.length === 4) {
        let mergedLine = inputValue[0] + ' - ' + inputValue[1] + ': ' + inputValue[2] + ' ' + inputValue[3];
        return mergedLine;
    } else {
        // We expect a size of 4, so go out
        return '';
    }

}


/**
 * Merge Loglines if multiple values and add leading '[123 entries]' to log message
 * @param {array}  logArray        array of log entries
 * @return {array} the new merged log array
 */
function mergeLogLines(logArray) {

    // We use array spreads '...' to copy array. If not, array is changed by reference and not value.
    // That means, if we change the target array, it will also change the source array.
    // See https://stackoverflow.com/questions/7486085/copy-array-by-value
    let arrCopy = [...logArray];
    let arrNew = [];

    for (let i = 0; i < arrCopy.length; i++) {

        if (! isLikeEmpty(arrCopy[i])) {

            let lpEntry = arrCopy[i];
            let lineWithoutDate = lpEntry.substring(23);
            let lpLineSplit = logLineSplit(lpEntry);

            // Get multiple values
            let lpMulti = arrayGetElements(arrCopy, removeLeading123entries(lpLineSplit.message), false);
            let result = lpEntry;
            let lineCounter = 0;
            if (lpMulti.length > 1) { // Treffer - die aktuelle Zeile zählt ja auch mit.
                lineCounter = lpMulti.length;
                let hitLeadingNumber = -1;
                for (let hitLine of lpMulti) {
                    let hitLineSplit = logLineSplit(hitLine);
                    // Check if hit contains '[123 entries]'. If yes, get the number out of it into lineCounter.
                    // If not, we just count with 1.
                    hitLeadingNumber = checkForMultiEntry(hitLineSplit.message);
                    if (hitLeadingNumber > 1) {
                        lineCounter = hitLeadingNumber + lpMulti.length - 1;
                    }
                }
            } else {
                lineCounter = 1;
            }

            if (lineCounter > 1) {

                    // remove from array by filling empty value
                    arrCopy = arrayReplaceElementsByValue(arrCopy, removeLeading123entries(lpLineSplit.message), '', false);
                    // new result
                    result = logLineMerge([lpLineSplit.datetime, lpLineSplit.level, lpLineSplit.source, '[' + lineCounter + ' ' + MERGE_LOGLINES_TXT + '] ' + removeLeading123entries(lpLineSplit.message)]);
            }
            arrNew.push(result);
        } 
    }

    return arrNew;

    /**
     * @param  {string}   strInput    A log message with potential leading '[123 entries]'
     * @return {string}   string without leading '[123 entries]', if it is there
     */
    function removeLeading123entries(strInput) {

        let mRegEx = new RegExp(MERGE_REGEX_PATT);
        let matches = mRegEx.exec(strInput);
        if (matches === null) {
            return strInput;
        } else {
            return matches[2];
        }
    }

    /**
     * @param  {string}   strInput    A log message checking for leading '[123 entries]'
     * @return {number}   returns the number 123 from '[123 entries]' if any match, or -1 if not found
     */
    function checkForMultiEntry(strInput) {

        // Get RegEx ready
        let mRegEx = new RegExp(MERGE_REGEX_PATT);
        let matches = mRegEx.exec(strInput);
        if (matches === null) {
            return -1;
        } else {
            return parseInt(matches[1]);
        }
    }

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
 * Clear array: if stateForTimeStamp is greater or equal than log date, we remove the entire log entry
 * @param {array} inputArray     Array of log entries
 * @param {string} stateForTimeStamp     state of which we need the time stamp
 * @return {array} cleaned log
 */
function clearJsonByDate(inputArray, stateForTimeStamp) {
    let dtState = new Date(getState(stateForTimeStamp).ts);
    if (LOG_DEBUG) log (DEBUG_IGNORE_STR + 'Time of last change of state [' + stateForTimeStamp + ']: ' + dtState);
    let newArray = [];
    for (let lpLog of inputArray) {
        let dtLog = new Date(lpLog.substr(0,23));
        if (dtLog.getTime() >= dtState.getTime()) {
            newArray.push(lpLog);            
        }
  }
  return newArray;
}


/**
 * Build an array of states we need to create.
 * @return {array} Array of states to be created. Format: see function createUserStates()
 */
function buildNeededStates() {

    let logCleanIDs = '';
    let statesArray = [];
    if (! isLikeEmpty(LOG_FILTER)) {
        for(let i = 0; i < LOG_FILTER.length; i++) {
            if (LOG_FILTER[i].id !== '') {
                let lpIDClean = cleanseStatePath(LOG_FILTER[i].id);
                logCleanIDs += ((logCleanIDs === '') ? '' : '; ') + lpIDClean;

                statesArray.push({ id:'log' + lpIDClean + '.log', name:'Filtered Log - ' + lpIDClean, type:"string", role: "state", def: ""});
                statesArray.push({ id:'log' + lpIDClean + '.logJSON', name:'Filtered Log - ' + lpIDClean + ' - JSON', type:"string", role: "state", def: ""});
                statesArray.push({ id:'log' + lpIDClean + '.logJSONcount', name:'Filtered Log - Count of JSON ' + lpIDClean, role: "state", type:"number", def: 0});
                statesArray.push({ id:'log' + lpIDClean + '.clearJSON', name:'Clear JSON log ' + lpIDClean, role: "button", type:"boolean", def: false});

                /**
                 *  Backward compatibility & cleanup: removing states not needed
                 */
                // State .logMostRecent removed with script version 2.0a onwards as it does not make sense any longer due to scheduled update
                let lpRetiredState = FINAL_STATE_PATH + '.log' + lpIDClean + '.logMostRecent';
                if (isState(lpRetiredState, true))  {
                    deleteState(lpRetiredState);
                    if (LOG_INFO) log('Remove retired state: ' + lpRetiredState, 'info');
                }
                // State .clearJSONtime removed with script version 1.2 onwards as we use now time stamp of button '.clearJSON'.
                lpRetiredState = FINAL_STATE_PATH + '.log' + lpIDClean + '.clearJSONtime';
                if (isState(lpRetiredState, true))  {
                    deleteState(lpRetiredState);
                    if (LOG_INFO) log('Remove retired state: ' + lpRetiredState, 'info');
                }
																																														  
            }
        }
        if (LOG_DEBUG) log('createLogStates(): Clean IDs: ' + logCleanIDs);
    }

    let finalStates = [];
    for (let s=0; s < statesArray.length; s++) {
        finalStates.push([FINAL_STATE_PATH + '.' + statesArray[s].id, {
            'name': statesArray[s].name,
            'desc': statesArray[s].name,
            'type': statesArray[s].type,
            'read': true,
            'write': true,
            'role': statesArray[s].role,
            'def': statesArray[s].def,
        }]);
    }
    return finalStates;
}

/**
 * Converts a timestamp to log date format, like 2019-10-15 16:38:00.260.
 * @param {object}  timeStamp   The date/time timestamp to convert.
 * @return {string} The resulting log date format as string.
 */
function timestampToLogDate(timeStamp) {

    let date = new Date(timeStamp);
    // Need to convert to local time as this time provided from onLog() is UTC
    // https://stackoverflow.com/questions/6525538/convert-utc-date-time-to-local-date-time/18330682
    let localDate = new Date(date.getTime() - date.getTimezoneOffset()*60*1000);

    // Convert to ISO string, so like 2019-10-15T16:38:00.260Z
    let strResult = localDate.toISOString();

    // date.toISOString() adds T and Z, so we remove these letters, as the log do not show these.
    strResult = strResult.replace('T', ' ');  // remove T
    strResult = strResult.replace('Z', '');  // remove Z at the end
    return strResult;

}

/**
 * Remove PID in log message 
 * The js-controller version 2.0+ adds the PID number inside brackets to the beginning of the message. We remove it here.
 * @param {string} msg   The log message, like: 'javascript.0 (123) Logtext 123 Logtext 123 Logtext 123 Logtext 123'
 */
function removePID(msg) {

    // First: Split source and message text. 
    // Input is like: 'javascript.0 (123) Logtext 123 Logtext 123 Logtext 123 Logtext 123'
    let regexp = /^(\S+)\s(.*)/;
    let matches_array = msg.match(regexp);
    let strFirst = matches_array[1];    // like 'javascript.0'
    let strRest = matches_array[2];     // like '(123) Logtext 123 Logtext 123 Logtext 123 Logtext 123'
    
    // Next, we remove the PID
    strRest = strRest.replace(/^\([0-9]{1,9}\)\s/, '');

    // Last, we put the two strings together again
    return strFirst + ' ' + strRest;

}




/*************************************************************************************************************************
 * onStop - Being executed once this ioBroker Script stops. 
 *************************************************************************************************************************/
// This is to end the Tale. Not sure, if we indeed need it, but just in case...
onStop(function myScriptStop () {

    // Unsubscribe log handler
    onLogUnregister(G_LogHandler);
    if (LOG_INFO) log('Unsubscribed to Log Handler.', 'info');

}, 0);



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
 * 08-Sep-2019: added check for [ and ] to also catch arrays with empty strings.
 * @param inputVar - Input Array or String, Number, etc.
 * @return true if it is undefined/null/empty, false if it contains value(s)
 * Array or String containing just whitespaces or >'< or >"< or >[< or >]< is considered empty
 */
function isLikeEmpty(inputVar) {
    if (typeof inputVar !== 'undefined' && inputVar !== null) {
        let strTemp = JSON.stringify(inputVar);
        strTemp = strTemp.replace(/\s+/g, ''); // remove all whitespaces
        strTemp = strTemp.replace(/\"+/g, "");  // remove all >"<
        strTemp = strTemp.replace(/\'+/g, "");  // remove all >'<
        strTemp = strTemp.replace(/\[+/g, "");  // remove all >[<
        strTemp = strTemp.replace(/\]+/g, "");  // remove all >]<
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

/**
 * Checks if a a given state or part of state is existing.
 * This is a workaround, as getObject() or getState() throw warnings in the log.
 * Set strict to true if the state shall match exactly. If it is false, it will add a wildcard * to the end.
 * See: https://forum.iobroker.net/topic/11354/
 * @param {string}    strStatePath     Input string of state, like 'javas-cript.0.switches.Osram.Bedroom'
 * @param {boolean}   [strict=true]    Optional: Default is true. If true, it will work strict, if false, it will add a wildcard * to the end of the string
 * @return {boolean}                   true if state exists, false if not
 */
function isState(strStatePath, strict) {

    if(strict === undefined) strict = true;

    let mSelector;
    if (strict) {
        mSelector = $('state[id=' + strStatePath + '$]');
    } else {
        mSelector = $('state[id=' + strStatePath + ']');
    }
    if (mSelector.length > 0) {
        return true;
    } else {
        return false;
    }
}


/**
 * Removing Array element(s) by input value. 
 * @param {array}   arr             the input array
 * @param {string}  valRemove       the value to be removed
 * @param {boolean} [exact=true]    OPTIONAL: default is true. if true, it must fully match. if false, it matches also if valRemove is part of element string
 * @return {array}  the array without the element(s)
 */
function arrayRemoveElementsByValue(arr, valRemove, exact) {

    for ( let i = 0; i < arr.length; i++){ 
        if (exact) {
            if ( arr[i] === valRemove) {
                arr.splice(i, 1);
                i--; // required, see https://love2dev.com/blog/javascript-remove-from-array/
            }
        } else {
            if (arr[i].indexOf(valRemove) != -1) {
                arr.splice(i, 1);
                i--; // see above
            }
        }
    }
    return arr;
}

/**
 * Escapes a string for use in RegEx as (part of) pattern
 * Source: https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
 * @param {string} inputStr  The input string to be escaped
 * @return {string}  The escaped string
 */
function escapeRegExp(inputStr) {
    return inputStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}


/**
 * Get all elements of an array if found
 * @param {array}   arr             the input array
 * @param {string}  valFind         the value to find
 * @param {boolean} [exact=true]    OPTIONAL: default is true. if true, it must fully match. if false, it matches also if valRemove is part of element string
 * @return {array}  an array with all hits or empty array if no hits.
 */
function arrayGetElements(arr, valFind, exact) {
    let resultArr = [];
    for ( let i = 0; i < arr.length; i++){ 
        if (exact) {
            if ( arr[i] === valFind) {
                resultArr.push(arr[i]);
            }
        } else {
            if (arr[i].indexOf(valFind) != -1) {
                resultArr.push(arr[i]);
            }
        }
    }
    return resultArr;
}

/**
 * Replace Array element(s) by input value. 
 * @param {array}   arr             the input array
 * @param {string}  valReplace      the value to search for
 * @param {string}  newValue        the new value
 * @param {boolean} [exact=true]    OPTIONAL: default is true. if true, it must fully match. if false, it matches also if valRemove is part of element string
 * @return {array}  the array with replaced the element(s)
 */
function arrayReplaceElementsByValue(arr, valReplace, newValue, exact) {

    for ( let i = 0; i < arr.length; i++){ 
        if (exact) {
            if ( arr[i] === valReplace) {
                arr[i] = newValue;
            }
        } else {
            if (arr[i].indexOf(valReplace) != -1) {
                arr[i] = newValue;
            }
        }
    }
    return arr;
}

/**
 * Retrieve values from a CONFIG variable, example:
 * const CONF = [{car: 'bmw', color: 'black', hp: '250'}, {car: 'audi', color: 'blue', hp: '190'}]
 * To get the color of the Audi, use: getConfigValuePerKey(CONF, 'car', 'audi', 'color')
 * To find out which car has 190 hp, use: getConfigValuePerKey(CONF, 'hp', '190', 'car')
 * @param {object}  config     The configuration variable/constant
 * @param {string}  key1       Key to look for.
 * @param {string}  key1Value  The value the key should have
 * @param {string}  key2       The key which value we return
 * @returns {any}    Returns the element's value, or number -1 of nothing found.
 */
function getConfigValuePerKey(config, key1, key1Value, key2) {
    for (let lpConfDevice of config) {
        if ( lpConfDevice[key1] === key1Value ) {
            if (lpConfDevice[key2] === undefined) {
                return -1;
            } else {
                return lpConfDevice[key2];
            }
        }
    }
    return -1;
}


/**
 * For a given state path, we extract the location '0_userdata.0' or 'javascript.0' or add '0_userdata.0', if missing.
 * @param {string}  path            Like: 'Computer.Control-PC', 'javascript.0.Computer.Control-PC', '0_userdata.0.Computer.Control-PC'
 * @param {boolean} returnFullPath  If true: full path like '0_userdata.0.Computer.Control-PC', if false: just location like '0_userdata.0' or 'javascript.0'
 * @return {string}                 Path
 */
function validateStatePath(path, returnFullPath) {
    if (path.startsWith('.')) path = path.substr(1);    // Remove first dot
    if (path.endsWith('.'))   path = path.slice(0, -1); // Remove trailing dot
    if (path.length < 1) log('Provided state path is not valid / too short.', 'error')
    let match = path.match(/^((javascript\.([1-9][0-9]|[0-9])\.)|0_userdata\.0\.)/);
    let location = (match == null) ? '0_userdata.0' : match[0].slice(0, -1); // default is '0_userdata.0'.
    if(returnFullPath) {
        return (path.indexOf(location) == 0) ? path : (location + '.' + path);
    } else {
        return location;
    }
}


/**
 * Create states under 0_userdata.0 or javascript.x
 * Current Version:     https://github.com/Mic-M/iobroker.createUserStates
 * Support:             https://forum.iobroker.net/topic/26839/
 * Autor:               Mic (ioBroker) | Mic-M (github)
 * Version:             1.1 (26 January 2020)
 * Example:             see https://github.com/Mic-M/iobroker.createUserStates#beispiel
 * -----------------------------------------------
 * PLEASE NOTE: Per https://github.com/ioBroker/ioBroker.javascript/issues/474, the used function setObject() 
 *              executes the callback PRIOR to completing the state creation. Therefore, we use a setTimeout and counter. 
 * -----------------------------------------------
 * @param {string} where          Where to create the state: '0_userdata.0' or 'javascript.x'.
 * @param {boolean} force         Force state creation (overwrite), if state is existing.
 * @param {array} statesToCreate  State(s) to create. single array or array of arrays
 * @param {object} [callback]     Optional: a callback function -- This provided function will be executed after all states are created.
 */
function createUserStates(where, force, statesToCreate, callback = undefined) {
 
    const WARN = false; // Only for 0_userdata.0: Throws warning in log, if state is already existing and force=false. Default is false, so no warning in log, if state exists.
    const LOG_DEBUG = false; // To debug this function, set to true
    // Per issue #474 (https://github.com/ioBroker/ioBroker.javascript/issues/474), the used function setObject() executes the callback 
    // before the state is actual created. Therefore, we use a setTimeout and counter as a workaround.
    const DELAY = 50; // Delay in milliseconds (ms). Increase this to 100, if it is not working.

    // Validate "where"
    if (where.endsWith('.')) where = where.slice(0, -1); // Remove trailing dot
    if ( (where.match(/^((javascript\.([1-9][0-9]|[0-9]))$|0_userdata\.0$)/) == null) ) {
        log('This script does not support to create states under [' + where + ']', 'error');
        return;
    }

    // Prepare "statesToCreate" since we also allow a single state to create
    if(!Array.isArray(statesToCreate[0])) statesToCreate = [statesToCreate]; // wrap into array, if just one array and not inside an array

    // Add "where" to STATES_TO_CREATE
    for (let i = 0; i < statesToCreate.length; i++) {
        let lpPath = statesToCreate[i][0].replace(/\.*\./g, '.'); // replace all multiple dots like '..', '...' with a single '.'
        lpPath = lpPath.replace(/^((javascript\.([1-9][0-9]|[0-9])\.)|0_userdata\.0\.)/,'') // remove any javascript.x. / 0_userdata.0. from beginning
        lpPath = where + '.' + lpPath; // add where to beginning of string
        statesToCreate[i][0] = lpPath;
    }

    if (where != '0_userdata.0') {
        // Create States under javascript.x
        let numStates = statesToCreate.length;
        statesToCreate.forEach(function(loopParam) {
            if (LOG_DEBUG) log('[Debug] Now we are creating new state [' + loopParam[0] + ']');
            let loopInit = (loopParam[1]['def'] == undefined) ? null : loopParam[1]['def']; // mimic same behavior as createState if no init value is provided
            createState(loopParam[0], loopInit, force, loopParam[1], function() {
                numStates--;
                if (numStates === 0) {
                    if (LOG_DEBUG) log('[Debug] All states processed.');
                    if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                        if (LOG_DEBUG) log('[Debug] Function to callback parameter was provided');
                        return callback();
                    } else {
                        return;
                    }
                }
            });
        });
    } else {
        // Create States under 0_userdata.0
        let numStates = statesToCreate.length;
        let counter = -1;
        statesToCreate.forEach(function(loopParam) {
            counter += 1;
            if (LOG_DEBUG) log ('[Debug] Currently processing following state: [' + loopParam[0] + ']');
            if( ($(loopParam[0]).length > 0) && (existsState(loopParam[0])) ) { // Workaround due to https://github.com/ioBroker/ioBroker.javascript/issues/478
                // State is existing.
                if (WARN && !force) log('State [' + loopParam[0] + '] is already existing and will no longer be created.', 'warn');
                if (!WARN && LOG_DEBUG) log('[Debug] State [' + loopParam[0] + '] is already existing. Option force (=overwrite) is set to [' + force + '].');
                if(!force) {
                    // State exists and shall not be overwritten since force=false
                    // So, we do not proceed.
                    numStates--;
                    if (numStates === 0) {
                        if (LOG_DEBUG) log('[Debug] All states successfully processed!');
                        if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                            if (LOG_DEBUG) log('[Debug] An optional callback function was provided, which we are going to execute now.');
                            return callback();
                        }
                    } else {
                        // We need to go out and continue with next element in loop.
                        return; // https://stackoverflow.com/questions/18452920/continue-in-cursor-foreach
                    }
                } // if(!force)
            }

            // State is not existing or force = true, so we are continuing to create the state through setObject().
            let obj = {};
            obj.type = 'state';
            obj.native = {};
            obj.common = loopParam[1];
            setObject(loopParam[0], obj, function (err) {
                if (err) {
                    log('Cannot write object for state [' + loopParam[0] + ']: ' + err);
                } else {
                    if (LOG_DEBUG) log('[Debug] Now we are creating new state [' + loopParam[0] + ']')
                    let init = null;
                    if(loopParam[1].def === undefined) {
                        if(loopParam[1].type === 'number') init = 0;
                        if(loopParam[1].type === 'boolean') init = false;
                        if(loopParam[1].type === 'string') init = '';
                    } else {
                        init = loopParam[1].def;
                    }
                    setTimeout(function() {
                        setState(loopParam[0], init, true, function() {
                            if (LOG_DEBUG) log('[Debug] setState durchgeführt: ' + loopParam[0]);
                            numStates--;
                            if (numStates === 0) {
                                if (LOG_DEBUG) log('[Debug] All states processed.');
                                if (typeof callback === 'function') { // execute if a function was provided to parameter callback
                                    if (LOG_DEBUG) log('[Debug] Function to callback parameter was provided');
                                    return callback();
                                }
                            }
                        });
                    }, DELAY + (20 * counter) );
                }
            });
        });
    }
}

