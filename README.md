# iobroker.logfile-script
Parses log file, applies filters, and sets states for visualization

## Installation Instructions
1. Download file „iobroker_logfile-script.js“ to your local computer, open the file and copy its contents into the clipboard.
2. Open your ioBroker adminstration page, navigate to the "Scripts" section, add a new JavaScript and paste the contents.
3. Change the name of the script e.g. to "Logfile-Script" and save it. Make sure the script is **not** under the Global folder, that's simply not required and not a good idea at all.
4. Modify the settings in the script accordingly
5. Save and activate the script.

## Support
* ioBroker Forum: [Log-Datei aufbereiten für VIS - JavaScript](https://forum.iobroker.net/viewtopic.php?f=21&t=15514).

## Changelog

### 0.3 (22-Jul-2018)
* (Mic-M) Added filtering, blacklist, and several fixes

### 0.2 (21-Jul-2018)
* (Mic-M) Bug fix: corrected wrong function name

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
