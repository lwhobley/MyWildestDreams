// metro.config.js — clean config, no broken src/ aliases needed
const { getDefaultConfig } = require('expo/metro-config');
module.exports = getDefaultConfig(__dirname);
