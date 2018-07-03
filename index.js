#!/usr/bin/env node
'use strict';

var program = require('commander');
var version = require('./package.json').version;

var uploadCommand = require('./cmd/upload');
var downloadCommand = require('./cmd/download');

program.version(version);

uploadCommand(program);

downloadCommand(program);

program.parse(process.argv);