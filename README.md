# ioBroker-Log-Script

## Inhalt

- [1. Sinn und Zweck](#1-sinn-und-zweck)
- [2. Installation und Einrichtung](#2-installation-und-einrichtung)
  * [2.1 Wichtig - Voraussetzungen](#21-wichtig---voraussetzungen)
  * [2.2 Script in ioBroker hinzufügen](#22-script-in-iobroker-hinzuf-gen)
  * [2.3 Optionen im Script anpassen](#23-optionen-im-script-anpassen)
  * [2.4 Script aktivieren](#24-script-aktivieren)
- [3. Log-Ausgaben im VIS darstellen](#3-log-ausgaben-im-vis-darstellen)
- [4. Auf Log-Ereignisse reagieren](#4-auf-log-ereignisse-reagieren)
- [5. Neues Feature ab 4.10: Per Log JSON-Spalteninhalte ändern](#5-neues-feature-ab-410-per-log-json-spalteninhalte-%C3%A4ndern)
- [6. Weiteres](#6-weiteres)
  * [Support](#support)
  * [Changelog](#changelog)
  * [Lizenz](#lizenz)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>


## 1. Sinn und Zweck

Der ioBroker loggt alle Aktionen der Adapter und Scripte entsprechend mit, einzusehen in der ioBroker-Administration, linke Seite Menüpunkt "Log".
Dieses Script bietet nun folgendes:
 * Log im VIS darstellen: Entsprechend gefiltert, also etwa nur Warnungen und Fehler, nur Ausgaben eines bestimmten Adapters, usw.
 * Auf Log-Ereignisse agieren
 
Dabei nimmt das Script jeden neuen Logeintrag des ioBrokers und wendet entsprechend gesetzte Filter an, 
um den Eintrag dann in den entsprechenden Datenpunkten dieses Scripts abzulegen.
Es stehen auch JSON-Datenpunkte zur Verfügung, mit diesen kann im vis eine Tabelle ausgegeben werden (z.B. über das Widget 'basic - Table').


## 2. Installation und Einrichtung

### 2.1 Wichtig - Voraussetzungen

1. In der Instanz des JavaScript-Adapters die Option `Erlaube das Kommando "setObject"` aktivieren. Dies ist notwendig, damit die Datenpunkte unterhalb von `0_userdata.0` angelegt werden mittels Script [github.com/Mic-M/iobroker.createUserStates](https://github.com/Mic-M/iobroker.createUserStates). Wer das nicht möchte: 

2. Falls Datenpunkte unterhalb `0_userdata.0` (und nicht unterhalb von `javascript.0`) angelegt werden sollen: In der Instanz des JavaScript-Adapters die Option `Erlaube das Kommando "setObject"` aktivieren. Siehe auch: https://github.com/Mic-M/iobroker.createUserStates


### 2.2 Script in ioBroker hinzufügen

1. [Script-Code](https://raw.githubusercontent.com/Mic-M/iobroker.logfile-script/master/iobroker_logfile-script.js) öffnen.
2. Alles kopieren (Strg + a)
3. Zur ioBroker-Administration wechseln und dort im linken Menü "Skripte" auswählen.
4. Mit dem "+"-Menüpunkt ein neues Script hinzufügen, dann "Javascript" auswählen, und einen Namen vergeben (z.B. "Log-Script") und speichern.
5. Dieses neue Script öffnen (ist jetzt natürlich noch leer), den zuvor kopierten Code mit Strg+v einfügen und Speichern.

**Wichtig:** Das Script nicht unterhalb des Ordners "Global" erstellen. Das ist unnötig und kostet Performance. Siehe auch: [global-functions](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#)

### 2.3 Optionen im Script anpassen

Das neue Script nun öffnen und gemäß den Angaben im Script bei Bedarf entsprechend einrichten. Speichern nicht vergessen.
Es funktioniert auch so ohne Änderungen und es werden schon mal Datenpunkte angelegt.
Weiter einstellen kann man dann auch später.

### 2.4 Script aktivieren

Das Script nun aktivieren. Damit werden nach wenigen Sekunden alle Datenpunkte angelegt und das Script überwacht nun ab sofort das ioBroker-Log.

## 3. Log-Ausgaben im VIS darstellen

Hierzu habe ich ein Beispiel-Projekt erstellt: **[VIS-Project-Log-Script.zip](https://github.com/Mic-M/iobroker.logfile-script/blob/master/VIS-Project-Log-Script.zip)**
Diese zip-Datei herunterladen, und in VIS im Menü `Setup > Projekt-Export/Import > Import` aufrufen, um dort das Projekt zu importieren.
Siehe auch [im ioBroker-Forum](https://forum.iobroker.net/post/384730).

**Voraussetzungen**
1. Die Widgets [ioBroker Material Design Widgets](https://github.com/Scrounger/ioBroker.vis-materialdesign) werden benötigt
2. Falls im Script in den Optionen unter `LOG_STATE_PATH = '0_userdata.0.Log-Script'` ein anderer Pfad eingestellt wurde, dann am besten in der zip die Datei `vis-views.json` in einem Editor öffnen und über Suchen/Ersetzen euren Pfad entsprechend setzen. Danach speichern und sicherstellen, dass die zip-Datei aktualisiert wurde.


## 4. Auf Log-Ereignisse reagieren

Um sich etwa bei einer bestimmten Log-Meldung eine Telegram-Nachricht zu senden, gibt es die [ioBroker-Funktion onLog()](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#onlog).
Alternativ kann man per JavaScript oder Blockly die entsprechenden Filter-Datenpunkte des Scripts (z.B. `0_userdata.0.Log-Script.logError.log` überwachen und dann bei einer entsprechenden Log-Meldung über dieses erzeugte JavaScript / Blockly agieren.

## 5. Neues Feature ab 4.10: Per Log JSON-Spalteninhalte ändern
Ab Script-Version 4.10 gibt es die Möglichkeit, über JavaScript, Blockly, etc. Logs abzusetzen und dabei zu beeinflussen, welcher Inhalt in die Spalten 'date','level','source','msg' gesetzt wird.

**Beispiel:**
Folgender Befehl wird in einem JavaScript ausgeführt:

`log('[Alexa-Log-Script] ##{"msg":"' + 'Befehl [Musik an].' + '", "source":"' + 'Alexa Flur' + '"}##');`

Damit wird nun der Teil `##{"msg":"' + 'Befehl [Musik an].' + '", "source":"' + 'Alexa Flur' + '"}##` genommen, als Log-Text 'Befehl [Musik an].' (anstatt der Logzeile) angezeigt, und als Quelle wird 'Alexa Flur' (anstatt javascript.0) angezeigt.

**Syntax:**
In die Logzeile folgendes aufnehmen: `##{"date":"", "level":"", "source":"", "msg":""}##`
Dabei können einzelne Werte entfernt werden, also z.B. nur um den Logtext (msg) zu ändern, nimmt man `##{"msg":"hier der Text."}##`

**Use Cases**
Da das Log-Script umfangreiche Filter bietet, von denen beliebig viele angelegt werden können und dann in Datenpunkten verfügbar sind, können mit dieser Funktion einfach per [log()](https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#log---gives-out-the-message-into-log) entsprechend Tabellen gefüllt werden.

Beispiele:
Siehe [hier im Forum](https://forum.iobroker.net/post/386960).


## 6. Weiteres

### Support
Support erhaltet ihr hier im ioBroker Forum: [Log-Datei aufbereiten für VIS - JavaScript](https://forum.iobroker.net/topic/13971/vorlage-log-datei-aufbereiten-f%C3%BCr-vis-javascript).


### Changelog

Siehe im Script.

### Lizenz

MIT License

Copyright (c) 2018-2020 Mic-M

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
