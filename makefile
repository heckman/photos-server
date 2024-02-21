OSAC	:= osacompile -l JavaScript

SOURCES := $(wildcard src/*)
COMPILED := $(patsubst src/%,dist/%.scpt,${SOURCES})

all: ${COMPILED}

dist/%.scpt: src/%
	$(OSAC) -o $@ $<
