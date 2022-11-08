/* global AFRAME */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

/**
 * Textarea component for A-Frame.
 */
AFRAME.registerComponent('textarea', {
  schema: {
    cols: {type: 'int', default: 40},
    rows: {type: 'int', default: 20},
    color: {type: 'color', default: 'black'},
    backgroundColor: {type: 'color', default: 'white'},
    selectionColor: {type: 'color', default: 'grey'},
    disabledBackgroundColor: {type: 'color', default: 'lightgrey'},
    disabled: {type: 'boolean', default: false},
    text: {type: 'string', default: ''}
  },
  init: function () {
    this.text = null;
    this.lines = [];
    this.lastBlink = 0;
    this.showCursorTimeout = 0;
    this.blinkEnabled = !this.data.disabled;
    this.charWidth = this.charHeight = null;
    this.selectionStart = this.selectionEnd = 0;
    this.endIndexInfo = this.startIndexInfo = null;
    this.origin = {x: 0, y: 0};
    this.textarea = null;

    this.background = document.createElement('a-plane');
    this.background.setAttribute('color', this.data.disabled ? this.data.disabledBackgroundColor : this.data.backgroundColor);
    this.el.appendChild(this.background);
    this.el.setObject3D('background', this.background.object3D);

    this.textAnchor = document.createElement('a-entity');
    this.el.appendChild(this.textAnchor);
    this.textAnchor.setAttribute('text', {
      mode: 'pre',
      baseline: 'top',
      anchor: 'center',
      font: 'dejavu',
      wrapCount: this.data.cols,
      height: this.data.rows,
      color: this.data.color
    });

    this._initTextarea();

    this._initCursor();

    this.el.addEventListener('textfontset', this._updateCharMetrics.bind(this));
    this.el.addEventListener('char-metrics-changed', this._updateIndexInfo.bind(this));
    this.el.addEventListener('char-metrics-changed', this._updateCursorGeometry.bind(this));
    this.el.addEventListener('text-changed', this._updateLines.bind(this));
    this.el.addEventListener('text-changed', this._updateDisplayText.bind(this));
    this.el.addEventListener('text-changed', this._setShowCursorTimeout.bind(this));
    this.el.addEventListener('selection-changed', this._updateIndexInfo.bind(this));
    this.el.addEventListener('selection-changed', this._updateCursorStyle.bind(this));
    this.el.addEventListener('selection-changed', this._updateCursorGeometry.bind(this));
    this.el.addEventListener('selection-changed', this._updateHorizontalOrigin.bind(this));
    this.el.addEventListener('selection-changed', this._setShowCursorTimeout.bind(this));
    this.el.addEventListener('lines-changed', this._updateIndexInfo.bind(this));
    this.el.addEventListener('index-info-changed', this._updateOrigin.bind(this));
    this.el.addEventListener('index-info-changed', this._updateCursorGeometry.bind(this));
    this.el.addEventListener('index-info-changed', this._updateHorizontalOrigin.bind(this));
    this.el.addEventListener('origin-changed', this._updateCursorGeometry.bind(this));
    this.el.addEventListener('origin-changed', this._updateDisplayText.bind(this));
    this.el.addEventListener('click', this.focus.bind(this));
  },
  update: function (oldData) {
    if (this.data.text !== oldData.text) {
      this._updateTextarea();
    }

    if (this.data.backgroundColor !== oldData.backgroundColor || this.data.disabledBackgroundColor !== oldData.disabledBackgroundColor) {
      this.background.setAttribute('color', this.data.disabled ? this.data.disabledBackgroundColor : this.data.backgroundColor);
    }

    if (this.data.disabled !== oldData.disabled) {
      this.blinkEnabled = !this.data.disabled;
      this.textarea.disabled = this.data.disabled;
      this.cursorMesh.visible = !this.data.disabled;
      this.background.setAttribute('color', this.data.disabled ? this.data.disabledBackgroundColor : this.data.backgroundColor);
    }
  },
  focus: function () {
    this.textarea.focus();
  },
  blur: function () {
    this.textarea.blur();
  },
  getText: function () {
    return this.textarea.value;
  },
  _initTextarea: function () {
    this.textarea = document.createElement('textarea');
    document.body.appendChild(this.textarea);
    this._updateTextarea();
  },
  _updateTextarea: function () {
    this.textarea.style.whiteSpace = 'pre';
    this.textarea.style.overflow = 'hidden';
    this.textarea.style.opacity = '0';

    this.textarea.cols = this.data.cols;
    this.textarea.rows = this.data.rows;
    this.textarea.value = this.data.text;
    this.textarea.selectionStart = 0;
    this.textarea.selectionEnd = 0;

    this._updateIndexInfo();
  },
  _initCursor: function () {
    this.cursor = document.createElement('a-entity');
    this.cursorGeo = new THREE.PlaneGeometry(1, 1);
    this.cursorMat = new THREE.MeshBasicMaterial({
      color: 'black',
      transparent: true,
      opacity: 0.5
    });
    this.cursorMesh = new THREE.Mesh(this.cursorGeo, this.cursorMat);
    this.cursor.setObject3D('mesh', this.cursorMesh);
    this.el.appendChild(this.cursor);
  },
  _emit: function (eventName, detail) {
    this.el.emit(eventName, detail);
  },
  _updateCharMetrics: function (event) {
    const layout = this.textAnchor.components.text.geometry.layout;
    const fontWidthFactor = event.detail.fontObj.widthFactor;
    this.charWidth = fontWidthFactor * this.textAnchor.object3DMap.text.scale.x;
    this.charHeight = this.charWidth * layout.lineHeight / fontWidthFactor;
    this.textAnchor.setAttribute('position', {x: 0, y: this.charHeight * this.data.rows / 2, z: 0});
    this.background.setAttribute('scale', {x: 1.05, y: this.charHeight * this.data.rows * 1.05, z: 1});
    this.background.setAttribute('position', {x: 0, y: 0, z: 0});
    this._emit('char-metrics-changed');
  },
  _checkAndUpdateSelection: function () {
    if (
      this.selectionStart === this.textarea.selectionStart &&
      this.selectionEnd === this.textarea.selectionEnd
    ) {
      return;
    }

    const lastStart = this.selectionStart;
    const lastEnd = this.selectionEnd;

    this.selectionStart = this.textarea.selectionStart;
    this.selectionEnd = this.textarea.selectionEnd;

    this._emit('selection-changed', {
      start: {old: lastStart, new: this.selectionStart, changed: this.selectionStart !== lastStart},
      end: {old: lastEnd, new: this.selectionEnd, changed: this.selectionEnd !== lastEnd}
    });
  },
  _setShowCursorTimeout: function () {
    this.showCursorTimeout = 500;
  },
  tick: function (time, delta) {
    this._updateCursorVisibility(delta);
    this._checkAndUpdateSelection();
    this._checkAndUpdateText();
  },
  _updateCursorVisibility: function (delta) {
    if (document.activeElement === this.textarea) {
      if (this.showCursorTimeout > 0) {
        this.showCursorTimeout -= delta;
        this.cursorMesh.visible = true;
      } else {
        if (this.blinkEnabled) {
          if (Date.now() - this.lastBlink > 500) {
            this.cursorMesh.visible = !this.cursorMesh.visible;
            this.lastBlink = Date.now();
          }
        } else if (this.selectionStart !== this.selectionEnd) {
          this.cursorMesh.visible = true;
        }
      }
    } else {
      this.cursorMesh.visible = false;
    }
  },
  _getIndexInfo: function (lineIndex, textIndex) {
    const y = Math.max(0, lineIndex);
    const line = this.lines[y];
    const x = textIndex - line.start;
    return {
      line: line,
      x: x * this.charWidth,
      y: -this.charHeight * y + -this.charHeight / 2
    };
  },
  _updateIndexInfo: function () {
    if (!this.lines.length) {
      return;
    }
    const lastStart = this.startIndexInfo && this.startIndexInfo.line.index;
    const lastEnd = this.endIndexInfo && this.endIndexInfo.line.index;
    this.startIndexInfo = null;
    this.endIndexInfo = null;
    var i;
    var startChanged = false;
    var endChanged = false;
    for (i = 0; i <= this.lines.length; i++) {
      const prevLine = this.lines[i - 1];
      const lineStart = i === this.lines.length ? (prevLine.start + prevLine.length + 1) : this.lines[i].start;
      if (lineStart > this.selectionStart && !this.startIndexInfo) {
        this.startIndexInfo = this._getIndexInfo(i - 1, this.selectionStart);
        if (this.startIndexInfo.line.index !== lastStart) {
          startChanged = true;
        }
      }
      if (lineStart > this.selectionEnd) {
        this.endIndexInfo = this._getIndexInfo(i - 1, this.selectionEnd);
        if (this.endIndexInfo.line.index !== lastEnd) {
          endChanged = true;
        }
        break;
      }
    }
    if (startChanged || endChanged) {
      this._emit('index-info-changed', {
        start: {changed: startChanged},
        end: {changed: endChanged}
      });
    }
  },
  _updateOrigin: function (event) {
    var changed = false;
    if (event.detail.end.changed) {
      const end = this.origin.y + this.data.rows - 1;
      if (this.endIndexInfo.line.index > end) {
        this.origin.y = this.endIndexInfo.line.index + 1 - this.data.rows;
        changed = true;
      } else if (this.endIndexInfo.line.index < this.origin.y) {
        this.origin.y = this.endIndexInfo.line.index;
        changed = true;
      }
    }
    if (event.detail.start.changed) {
      if (this.startIndexInfo.line.index < this.origin.y) {
        this.origin.y = this.startIndexInfo.line.index;
        changed = true;
      }
    }
    if (changed) {
      this._emit('origin-changed');
    }
  },
  _updateHorizontalOrigin: function (event) {
    if (!this.endIndexInfo) {
      return;
    }
    var changed = true;
    if (event.detail.end.changed) {
      const endIndex = this.selectionEnd - this.endIndexInfo.line.start;
      if (endIndex > this.origin.x + this.data.cols) {
        this.origin.x = endIndex - this.data.cols;
        changed = true;
      } else if (endIndex < this.origin.x) {
        this.origin.x = endIndex;
        changed = true;
      }
    }
    const startIndex = this.selectionStart - this.startIndexInfo.line.start;
    if (event.detail.start.changed) {
      if (startIndex > this.origin.x + this.data.cols) {
        this.origin.x = startIndex - this.data.cols;
        changed = true;
      } else if (startIndex < this.origin.x) {
        this.origin.x = startIndex;
        changed = true;
      }
    }
    if (changed) {
      this._emit('origin-changed');
    }
  },
  _updateCursorStyle: function () {
    if (this.selectionStart === this.selectionEnd) {
      this.blinkEnabled = true;
      this.cursorMat.color.setStyle('black');
      this.cursorMat.transparent = false;
    } else {
      this.blinkEnabled = false;
      this.cursorMat.color.setStyle(this.data.selectionColor);
      this.cursorMesh.visible = true;
      this.cursorMat.transparent = true;
    }
  },
  _updateCursorGeometry: function () {
    if (!this.startIndexInfo) {
      return;
    }
    const startLine = Math.max(this.origin.y, this.startIndexInfo.line.index);
    const endLine = Math.min(this.origin.y + this.data.rows - 1, this.endIndexInfo.line.index);
    const maxIndex = this.origin.x + this.data.cols;
    const geos = [];
    const mesh = new THREE.Object3D();
    for (var i = startLine; i <= endLine; i++) {
      var size;
      var offset = 0;
      if (endLine === startLine) {
        offset = Math.max(this.origin.x, this.selectionStart - this.startIndexInfo.line.start);
        const end = Math.min(maxIndex, this.selectionEnd - this.startIndexInfo.line.start);
        size = Math.max(0.2, end - offset);
      } else {
        var end;
        if (i === this.startIndexInfo.line.index) {
          offset = Math.max(this.origin.x, this.selectionStart - this.startIndexInfo.line.start);
          end = Math.min(maxIndex, this.startIndexInfo.line.length);
        } else if (i === this.endIndexInfo.line.index) {
          offset = this.origin.x;
          end = Math.min(maxIndex, this.selectionEnd - this.endIndexInfo.line.start);
        } else {
          offset = this.origin.x;
          end = Math.min(maxIndex, this.lines[i].length);
        }
        size = end - offset;
      }
      mesh.scale.set(
        this.charWidth * size,
        this.charHeight,
        1
      );
      mesh.position.set(
        offset * this.charWidth + this.charWidth * size / 2 - 0.5 - this.origin.x * this.charWidth,
        -i * this.charHeight + (this.charHeight * this.data.rows) / 2 - this.charHeight / 2 + this.origin.y * this.charHeight,
        0.002
      );
      mesh.updateMatrix();
      const geo = new THREE.PlaneGeometry(1, 1);
      geo.applyMatrix4(mesh.matrix);
      geos.push(geo);
    }
    this.cursorMesh.geometry = THREE.BufferGeometryUtils.mergeBufferGeometries(geos);
    this.cursorMesh.geometry.verticesNeedUpdate = true;
    this.cursorMesh.geometry.needsUpdate = true;
  },
  _updateLines: function () {
    this.lines = [];
    const lines = this.text.split('\n');
    var counter = 0;
    for (var i = 0; i < lines.length; i++) {
      this.lines[i] = {
        index: i,
        length: lines[i].length,
        start: counter
      };
      counter += lines[i].length + 1;
    }
    this._emit('lines-changed');
  },
  _getViewportText: function () {
    return this.text.split('\n').slice(this.origin.y, this.origin.y + this.data.rows)
      .map(function (line) {
        return line.substr(this.origin.x, this.data.cols) || ' ';
      }.bind(this)).join('\n');
  },
  _updateDisplayText: function () {
    this.textAnchor.setAttribute('text', {
      value: this._getViewportText()
    });
  },
  _checkAndUpdateText: function () {
    const text = this.textarea.value;
    if (text === this.text) {
      return;
    }
    this.text = text;
    this._emit('text-changed');
  }
});
