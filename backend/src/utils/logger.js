function info(message, ...args) {
  console.log(`ℹ️  [INFO] ${message}`, ...args);
}

function warn(message, ...args) {
  console.warn(`⚠️  [WARN] ${message}`, ...args);
}

function err(message, ...args) {
  console.error(`❌ [ERROR] ${message}`, ...args);
}

function debug(message, ...args) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`🐛 [DEBUG] ${message}`, ...args);
  }
}

module.exports = { info, warn, err, debug };
