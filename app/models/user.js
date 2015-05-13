'use strict'

var mongoose = require('mongoose');
var schema = require('./schema/user')

var User = mongoose.model('User', schema);

module.exports = User;
