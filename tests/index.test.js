/* global assert, setup, suite, test */
require('aframe');
require('../index.js');
const entityFactory = require('./helpers').entityFactory;

suite('textarea component', function () {
  let component;
  let el;

  setup(function (done) {
    el = entityFactory();
    el.addEventListener('componentinitialized', function (evt) {
      if (evt.detail.name !== 'textarea') { return; }
      component = el.components.textarea;
      done();
    });
    el.setAttribute('textarea', { text: 'hello world' });
  });

  suite('text', function () {
    test('is set correctly', function () {
      assert.equal(component.textarea.value, 'hello world');
      assert.equal(component.textarea.selectionStart, 0);
      assert.equal(component.textarea.selectionEnd, 0);
    });

    test('can be accessed', function () {
      assert.equal(component.getText(), 'hello world');
    });
  });
});
