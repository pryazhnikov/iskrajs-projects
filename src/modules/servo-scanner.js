"use strict";

function ServoScanner(
  $servo,
  initialAngle,
  minAngle,
  maxAngle,
  angleDelta
) {
  this.$servo = $servo;
  this._minAngle = minAngle;
  this._maxAngle = maxAngle;
  this._angleDelta = angleDelta;
  this.moveTo(initialAngle);
}

ServoScanner.prototype.getAngle = function () {
  return this._angle;
};

ServoScanner.prototype.getAngleDelta = function () {
  return this._angleDelta;
};

ServoScanner.prototype.moveTo = function (newAngle) {
  if ((newAngle < this._minAngle) || (this._maxAngle < newAngle)) {
    return false;
  }

  this._angle = newAngle;
  return this.$servo.write(this._angle);
};

ServoScanner.prototype.moveToNext = function () {
  let newAngle = this._angle + this._angleDelta;
  if (newAngle > this._maxAngle) {
    // Новый угол выходит за границы диапазона
    this._angleDelta = -1 * Math.abs(this._angleDelta);
    newAngle = this._angle + this._angleDelta;
  } else if (newAngle < this._minAngle) {
    this._angleDelta = Math.abs(this._angleDelta);
    newAngle = this._angle + this._angleDelta;
  }

  return this.moveTo(newAngle);
};

exports.connect = function (
  Servo,
  initialAngle,
  minAngle,
  maxAngle,
  angleDelta
) {
  return new ServoScanner(
    Servo,
    initialAngle,
    minAngle,
    maxAngle,
    angleDelta
  );
}
