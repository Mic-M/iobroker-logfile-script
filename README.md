# iobroker.logfile-script
Parses log file, applies filters, and sets states for visualization

## Installation Instructions
1. Copy contents of „iobroker_logfile-script.js“ into the clipboard.
2. Open your ioBroker adminstration page, navigate to the "Scripts" section, add a new JavaScript and paste the contents.
3. Change the name of the script e.g. to "Logfile-Script" and save it. Make sure the script is **not** under the Global folder, that's simply not required and not a good idea at all.
4. Modify the settings in the script accordingly
5. Save and activate the script.

## Support
* ioBroker Forum: [Log-Datei aufbereiten für VIS - JavaScript](https://forum.iobroker.net/viewtopic.php?f=21&t=15514).

## Changelog

### 0.6 (29-Jul-2018)
* (Mic-M) + Put 0.5.1 BETA into stable
* (Mic-M) + New option L_APPLY_CSS. If true, it will add HTML "span class='log-info'" to each log string. 'log-info' for level info, 'log-error' for error, etc. This makes it easy to format a JSON table text with CSS per log level. In addition to that, new option L_APPLY_CSS_LIMITED_TO_LEVEL to just apply the CSS to the log level text (warn, error, info, etc.).

### 0.5.1 BETA (26-Jul-2018)
* (Mic-M) + New States "Clear JSON log ..." and "Clear JSON log - Date/Time ...". See change history in script for details

### 0.5 (24-Jul-2018)
* (Mic-M) + New parameter 'clean' to remove certain strings from the log line.
* (Mic-M) + New parameter 'columns' for JSON output to specify which columns to be shown, and in which order.
* (Mic-M) + New state "JSONcount" to have the number of log lines in state
* (Mic-M) - Fixed a few issues

### 0.4 (22-Jul-2018)
* (Mic-M) - Fix: improved validation of log line consistency


### 0.3 (22-Jul-2018)
* (Mic-M) + Added filtering, blacklist, and several fixes

### 0.2 (21-Jul-2018)
* (Mic-M) - Fix: corrected wrong function name

### 0.1 (20-Jul-2018)
* (Mic-M) Initial Release

## Licence

MIT License

Copyright (c) 2018 Mic-M

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
