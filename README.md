# iobroker.logfile-script
Parses log file, applies filters, and sets states for visualization

## Installation Instructions

#### 1. Activate node-tail
This script requires [node-tail](https://github.com/lucagrulla/node-tail). This is how you activate/install it:
1. Within ioBroker, left menu: select "Instances".
2. Open your JavaScript-Adapter options, by clicking on "javascript.0" (Script Engine) or similar.
3. In the field "Additional npm modules", add "tail" (without the quotation marks).
4. Save.

#### 2. Get the script into your ioBroker
1. Copy contents of „iobroker_logfile-script.js“ into the clipboard.
2. Open your ioBroker adminstration page, navigate to the "Scripts" section, add a new JavaScript and paste the contents.
3. Change the name of the script e.g. to "Logfile-Script" and save it. Make sure the script is **not** under the Global folder, that's simply not required and not a good idea at all.
4. Modify the settings in the script accordingly.
5. Save and activate the script.



## Support
* ioBroker Forum: [Log-Datei aufbereiten für VIS - JavaScript](https://forum.iobroker.net/topic/13971/vorlage-log-datei-aufbereiten-f%C3%BCr-vis-javascript).

## Changelog

* see within the script.

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
