const bcrypt = require('bcrypt');

const COST_FACTOR = 10;
const hash = (value) => bcrypt.hash(value, COST_FACTOR);
const compare = (value, digest) => bcrypt.compare(value, digest);

module.exports = { COST_FACTOR, hash, compare };
