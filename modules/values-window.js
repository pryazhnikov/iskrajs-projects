function IntValuesWindow(windowSize) {
  this._valuesCount = 0;
  this._bufferSize = windowSize;
  this._values = new Uint32Array(this._bufferSize);
}

IntValuesWindow.prototype.addValue = function (value) {
  if (this._valuesCount < this._bufferSize) {
    // Окно еще не заполнено, просто добавляем новое значение
    this._values[this._valuesCount] = value;
  } else {
    // Окно уже полностью заполнено, чтобы добавить новое значение мы должны  убрать самое старое
    for (let i = 1; i < this._bufferSize; i++) {
      this._values[i - 1] = this._values[i];
    }

    this._values[this._bufferSize - 1] = value;
  }

  this._valuesCount++;
  return true;
};

IntValuesWindow.prototype.reset = function () {
  for (let i = 0; i < this._bufferSize; i++) {
    this._values[i] = 0;
  }

  this._valuesCount = 0;
};

IntValuesWindow.prototype.isFull = function () {
  return (this._valuesCount >= this._bufferSize);
};

IntValuesWindow.prototype.getValuesCount = function () {
  return this._valuesCount;
};

IntValuesWindow.prototype.getLastValues = function () {
  return this._values;
};

IntValuesWindow.prototype.toString = function () {
  let stopIndex = Math.min(this._valuesCount, this._bufferSize);
  let digestValues = this._values.slice(0, stopIndex);
  return digestValues.join(', ');
};

// Module export
exports.createIntValuesWindow = function (size) {
  return new IntValuesWindow(size);
};
