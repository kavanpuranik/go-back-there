# Common chrome extension tasks.

ECHO=@echo
JSONLINT=@jsonlint
MKDIR=@mkdir
NPM=npm
VERSION=0.0.2
ZIP=zip

help:
        $(ECHO) 'Build chrome extension.'
        $(ECHO) ''
        $(ECHO) '  check    validate manifest.json'
        $(ECHO) '  package  create zip file for submission'
        $(ECHO) '  help     display this help page'

ensure-npm:
        @$(NPM) --version > /dev/null

ensure-jsonlint: ensure-npm
        $(JSONLINT) --help > /dev/null || $(NPM) install jsonlint --global

check: ensure-jsonlint
        $(JSONLINT) --quiet manifest.json && echo 'Valide JSON!'

package:
        $(MKDIR) -pv pkg
        $(ZIP) pkg/go-back-there-chrome-extension-$(VERSION).zip manifest.json icon*.png	
