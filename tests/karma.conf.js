// Karma configuration.
module.exports = function (config) {
  config.set({
    basePath: '../',
    browserify: {
      debug: true,
      paths: ['./'],
      ignoreMissing: true
    },
    browsers: ['FirefoxSnap', 'Chrome'],
    customLaunchers: {
      FirefoxSnap: {
        base: 'Firefox',
        profile: require('path').join(__dirname, 'tmp')
      }
    },
    client: {
      captureConsole: true,
      mocha: { ui: 'tdd' }
    },
    envPreprocessor: ['TEST_ENV'],
    files: [
      // Define test files.
      { pattern: 'tests/**/*.test.js' }
    ],
    frameworks: ['mocha', 'sinon-chai', 'chai-shallow-deep-equal', 'browserify'],
    preprocessors: { 'tests/**/*.js': ['browserify', 'env'] },
    reporters: ['mocha']
  });
};
