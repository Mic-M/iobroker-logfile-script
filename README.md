# ioBroker-Log-Script

## Inhalt

- [1. Sinn und Zweck](#1-sinn-und-zweck)
- [2. Installation und Einrichtung](#2-installation-und-einrichtung)
  * [2.1 Wichtig](#21-wichtig)
  * [2.2 Script in ioBroker hinzufügen](#22-script-in-iobroker-hinzuf-gen)
  * [2.3 Script einstellen](#23-script-einstellen)
  * [2.4 Script aktivieren](#24-script-aktivieren)
- [3. Log-Ausgaben im VIS darstellen](#3-log-ausgaben-im-vis-darstellen)
- [4. Auf Log-Ereignisse reagieren](#4-auf-log-ereignisse-reagieren)
- [5. Weiteres](#5-weiteres)
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

### 2.1 Wichtig

1. In der Instanz des JavaScript-Adapters die Option `Erlaube das Kommando "setObject"` aktivieren. Dies ist notwendig, damit die Datenpunkte unterhalb von `0_userdata.0` angelegt werden mittels Script [github.com/Mic-M/iobroker.createUserStates](https://github.com/Mic-M/iobroker.createUserStates). Wer das nicht möchte: bitte Script-Version 3.1 verwenden.
2. Dieses Script setzt den [JavaScript-Adapter](https://github.com/iobroker/ioBroker.javascript/blob/master/README.md) in der Version 4.3.0 oder höher voraus. Wer eine ältere Version verwendet, muss das Script in der [Version 2.0.2](https://github.com/Mic-M/iobroker.logfile-script/tree/9b0981cd45dc54ebe79c9fefc7317f3e29b0bae9) verwenden.

### 2.2 Script in ioBroker hinzufügen

1. [Script-Code](https://raw.githubusercontent.com/Mic-M/iobroker.logfile-script/master/iobroker_logfile-script.js) öffnen.
2. Alles kopieren (Strg + a)
3. Zur ioBroker-Administration wechseln und dort im linken Menü "Skripte" auswählen.
4. Mit dem "+"-Menüpunkt ein neues Script hinzufügen, dann "Javascript" auswählen, und einen Namen vergeben (z.B. "Log-Script") und speichern.
5. Dieses neue Script öffnen (ist jetzt natürlich noch leer), den zuvor kopierten Code mit Strg+v einfügen und Speichern.

### 2.3 Script einstellen

Das neue Script nun öffnen und gemäß den Angaben im Script bei Bedarf entsprechend einrichten. Speichern nicht vergessen.
Es funktioniert auch so ohne Änderungen und es werden schon mal Datenpunkte angelegt.
Weiter einstellen kann man dann auch später.

### 2.4 Script aktivieren

Das Script nun aktivieren. Damit werden nach wenigen Sekunden alle Datenpunkte angelegt und das Script überwacht nun ab sofort das ioBroker-Log.

## 3. Log-Ausgaben im VIS darstellen

Anleitung folgt bald.

## 4. Auf Log-Ereignisse reagieren

Anleitung folgt bald.

## 5. Weiteres

### Support
Support erhaltet ihr hier im ioBroker Forum: [Log-Datei aufbereiten für VIS - JavaScript](https://forum.iobroker.net/topic/13971/vorlage-log-datei-aufbereiten-f%C3%BCr-vis-javascript).


### Changelog

Siehe im Script.

### Lizenz

MIT License

Copyright (c) 2018-2019 Mic-M

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
