#!/usr/bin/env -S node --unhandled-rejections=strict --enable-source-maps

const { run } = require('../dist/index.js');

run({
  argv: process.argv,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
