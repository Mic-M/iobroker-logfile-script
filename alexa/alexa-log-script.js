/******************************************************************************************************
 * History der Alexa-Sprachbefehle in VIS darstellen.
 * Siehe hier: https://forum.iobroker.net/post/386960
 * Erfordert das Log-Script: https://github.com/Mic-M/iobroker.logfile-script
 * --------------------------------------------------------------------------------------
 * Aktuelle Version: https://github.com/Mic-M/iobroker.logfile-script
 * Support:          https://forum.iobroker.net/topic/13971/
 * Autor:            Mic (ioBroker) | Mic-M (github)
 * --------------------------------------------------------------------------------------
 * Change Log:
 *  0.1     Mic   * Initial release.
 ******************************************************************************************************/

// Zur Verwendung wird das o.g. Log-Script benötigt. 
// Hier ein Filter-Beispiel für das Log-Script:
/*
  {
    id:             'alexa',
    filter_all:     ['[Alexa-Log-Script]', ''],
    filter_any:     [' - info: '],
    blacklist:      ['', '', ''],
    clean:          [/script\.js\.[^:]*: \[Alexa-Log-Script]/, '', ''],
    merge:          false,
    sortDescending: true,
    jsonDateFormat: '#DD.MM.# hh:mm',
    jsonColumns:    ['date','level','source','msg'],
    jsonLogLength:  100,
    jsonMaxLines:   50,
    jsonCssToLevel: true,
  },
*/

// Normalerweise wird die "summary", also der Befehl an Alexa, in Kleinbuchstaben zurückgegeben, also 
// z.B. "flurlicht einschalten". Wenn diese Option auf "true" ist, wird die Ausgabe zu 
// "Flurlicht Einschalten", also jeweils erster Buchstabe groß. 
// Falls nicht gewünscht, auf "false" setzen.
const CAPITALIZE_FIRSTS = true;

/*************************************************************************************************************************
 * Ab hier nichts mehr ändern / Stop editing here!
 *************************************************************************************************************************/

main();
function main() {
    // All instances, so alexa2.0.History.json, alexa2.1.History.json, alexa2.2.History.json, etc.
    on({id: /^alexa2\.\d\.History\.json$/, change:'any'}, function(obj) {

        // obj.state.val: JSON string of oject.
        // Like: {"name":"Alexa Flur","serialNumber":"xxxxxxxxxx","summary":"Wohnlicht an","creationTime":1582843794820, ... }
        let objHistory = JSON.parse(obj.state.val); 

        // ignore alexa keywords or empty value.
        if(! (['', 'alexa','echo','computer'].includes(objHistory['summary']) )) {
            // ignore "sprich mir nach"
            if (!(objHistory['summary'].includes('sprich mir nach '))) {
                log('[Alexa-Log-Script] ##{"msg":"' + formatAlexaSummary(objHistory['summary']) + '", "source":"' + objHistory['name'] + '"}##');
            }
        }
    });
}

/**
 * Formats the Alexa summary text accordingly.
 * @param {string} summaryText   The summary text
 * @return {string} the formatted summary
 */
function formatAlexaSummary(summaryText) {
    if (CAPITALIZE_FIRSTS) summaryText = summaryText.replace(/(^|\s)\S/g, l => l.toUpperCase()); // Capitalize if set. https://stackoverflow.com/questions/2332811/
    return summaryText;
}
