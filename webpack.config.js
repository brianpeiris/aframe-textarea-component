const path = require('path');

module.exports = [
  {
    name: 'development',
    mode: 'development',
    entry: './index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'aframe-textarea-component.js'
    }
  },
  {
    name: 'production',
    mode: 'production',
    entry: './index.js',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'aframe-textarea-component.min.js'
    }
  }
];
